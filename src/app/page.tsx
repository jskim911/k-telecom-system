"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface ProjectInfo {
    projectName: string;
    client: string;
    contractor: string;
    supervisor: string;
    startDate: string;
    endDate: string;
    budget: string;
    address: string;
}

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

function getDaysLeft(endDate: string): number {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getElapsedPercent(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
}

export default function DashboardPage() {
    const [project, setProject] = useState<ProjectInfo | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'project'), (snap) => {
            if (snap.exists() && snap.data().project) {
                setProject(snap.data().project as ProjectInfo);
            }
        });
        return () => unsub();
    }, []);

    const daysLeft = project ? getDaysLeft(project.endDate) : 0;
    const elapsed = project ? getElapsedPercent(project.startDate, project.endDate) : 0;

    return (
        <DashboardLayout>
            {/* Breadcrumb */}
            <div className="text-sm text-gray-500 mb-4">🏠 홈 / <span className="text-gray-800 font-medium">Dashboard</span></div>

            {/* 프로젝트 기본정보 배너 */}
            {project && (
                <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] rounded-2xl shadow-lg p-5 mb-6 text-white relative overflow-hidden">
                    {/* 배경 패턴 */}
                    <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
                    <div className="absolute bottom-0 left-40 w-32 h-32 bg-white/5 rounded-full translate-y-16"></div>

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="text-blue-200 text-xs font-medium mb-1">📋 프로젝트</p>
                                <h2 className="text-xl font-bold">{project.projectName}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-200 text-xs">공사 잔여일</p>
                                <p className="text-2xl font-bold">{daysLeft > 0 ? `D-${daysLeft}` : '완료'}</p>
                            </div>
                        </div>

                        {/* 공기 진행률 바 */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-blue-200 mb-1">
                                <span>{project.startDate}</span>
                                <span>공기 진행률 {elapsed}%</span>
                                <span>{project.endDate}</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2">
                                <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${elapsed}%` }}></div>
                            </div>
                        </div>

                        {/* 핵심 정보 그리드 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white/10 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-blue-200">발주처</p>
                                <p className="text-sm font-semibold truncate">{project.client}</p>
                            </div>
                            <div className="bg-white/10 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-blue-200">시공사</p>
                                <p className="text-sm font-semibold truncate">{project.contractor}</p>
                            </div>
                            <div className="bg-white/10 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-blue-200">감리사</p>
                                <p className="text-sm font-semibold truncate">{project.supervisor}</p>
                            </div>
                            <div className="bg-white/10 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-blue-200">공사 금액</p>
                                <p className="text-sm font-semibold truncate">{project.budget}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
