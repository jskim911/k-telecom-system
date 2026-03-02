import { NextResponse } from 'next/server';
import { replaceHwpxContent } from '@/lib/hwpx-utils';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { templateUrl, mappingData, outputFileName = 'document.hwpx' } = body;

        if (!templateUrl || !mappingData) {
            return NextResponse.json({ error: 'templateUrl 및 mappingData가 필요합니다.' }, { status: 400 });
        }

        // 1. Firebase Storage(또는 외부 URL)에서 HWPX 템플릿 다운로드
        const response = await fetch(templateUrl);
        if (!response.ok) {
            throw new Error('HWPX 템플릿을 다운로드할 수 없습니다.');
        }
        const arrayBuffer = await response.arrayBuffer();

        // 2. XML 데이터 치환 유틸리티 호출
        const modifiedBuffer = await replaceHwpxContent(arrayBuffer, mappingData);

        // 3. 브라우저로 응답 (파일 다운로드 형태)
        return new NextResponse(new Uint8Array(modifiedBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/x-hwp-v5',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFileName)}"`,
            },
        });
    } catch (error: any) {
        console.error('HWPX 생성 중 오류 발생:', error);
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
    }
}
