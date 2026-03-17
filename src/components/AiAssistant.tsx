"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Message {
    role: 'user' | 'model'; // Gemini SDK uses 'model' instead of 'assistant'
    content: string;
}

const suggestions = [
    '우리 프로젝트 공기를 알려줘',
    '등록된 공정 리스트와 가중치를 보여줘',
    '안전관리 점검 체크리스트',
    '품질 검측 절차 안내',
];

export default function AiAssistant() {
    const { userData } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: '안녕하세요! K-Telecom 감리시스템 AI 비서입니다. 현장 관리에 대해 무엇이든 물어보세요. 🏗️' },
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

        // API Key 체크
        if (!userData?.geminiApiKey) {
            setMessages((prev: Message[]) => [
                ...prev, 
                { role: 'user', content: userMessage },
                { role: 'model', content: '⚠️ 회원가입 시 등록된 Gemini API Key가 없습니다. 프로필 설정에서 API Key를 등록하신 후 다시 시도해 주세요.' }
            ]);
            setInput('');
            return;
        }

        setMessages((prev: Message[]) => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setLoading(true);

        try {
            // 대화 내역 가공 (Gemini SDK 형식)
            const history = messages.slice(1).map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }));

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    apiKey: userData.geminiApiKey,
                    history: history
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessages((prev: Message[]) => [...prev, { role: 'model', content: data.content }]);
            } else {
                setMessages((prev: Message[]) => [...prev, { role: 'model', content: `❌ 오류: ${data.message}` }]);
            }
        } catch (error) {
            console.error('Chat Error:', error);
            setMessages((prev: Message[]) => [...prev, { role: 'model', content: '❌ 서버와의 통신 중 오류가 발생했습니다.' }]);
        } finally {
            setLoading(false);
        }
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
