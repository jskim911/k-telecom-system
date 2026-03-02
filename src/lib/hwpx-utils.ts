import JSZip from 'jszip';

/**
 * HWPX 파일의 내용을 파싱하고 데이터를 치환합니다.
 * @param hwpxBuffer HWPX 파일의 원본 ArrayBuffer
 * @param dataMapping XML 내 필드(예: <hp:t>태그 텍스트)를 치환할 Key-Value 객체
 * @returns 수정된 HWPX 파일의 Buffer
 */
export async function replaceHwpxContent(hwpxBuffer: ArrayBuffer, dataMapping: Record<string, string>): Promise<Buffer> {
    const zip = new JSZip();
    // 1. HWPX(zip) 압축 해제
    const unzipped = await zip.loadAsync(hwpxBuffer);

    // 2. content.xml (또는 본문 xml파일) 찾기 (보통 Contents/section0.xml 등에 주요 내용이 있음)
    const sectionFile = unzipped.file('Contents/section0.xml');
    if (!sectionFile) {
        throw new Error('HWPX 템플릿 내 Contents/section0.xml을 찾을 수 없습니다.');
    }

    // 3. XML 문자열 읽기
    const xmlContent = await sectionFile.async('string');

    // 4. XML 노드 순회 및 데이터 치환 로직 (간소화)
    let modifiedXmlStr = xmlContent;
    for (const [key, value] of Object.entries(dataMapping)) {
        // {{Key}} 형태의 포맷을 찾아 치환
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        modifiedXmlStr = modifiedXmlStr.replace(regex, value);
    }

    // 5. 변경된 XML을 다시 저장
    unzipped.file('Contents/section0.xml', modifiedXmlStr);

    // 6. 다시 압축하여 Buffer(Node.js 환경) 리턴
    const newZipBuffer = await unzipped.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return newZipBuffer as unknown as Buffer;
}
