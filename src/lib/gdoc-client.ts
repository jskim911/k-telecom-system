/**
 * 구글 독스 연동 프론트엔드 클라이언트
 */

export interface GDocGenerateRequest {
  templateId: string;
  textData: Record<string, string>;
  title?: string;
  documentType?: string;
}

export interface GDocGenerateResult {
  success: boolean;
  documentId: string;
  url: string;
  title: string;
  message?: string;
}

export interface GDocAnalysisResult {
  documentId: string;
  title: string;
  placeholders: Array<{
    name: string;
    pattern: string;
  }>;
}

/**
 * 구글 독스 템플릿 분석 요청
 */
export async function analyzeGDocTemplate(documentId: string): Promise<GDocAnalysisResult> {
  const res = await fetch(`/api/generate?templateId=${encodeURIComponent(documentId)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "템플릿 분석 실패");
  }
  return await res.json();
}

/**
 * 구글 독스 문서 생성 요청
 */
export async function generateGDocDocument(req: GDocGenerateRequest): Promise<GDocGenerateResult> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "문서 생성 실패");
  }
  return await res.json();
}

/**
 * 구글 독스 디지털 서명 삽입 요청
 */
export async function insertSignature(documentId: string, tag: string, imageUrl: string): Promise<{ success: boolean }> {
  const res = await fetch('/api/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, tag, imageUrl }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "서명 삽입 실패");
  }
  return await res.json();
}

/**
 * 구글 독스 URL에서 ID 추출 유틸리티
 */
export function extractDocIdFromUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
}
