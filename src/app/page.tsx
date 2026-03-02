"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const kpiCards = [
    { icon: '📊', label: '전체 공정률', value: '14%', sub: '', color: 'bg-blue-50 text-blue-600', hasBar: true, barWidth: '14%' },
    { icon: '⏳', label: '대기중인 검측', value: '1건', sub: '승인 대기 중', color: 'bg-yellow-50 text-yellow-600', hasBar: false, barWidth: '' },
    { icon: '🔺', label: '지연 공정', value: '1건', sub: '조치 필요', color: 'bg-red-50 text-red-600', hasBar: false, barWidth: '' },
    { icon: '✅', label: '금주 완료 예정', value: '2건', sub: '정상 진행 중', color: 'bg-green-50 text-green-600', hasBar: false, barWidth: '' },
];

const scheduleItems = [
    { wbs: 'WBS-100', name: '기반 시설 공사 (전체)', rate: 92, period: '2024-03-01 ~ 2024-04-10', status: 'In Progress' },
    { wbs: 'WBS-101', name: '현장 사무소 개설 및 인허가', rate: 100, period: '2024-03-01 ~ 2024-03-15', status: 'Completed' },
    { wbs: 'WBS-102', name: '기초 맨홀 터파기 및 관로 포설', rate: 85, period: '2024-03-16 ~ 2024-04-10', status: 'In Progress' },
    { wbs: 'WBS-200', name: '통신 설비 구축 (전체)', rate: 13, period: '2024-04-05 ~ 2024-04-30', status: 'In Progress' },
];

const inspectionItems = [
    { name: '자재 검수', location: '현장 자재 창고 | 감리단장', date: '2024-03-28', status: 'Approved' },
    { name: '관로 매설 깊이 검측', location: 'A구역 2번 맨홀 | 김감리', date: '2024-04-02', status: 'Rejected' },
    { name: '통신 랙 접지 저항 측정', location: 'MDF실 | 이감리', date: '2024-04-05', status: 'Pending' },
];

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'In Progress': 'bg-blue-100 text-blue-700',
        'Completed': 'bg-green-100 text-green-700',
        'Delayed': 'bg-red-100 text-red-700',
        'Approved': 'text-green-600',
        'Rejected': 'text-red-600',
        'Pending': 'text-yellow-600',
    };
    return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
}

export default function DashboardPage() {
    return (
        <DashboardLayout>
            {/* Breadcrumb */}
            <div className="text-sm text-gray-500 mb-6">🏠 홈 / <span className="text-gray-800 font-medium">Dashboard</span></div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {kpiCards.map((card, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-3">
                            <span className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl ${card.color}`}>{card.icon}</span>
                            <span className="text-xs text-gray-400 font-medium">{card.label}</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                        {card.hasBar && (
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: card.barWidth }}></div>
                            </div>
                        )}
                        {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
                    </div>
                ))}
            </div>

            {/* Bottom Grid: Schedule + Inspection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 주요 공정 현황 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">주요 공정 현황</h2>
                    <div className="space-y-4">
                        {scheduleItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">{item.wbs}</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">{item.name}</p>
                                        <p className="text-xs text-gray-400">{item.period}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-700">{item.rate}%</span>
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 최근 품질 검측 요청 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">최근 품질 검측 요청</h2>
                    <div className="space-y-4">
                        {inspectionItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${item.status === 'Approved' ? 'bg-green-500' : item.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">{item.name}</p>
                                        <p className="text-xs text-gray-400">{item.location}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">{item.date}</p>
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
