"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const inspections = [
    { id: 'INS-001', name: '자재 검수', location: '현장 자재 창고', date: '2024-03-28', inspector: '감리단장', status: 'Approved' },
    { id: 'INS-002', name: '관로 매설 깊이 검측', location: 'A구역 2번 맨홀', date: '2024-04-02', inspector: '김감리', status: 'Rejected' },
    { id: 'INS-003', name: '통신 랙 접지 저항 측정', location: 'MDF실', date: '2024-04-05', inspector: '이감리', status: 'Pending' },
];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'Approved': 'bg-green-100 text-green-700',
        'Rejected': 'bg-red-100 text-red-700',
        'Pending': 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`text-xs font-bold px-3 py-1 rounded-full ${map[status] || ''}`}>{status}</span>;
}

export default function QualityPage() {
    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Quality</span></div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">품질/검측 관리</h1>
                    <p className="text-sm text-gray-500">현장 검측 요청 내역 및 승인 프로세스</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">📋 검측 요청서 작성</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {inspections.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-mono">{item.id}</span>
                            <StatusBadge status={item.status} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">• {item.location}</p>
                        <div className="flex justify-between text-xs text-gray-400 mb-4">
                            <span>요청일자: {item.date}</span>
                            <span>검측관: {item.inspector}</span>
                        </div>
                        {item.status === 'Pending' ? (
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-red-600 font-medium hover:bg-red-50 transition">❌ 반려</button>
                                <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">✅ 승인</button>
                            </div>
                        ) : (
                            <p className="text-center text-xs text-gray-400 py-2">처리 완료</p>
                        )}
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
}
