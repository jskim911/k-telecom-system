"use client";

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function DailyReportForm() {
    const [date, setDate] = useState('');
    const [weather, setWeather] = useState('맑음');
    const [taskContent, setTaskContent] = useState('');
    const [personnel, setPersonnel] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // 1. Firestore의 'daily_reports' 컬렉션에 데이터 추가
            const docRef = await addDoc(collection(db, 'daily_reports'), {
                date,
                weather,
                taskContent,
                personnel,
                // (추후 구현) author: user.uid 구하기
                createdAt: serverTimestamp(),
                status: 'draft',
            });

            setMessage('성공적으로 저장되었습니다. ID: ' + docRef.id);
            // 초기화
            setDate('');
            setTaskContent('');
            setPersonnel('');
        } catch (error: any) {
            setMessage('저장 중 오류 발생: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 max-w-2xl mx-auto my-8">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">감리일보 작성 (테스트)</h2>

            {message && (
                <div className={`mb-4 p-3 rounded-md text-sm ${message.includes('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">작업 일자</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">날씨</label>
                        <select
                            value={weather}
                            onChange={(e) => setWeather(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="맑음">맑음</option>
                            <option value="흐림">흐림</option>
                            <option value="비">비</option>
                            <option value="눈">눈</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">금일 작업 내용</label>
                    <textarea
                        required
                        rows={4}
                        placeholder="예: 광케이블 2km 포설, 통신주 건주 3본 등"
                        value={taskContent}
                        onChange={(e) => setTaskContent(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">투입 인력 및 장비</label>
                    <input
                        type="text"
                        placeholder="예: 기술자 3명, 굴착기 1대"
                        value={personnel}
                        onChange={(e) => setPersonnel(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" className="px-5 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium transition">
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-5 py-2 bg-[#1A56DB] text-white rounded-md font-medium shadow-sm transition ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    >
                        {loading ? '저장 중...' : '감리일보 저장'}
                    </button>
                </div>
            </form>
        </div>
    );
}
