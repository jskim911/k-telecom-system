import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, apiKey, history } = body;

        if (!apiKey) {
            return NextResponse.json(
                { success: false, message: 'Gemini API Key가 필요합니다. 회원정보에서 등록해주세요.' },
                { status: 400 }
            );
        }

        // 1. 프로젝트 컨텍스트 확보 (RAG)
        // 기본정보 (settings/project)
        const projectSnap = await getDoc(doc(db, 'settings', 'project'));
        const projectData = projectSnap.exists() ? projectSnap.data().project : null;
        
        // 공정 정보 (process_items)
        const procSnap = await getDocs(collection(db, 'process_items'));
        const processes = procSnap.docs.map(d => d.data());

        // 2. 시스템 프롬프트 구성
        const systemPrompt = `
당신은 'K-Telecom 스마트 공사감리 시스템'의 전문 AI 비서입니다.
사용자의 질문에 대해 다음 지침을 반드시 준수하여 답변하세요:

1. **내부 자료 우선 참고**: 아래 제공되는 [프로젝트 정보]와 [공정 리스트]를 최우선으로 확인하여 답변하세요.
2. **출처 명기**: 내부 자료를 사용하여 답변할 경우, 반드시 "[출처: 기본정보/프로젝트]" 또는 "[출처: 기본정보/공정설계]"와 같이 출처를 명시하세요.
3. **외부 검색 활용**: 내부 자료에 정보가 없는 경우, 최신 인터넷 검색 정보를 활용하되 "외부 자료를 참고하여 답변드립니다"라고 안내하세요.
4. **전문성 유지**: 통신 감리, 공사 관리, 안전/품질 관리 전문가로서 신뢰감 있고 친절하게 한국어로 답변하세요.

[프로젝트 정보]
- 프로젝트명: ${projectData?.projectName || '미등록'}
- 발주처: ${projectData?.client || '미등록'}
- 시공사: ${projectData?.contractor || '미등록'}
- 감리사: ${projectData?.supervisor || '미등록'}
- 공기: ${projectData?.startDate || ''} ~ ${projectData?.endDate || ''}
- 예산: ${projectData?.budget || '미등록'}

[공정 리스트]
${processes.map(p => `- ${p.name} (가중치: ${p.weight}%)`).join('\n')}
`;

        // 3. Gemini API 호출
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt
        });

        // 대화 내역 변환 (history가 있는 경우)
        const chat = model.startChat({
            history: history || [],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({
            success: true,
            content: text
        });

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json(
            { 
                success: false, 
                message: 'AI 응답 생성 중 오류가 발생했습니다. API 키 유효성을 확인해 주세요.',
                error: error.message 
            },
            { status: 500 }
        );
    }
}
