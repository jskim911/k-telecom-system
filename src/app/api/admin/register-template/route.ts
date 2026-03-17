import { NextRequest, NextResponse } from 'next/server';
import { gdocEngine } from '@/lib/gdoc_engine';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { extractDocIdFromUrl } from '@/lib/gdoc-client';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const { documentId, title, url, projectName, projectId, isGDoc } = await req.json();

    if (!url || !title || !projectName || !projectId) {
        return NextResponse.json({ success: false, message: '필수 정보(URL, 제목, 공사명, 프로젝트ID)가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 시스템 최상위 루트 폴더 확보
    const systemRootId = await gdocEngine.findOrCreateFolder('감리시스템_출력물');

    // 2. 공사명 폴더 확보
    const projectRootId = await gdocEngine.findOrCreateFolder(projectName, systemRootId);

    // 3. 템플릿 폴더 확보
    const templateFolderId = await gdocEngine.findOrCreateFolder('템플릿', projectRootId);

    let finalDriveId = documentId;
    let finalUrl = url;

    // 4. 구글 독스가 아닌 경우 (Firebase Storage 등) 파일 업로드 수행
    if (!isGDoc || !documentId) {
        console.log(`🚀 [API] 외부 파일 발견, 구글 드라이브 업로드 프로세스 시작: ${title}`);
        
        // Firebase Storage URL에서 파일 다운로드
        const response = await fetch(url);
        if (!response.ok) throw new Error(`파일 다운로드 실패: ${response.statusText}`);
        
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();
        
        // 구글 드라이브로 업로드
        const uploadRes = await gdocEngine.uploadFile(
            title + (url.split('?')[0].endsWith('.hwpx') ? '.hwpx' : url.split('?')[0].endsWith('.docx') ? '.docx' : ''), 
            contentType,
            templateFolderId,
            Readable.from(Buffer.from(buffer))
        );
        
        finalDriveId = uploadRes.id;
        finalUrl = uploadRes.url;
    } else {
        // 이미 구글 독스인 경우 기존처럼 이동 시도
        try {
            await gdocEngine.moveFile(documentId, templateFolderId);
        } catch (e) {
            console.warn('파일 이동 실패 (권한 문제일 수 있음):', e);
        }
    }

    // 5. 공사명 폴더 하위에 개별 [양식명] 출력 폴더 생성
    const subFolderId = await gdocEngine.findOrCreateFolder(title, projectRootId);

    // 6. Firestore에 템플릿 정보 등록
    await setDoc(doc(db, 'gdoc_templates', finalDriveId), {
        title,
        url: finalUrl,
        projectName,
        projectId, // 추가된 부분
        projectRootId,
        outputFolderId: subFolderId,
        createdAt: Date.now(),
        isExternal: !isGDoc
    });

    return NextResponse.json({ 
        success: true, 
        message: `'${projectName}' 폴더 하위에 '${title}' 연동이 완료되었습니다. (Google Drive ID: ${finalDriveId})`,
        driveId: finalDriveId
    });
  } catch (error: any) {
    console.error('❌ 템플릿 등록 API 에러:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
