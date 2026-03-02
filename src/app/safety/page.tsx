"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const riskItems = [
    { name: '고소 작업 (맨홀)', location: 'A구역 2번 맨홀 내부 작업 (밀폐공간)', risk: 'High Risk', color: 'bg-red-50 border-red-200 text-red-700' },
    { name: '전기 작업', location: '통신실 분전반 결선 작업', risk: 'Medium', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
];

const activityLog = [
    { date: '2024-04-10', type: 'TBM', content: '맨홀 작업 전 산소농도 측정 및 환기 교육', risk: 'High', status: 'Safe', statusColor: 'text-green-600', manager: '이영희' },
    { date: '2024-04-10', type: 'Daily Check', content: '개인 보호구(안전모, 안전화) 착용 상태 점검', risk: 'Low', status: 'Safe', statusColor: 'text-green-600', manager: '김현장' },
    { date: '2024-04-09', type: 'Permit', content: '고소 작업 허가서 (사다리차 사용)', risk: 'Medium', status: 'Resolved', statusColor: 'text-green-600', manager: '박준형' },
    { date: '2024-04-08', type: 'Daily Check', content: '작업 현장 정리정돈 및 자재 적재 상태 불량', risk: 'Low', status: 'Caution', statusColor: 'text-yellow-600', manager: '최민수' },
];

function RiskBadge({ level }: { level: string }) {
    const map: Record<string, string> = {
        'High': 'bg-red-500 text-white',
        'Medium': 'bg-yellow-500 text-white',
        'Low': 'bg-blue-500 text-white',
    };
    return <span className={`text-xs font-bold px-2.5 py-1 rounded ${map[level] || 'bg-gray-200'}`}>{level}</span>;
}

export default function SafetyPage() {
    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Safety</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">안전 관리</h1>
                    <p className="text-sm text-gray-500">현장 위험성 평가(TBM) 및 안전 점검 현황</p>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm">📋 안전 일지 작성</button>
            </div>

            {/* 무재해 달성 배너 */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 text-white rounded-xl p-6 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">🛡️</span>
                    <div>
                        <p className="text-sm opacity-80">무재해 달성일수</p>
                        <p className="text-4xl font-bold">124 <span className="text-lg font-normal">일째</span></p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm opacity-80">최근 안전사고</p>
                    <p className="text-lg font-semibold">없음 (준공 예정일 D-50)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* 금일 위험 작업 현황 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">⚠️ 금일 위험 작업 현황</h2>
                    <div className="space-y-3">
                        {riskItems.map((item, i) => (
                            <div key={i} className={`rounded-lg border p-4 ${item.color}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-sm">{item.name}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${item.color}`}>{item.risk}</span>
                                </div>
                                <p className="text-xs opacity-80">{item.location}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 최근 안전 활동 내역 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">최근 안전 활동 내역</h2>
                        <span className="text-xs text-gray-400">최근 7일 기준</span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-gray-400 border-b">
                                <th className="py-2 text-left">일자/유형</th>
                                <th className="py-2 text-left">내용</th>
                                <th className="py-2 text-center">위험등급</th>
                                <th className="py-2 text-center">상태</th>
                                <th className="py-2 text-right">담당자</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activityLog.map((row, i) => (
                                <tr key={i} className="border-b border-gray-50">
                                    <td className="py-3">
                                        <p className="font-medium text-gray-700">{row.date}</p>
                                        <p className="text-xs text-gray-400">{row.type}</p>
                                    </td>
                                    <td className="py-3 text-gray-600 text-xs">{row.content}</td>
                                    <td className="py-3 text-center"><RiskBadge level={row.risk} /></td>
                                    <td className={`py-3 text-center text-xs font-semibold ${row.statusColor}`}>✅ {row.status}</td>
                                    <td className="py-3 text-right text-gray-600">{row.manager}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 이달의 안전 캠페인 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">이달의 안전 캠페인</h2>
                <div className="flex items-center gap-6">
                    <span className="text-6xl">🦺</span>
                    <div>
                        <p className="text-xl font-bold text-gray-800">개인보호구 착용 철저</p>
                        <p className="text-sm text-gray-500 mt-1">모든 현장 출입 시 안전모, 안전화, 안전조끼를 반드시 착용하세요.</p>
                        <p className="text-sm text-gray-500">밀폐공간 진입 시 산소농도 측정기를 반드시 휴대하세요.</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
