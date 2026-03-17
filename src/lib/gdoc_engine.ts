import { google } from 'googleapis';
import path from 'path';
import fs from 'fs/promises';

/**
 * 구글 독스 기반 문서 엔진
 * - 클라우드 API를 사용하여 템플릿 복제 및 데이터 치환 수행
 */
export class GDocEngine {
  private docs = google.docs('v1');
  private drive = google.drive('v3');

  /**
   * 로컬 인증 파일(credentials.json, token.json)을 사용하여 OAuth2 클라이언트 생성
   */
  private async getAuth() {
    const keyPath = path.join(process.cwd(), 'credentials.json');
    const tokenPath = path.join(process.cwd(), 'token.json');

    try {
      console.log('🔍 [GDocEngine] 구글 인증 시도 중... 경로:', { keyPath, tokenPath });
      const keyContent = await fs.readFile(keyPath, 'utf8');
      const keys = JSON.parse(keyContent);
      const key = keys.installed || keys.web;

      if (!key) throw new Error('credentials.json 형식이 올바르지 않습니다.');

      const auth = new google.auth.OAuth2(
        key.client_id,
        key.client_secret,
        key.redirect_uris ? key.redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
      );

      const tokenContent = await fs.readFile(tokenPath, 'utf8');
      console.log('✅ [GDocEngine] 토큰 파일 로드 완료');
      auth.setCredentials(JSON.parse(tokenContent));

      return auth;
    } catch (error: any) {
      console.error('❌ [GDocEngine] 인증 파일 로드 중 오류 발생:', error);
      throw new Error(`구글 인증 정보를 불러올 수 없습니다: ${error.message}`);
    }
  }

  /**
   * 구글 독스 본문(Body)에서 모든 순수 텍스트를 추출 (재귀적)
   */
  private getBodyText(element: any): string {
    let text = '';
    if (!element) return text;

    // 1. 단일 텍스트 요소 처리
    if (element.textRun) {
      text += element.textRun.content || '';
    }
    // 2. 단락(Paragraph) 처리
    else if (element.elements) {
      element.elements.forEach((el: any) => {
        text += this.getBodyText(el);
      });
    }
    // 3. 테이블(Table) 처리
    else if (element.table) {
      element.table.tableRows.forEach((row: any) => {
        row.tableCells.forEach((cell: any) => {
          text += this.getBodyText(cell);
        });
      });
    }
    // 4. 리스트 또는 전체 본문 컨텐츠 처리 (body.content 등)
    else if (element.content) {
      element.content.forEach((el: any) => {
        if (el.paragraph) text += this.getBodyText(el.paragraph);
        else if (el.table) text += this.getBodyText(el);
      });
    }

    return text;
  }

