import { NextResponse } from 'next/server';
import { gdocEngine } from '@/lib/gdoc_engine';

/**
 * 구글 독스 디지털 서명 삽입 API
 * POST /api/signature
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, tag, imageUrl } = body;

    if (!documentId || !tag || !imageUrl) {
      return NextResponse.json(
        { success: false, message: 'documentId, tag, imageUrl이 모두 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await gdocEngine.insertSignatureImage(documentId, tag, imageUrl);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Signature insertion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '서명 삽입 중 오류가 발생했습니다.',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
