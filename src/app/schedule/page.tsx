"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const wbsData = [
    { wbs: 'WBS-100', name: '기반 시설 공사 (전체)', period: '2024-03-01\n2024-04-10', manager: '김현장', status: 'In Progress', rate: 92 },
    { wbs: 'WBS-101', name: '↳ 현장 사무소 개설 및 인허가', period: '2024-03-01\n2024-03-15', manager: '김철수', status: 'Completed', rate: 100 },
    { wbs: 'WBS-102', name: '↳ 기초 맨홀 터파기 및 관로 포설', period: '2024-03-16\n2024-04-10', manager: '이영희', status: 'In Progress', rate: 85 },
    { wbs: 'WBS-200', name: '통신 설비 구축 (전체)', period: '2024-04-05\n2024-04-30', manager: '김현장', status: 'In Progress', rate: 13 },
    { wbs: 'WBS-201', name: '↳ 통신 장비실 랙 설치', period: '2024-04-05\n2024-04-15', manager: '최민수', status: 'Delayed', rate: 40 },
    { wbs: 'WBS-202', name: '↳ 광케이블 접속 및 성단', period: '2024-04-11\n2024-04-20', manager: '박준형', status: 'Planned', rate: 0 },
];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
        'Completed': 'bg-green-100 text-green-700 border-green-200',
        'Delayed': 'bg-red-100 text-red-700 border-red-200',
        'Planned': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${map[status] || ''}`}>{status}</span>;
}

export default function SchedulePage() {
    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Schedule</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">공정 관리</h1>
                    <p className="text-sm text-gray-500">WBS 기반 전체 공정 현황 및 진도율 관리</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">✏️ 수정</button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">🗑 삭제</button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">+ 공정 추가</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <th className="py-3 px-4 text-left w-8"><input type="checkbox" /></th>
                            <th className="py-3 px-4 text-left">WBS 코드</th>
                            <th className="py-3 px-4 text-left">공종명</th>
                            <th className="py-3 px-4 text-left">기간</th>
                            <th className="py-3 px-4 text-left">담당자</th>
                            <th className="py-3 px-4 text-center">상태</th>
                            <th className="py-3 px-4 text-right">진도율(%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {wbsData.map((row, i) => (
                            <tr key={i} className="border-t border-gray-50 hover:bg-blue-50/30 transition">
                                <td className="py-4 px-4"><input type="checkbox" /></td>
                                <td className="py-4 px-4 font-mono text-gray-500">{row.wbs}</td>
                                <td className="py-4 px-4 font-semibold text-gray-700">{row.name}</td>
                                <td className="py-4 px-4 text-gray-500 whitespace-pre-line text-xs">{row.period}</td>
                                <td className="py-4 px-4 text-gray-600">{row.manager}</td>
                                <td className="py-4 px-4 text-center"><StatusBadge status={row.status} /></td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${row.status === 'Delayed' ? 'bg-red-500' : row.status === 'Completed' ? 'bg-green-500' : 'bg-blue-600'}`}
                                                style={{ width: `${row.rate}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 w-10 text-right">{row.rate}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
