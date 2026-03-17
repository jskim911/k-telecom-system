import { NextResponse } from 'next/server';
import { gdocEngine } from '@/lib/gdoc_engine';

/**
 * 구글 독스 문서 생성 API 엔드포인트
 * POST /api/generate
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, textData, title, documentType } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, message: 'templateId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 폴더 분류 로직 추가 (재설계 요구사항 반영: 템플릿명 기반 하위 폴더 생성)
    let folderId: string | undefined = undefined;
    try {
      // 최상위 폴더 '감리시스템_출력물' 확보
      const rootFolderId = await gdocEngine.findOrCreateFolder('감리시스템_출력물');
      
      // 템플릿 정보 가져오기 (이름 확인용)
      const templateInfo = await gdocEngine.analyzeTemplate(templateId);
      const subFolderName = (templateInfo.title || '기본출력').replace(/[\\/:*?"<>|]/g, "");
      
      // 템플릿 파일명으로 하위 폴더 ID 확보
      folderId = await gdocEngine.findOrCreateFolder(subFolderName, rootFolderId);
    } catch (folderError) {
      console.warn('⚠️ [API] 폴더 확보 실패, 루트에 생성함:', folderError);
    }

    // 2. 문서 생성 수행 (folderId 전달)
    const result = await gdocEngine.generateDocument(
      templateId,
      textData || {},
      title || `Generated_${Date.now()}`,
      folderId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Document generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '문서 생성 중 오류가 발생했습니다.',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * 구글 독스 템플릿 분석 API
 * GET /api/generate?templateId=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId');

  if (!templateId) {
    return NextResponse.json(
      { success: false, message: 'templateId가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    const analysis = await gdocEngine.analyzeTemplate(templateId);
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Template analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '템플릿 분석 중 오류가 발생했습니다.',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