  /**
   * 구글 드라이브 내 폴더 찾기 또는 생성
   * @param folderName 대상 폴더명
   * @param parentId 부모 폴더 ID (선택사항)
   */
  async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    try {
      const auth = await this.getAuth();
      const drive = google.drive({ version: 'v3', auth: auth as any });

      // 1. 기존 폴더 검색
      let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const listRes = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (listRes.data.files && listRes.data.files.length > 0) {
        console.log(`✅ [GDocEngine] 기존 폴더 발견: ${folderName} (${listRes.data.files[0].id})`);
        return listRes.data.files[0].id!;
      }

      // 2. 폴더가 없는 경우 신규 생성
      console.log(`🚀 [GDocEngine] 새 폴더 생성 중: ${folderName}`);
      const createRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined,
        },
        fields: 'id',
      });

      if (!createRes.data.id) throw new Error("폴더 생성에 실패했습니다.");
      return createRes.data.id;
    } catch (error: any) {
      console.error('❌ [GDocEngine] 폴더 관리 에러:', error);
      throw error;
    }
  }

  /**
   * 구글 독스 템플릿 분석
   * - 문서 내의 {{태그}} 패턴을 모두 추출하여 반환
   */
  async analyzeTemplate(documentId: string) {
    try {
      console.log(`🚀 [GDocEngine] 템플릿 분석 시작: ${documentId}`);
      const auth = await this.getAuth();
      const res = await this.docs.documents.get({
        auth: auth as any,
        documentId,
      });
      console.log('✅ [GDocEngine] 템플릿 데이터 수신 완료');

      const fullText = this.getBodyText(res.data.body);
      const tagPattern = /\{\{([^\{\}]+)\}\}/g;
      const foundTags = new Set<string>();
      let match;

      while ((match = tagPattern.exec(fullText)) !== null) {
        foundTags.add(match[1].trim());
      }

      return {
        documentId,
        title: res.data.title,
        placeholders: Array.from(foundTags).map(tag => ({
          name: tag,
          pattern: `{{${tag}}}`
        }))
      };
    } catch (error: any) {
      console.error('❌ [GDocEngine] 템플릿 분석 에러 상세:', error);
      throw error;
    }
  }

  /**
   * 구글 독스 문서 생성
   * 1. 템플릿 문서 복사
   * 2. 복사된 문서 내의 {{태그}}를 실제 데이터로 치환
   * 3. 생성된 문서 정보 반환
   */
  async generateDocument(templateId: string, textData: Record<string, string>, title: string, folderId?: string) {
    try {
      const auth = await this.getAuth();

      // 1. 템플릿 파일 복사
      const copyRes = await this.drive.files.copy({
        auth: auth as any,
        fileId: templateId,
        requestBody: {
          name: title,
          parents: folderId ? [folderId] : undefined,
        },
      });

      const newDocId = copyRes.data.id;
      if (!newDocId) throw new Error("문서 복사에 실패했습니다.");

      // 2. 문서 컨텐츠 분석하여 태그 위치 파악
      const docRes = await this.docs.documents.get({ auth: auth as any, documentId: newDocId });
      const syncTags = ['진도율', '상태', '특이사항', '비고', '오늘진도', '누계진도'];
      
      const allElements: any[] = [];
      const collectElements = (content: any[]) => {
        content.forEach(element => {
          if (element.paragraph) {
            element.paragraph.elements.forEach((el: any) => allElements.push(el));
          } else if (element.table) {
            element.table.tableRows.forEach((row: any) => {
              row.tableCells.forEach((cell: any) => collectElements(cell.content));
            });
          }
        });
      };
      if (docRes.data.body?.content) collectElements(docRes.data.body.content);

      // 태그 위치 찾기
      const tagPattern = /\{\{([^\{\}]+)\}\}/g;
      const replacements: { startIndex: number, endIndex: number, key: string, value: string, isSync: boolean }[] = [];

      allElements.forEach(el => {
        if (el.textRun?.content) {
          let match;
          const text = el.textRun.content;
          while ((match = tagPattern.exec(text)) !== null) {
            const key = match[1].trim();
            if (textData[key] !== undefined) {
                replacements.push({
                    startIndex: el.startIndex + match.index,
                    endIndex: el.startIndex + match.index + match[0].length,
                    key,
                    value: String(textData[key]),
                    isSync: syncTags.includes(key)
                });
            }
          }
        }
      });

      // 3. 역순(뒤에서부터)으로 치환 및 NamedRange 생성 (인덱스 밀림 방지)
      const sortedReplacements = replacements.sort((a, b) => b.startIndex - a.startIndex);
      const updateRequests: any[] = [];

      sortedReplacements.forEach((rep, index) => {
        // 텍스트 치환
        updateRequests.push({
          insertText: {
            location: { index: rep.startIndex },
            text: rep.value
          }
        });
        updateRequests.push({
          deleteContentRange: {
            range: {
              startIndex: rep.startIndex + rep.value.length,
              endIndex: rep.endIndex + rep.value.length
            }
          }
        });

        // 동기화 대상인 경우 NamedRange 생성
        if (rep.isSync) {
          updateRequests.push({
            createNamedRange: {
              name: rep.key,
              range: {
                startIndex: rep.startIndex,
                endIndex: rep.startIndex + rep.value.length
              }
            }
          });
        }
      });

      if (updateRequests.length > 0) {
        await this.docs.documents.batchUpdate({
          auth: auth as any,
          documentId: newDocId,
          requestBody: { requests: updateRequests },
        });
      }

      return {
        success: true,
        documentId: newDocId,
        url: `https://docs.google.com/document/d/${newDocId}/edit`,
        title
      };
    } catch (error: any) {
      console.error('❌ [GDocEngine] 문서 생성 에러 상세:', error);
      throw error;
    }
  }

  /**
   * 문서 내의 Named Range 데이터 읽기
   */
  async readNamedRanges(documentId: string) {
    try {
      const auth = await this.getAuth();
      const res = await this.docs.documents.get({
        auth: auth as any,
        documentId,
      });

      const namedRanges = res.data.namedRanges || {};
      const result: Record<string, string> = {};

      // 본문에서 모든 텍스트 요소를 평면화(Flatten)하여 수집
      const allElements: any[] = [];
      const collectElements = (content: any[]) => {
        content.forEach(element => {
          if (element.paragraph) {
            element.paragraph.elements.forEach((el: any) => allElements.push(el));
          } else if (element.table) {
            element.table.tableRows.forEach((row: any) => {
              row.tableCells.forEach((cell: any) => collectElements(cell.content));
            });
          }
        });
      };
      if (res.data.body?.content) collectElements(res.data.body.content);

      Object.entries(namedRanges).forEach(([name, nrObj]: [string, any]) => {
        let text = '';
        nrObj.namedRanges.forEach((nr: any) => {
          nr.ranges.forEach((range: any) => {
            const { startIndex, endIndex } = range;
            // 해당 범위에 속하는 텍스트 요소들 추출
            const relevant = allElements.filter(el => 
              el.startIndex >= startIndex && el.endIndex <= endIndex && el.textRun
            );
            text += relevant.map(el => el.textRun.content).join('').trim();
          });
        });
        result[name] = text;
      });

      return result;
    } catch (error) {
      console.error('❌ [GDocEngine] NamedRange 읽기 에러:', error);
      return {};
    }
  }

  /**
   * 파일 이동
   */
  async moveFile(fileId: string, targetFolderId: string) {
    try {
      const auth = await this.getAuth();
      const drive = google.drive({ version: 'v3', auth: auth as any });

      // 이전 부모 폴더 찾기
      const file = await drive.files.get({
        fileId,
        fields: 'parents',
      });
      const previousParents = file.data.parents?.join(',') || '';

      // 이동 실행
      await drive.files.update({
        fileId,
        addParents: targetFolderId,
        removeParents: previousParents,
        fields: 'id, parents',
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ [GDocEngine] 파일 이동 에러:', error);
      throw error;
    }
  }

  /**
   * 구글 드라이브에 파일 직접 업로드
   * @param filename 저장할 파일명
   * @param mimeType 마임 타입
   * @param folderId 저장할 폴더 ID
   * @param body 파일 데이터 (Stream 또는 Buffer)
   */
  async uploadFile(filename: string, mimeType: string, folderId: string, body: any) {
    try {
      const auth = await this.getAuth();
      const drive = google.drive({ version: 'v3', auth: auth as any });

      console.log(`🚀 [GDocEngine] 파일 업로드 시도: ${filename} -> 폴더(${folderId})`);
      
      const res = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [folderId],
        },
        media: {
          mimeType: mimeType,
          body: body,
        },
        fields: 'id, name, webViewLink, exportLinks',
      });

      console.log(`✅ [GDocEngine] 파일 업로드 완료: ${res.data.id}`);
      return {
        id: res.data.id!,
        name: res.data.name!,
        url: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`
      };
    } catch (error: any) {
      console.error('❌ [GDocEngine] 파일 업로드 에러:', error);
      throw error;
    }
  }

  /**
   * PDF로 내보내기 링크 생성
   */
  getExportPdfUrl(documentId: string) {
    return `https://docs.google.com/document/d/${documentId}/export?format=pdf`;
  }
}

export const gdocEngine = new GDocEngine();
