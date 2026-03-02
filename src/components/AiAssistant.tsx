"use client";

import React, { useState, useRef, useEffect } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const suggestions = [
    '이번 주 지연 공정 대책을 알려줘',
    '감리일보 요약해줘',
    '안전관리 점검 체크리스트',
    '품질 검측 절차 안내',
];

export default function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '안녕하세요! K-Telecom 감리시스템 AI 비서입니다. 현장 관리에 대해 무엇이든 물어보세요. 🏗️' },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (text?: string) => {
        const userMessage = text || input.trim();
        if (!userMessage) return;

        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setLoading(true);

        // 시뮬레이션 응답 (추후 Gemini API 연동)
        setTimeout(() => {
            const responses: Record<string, string> = {
                '이번 주 지연 공정 대책을 알려줘': '📊 현재 WBS-201(통신 장비실 랙 설치)이 40% 진도율로 지연 상태입니다.\n\n**대책 방안:**\n1. 투입 인력 2명 → 4명으로 증원\n2. 자재 선투입 일정 조정 (D-3일)\n3. 야간작업 검토 (안전관리 병행)\n4. 발주처 공기 연장 협의 검토',
                '감리일보 요약해줘': '📝 **2024-04-10 감리일보 요약**\n\n• 금일 작업: 맨홀 터파기 3개소, 관로 포설 200m\n• 투입인력: 현장 12명, 감리 3명\n• 특이사항: A구역 암반 출현으로 장비 추가 투입 필요\n• 내일 예정: B구역 관로 포설 착수',
                '안전관리 점검 체크리스트': '🛡️ **일일 안전 점검 체크리스트**\n\n✅ 개인보호구 착용 상태\n✅ 작업 전 TBM 실시\n✅ 밀폐공간 산소농도 측정\n✅ 중장비 작업반경 확인\n✅ 가설울타리/안내판 설치\n✅ 교통통제 조치 확인\n✅ 작업 후 현장정리 상태',
                '품질 검측 절차 안내': '🔍 **품질 검측 진행 절차**\n\n1️⃣ 시공사 → 검측 요청서 제출\n2️⃣ 감리원 → 현장 검측 실시\n3️⃣ 검측 결과 기록 (사진 첨부)\n4️⃣ 합격 → 승인 / 불합격 → 반려\n5️⃣ 반려 시 시정 후 재검측 요청',
            };
            const answer = responses[userMessage] || `💡 "${userMessage}"에 대해 분석 중입니다.\n\n현재 시스템에 등록된 데이터를 기반으로 검토하겠습니다. 잠시만 기다려 주세요.\n\n(향후 Gemini API 연동 시 실시간 응답이 제공됩니다.)`;
            setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
            setLoading(false);
        }, 1200);
    };

    return (
        <>
            {/* 플로팅 버튼 */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 right-4 z-50 bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 hover:shadow-xl transition text-sm font-medium text-gray-700"
            >
                🤖 AI 비서 호출
            </button>

            {/* 모달 */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[600px] flex flex-col overflow-hidden">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🤖</span>
                                <div>
                                    <p className="font-bold text-sm">K-Telecom AI 비서</p>
                                    <p className="text-xs opacity-80">Powered by Gemini</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white text-lg">✕</button>
                        </div>

                        {/* 메시지 영역 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-line ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white border border-gray-200 text-gray-700'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400">
                                        <span className="animate-pulse">분석 중...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* 추천 질문 */}
                        {messages.length <= 1 && (
                            <div className="px-4 py-2 border-t bg-white flex flex-wrap gap-1.5">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(s)}
                                        className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 입력 */}
                        <div className="px-4 py-3 border-t bg-white flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="질문을 입력하세요..."
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                전송
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
