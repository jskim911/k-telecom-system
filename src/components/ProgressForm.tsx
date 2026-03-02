"use client";

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ProgressForm() {
    const [taskName, setTaskName] = useState('');
    const [plannedRate, setPlannedRate] = useState<number | ''>('');
    const [actualRate, setActualRate] = useState<number | ''>('');
    const [status, setStatus] = useState('진행 중');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const docRef = await addDoc(collection(db, 'progress_records'), {
                taskName,
                plannedRate: Number(plannedRate),
                actualRate: Number(actualRate),
                status,
                createdAt: serverTimestamp(),
            });

            setMessage('공정 실적이 성공적으로 저장되었습니다. ID: ' + docRef.id);
            setTaskName('');
            setPlannedRate('');
            setActualRate('');
        } catch (error: any) {
            setMessage('저장 중 오류 발생: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 max-w-2xl mx-auto my-8">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">세부 공정 실적 입력</h2>

            {message && (
                <div className={`mb-4 p-3 rounded-md text-sm ${message.includes('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">단위 공종명 (Task Name)</label>
                    <input
                        type="text"
                        required
                        placeholder="예: 서울지사 외부 광케이블 인입공사"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">계획 공정률 (%)</label>
                        <input
                            type="number"
                            required
                            min="0" max="100"
                            value={plannedRate}
                            onChange={(e) => setPlannedRate(Number(e.target.value) || '')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">실적 공정률 (%)</label>
                        <input
                            type="number"
                            required
                            min="0" max="100"
                            value={actualRate}
                            onChange={(e) => setActualRate(Number(e.target.value) || '')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">현재 상태 (Status)</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="진행 중">진행 중 (On Track)</option>
                        <option value="지연">지연 (Delayed)</option>
                        <option value="완료">완료 (Completed)</option>
                    </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-5 py-2 bg-[#059669] text-white rounded-md font-medium shadow-sm transition ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'}`}
                    >
                        {loading ? '저장 중...' : '실적 저장'}
                    </button>
                </div>
            </form>
        </div>
    );
}
