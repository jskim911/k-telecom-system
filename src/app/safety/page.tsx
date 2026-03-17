"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import GDocDynamicModal from '@/components/GDocDynamicModal'; // 추가
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface SafetyLog {
    id: string;
    date: string;
    type: string;
    content: string;
    risk: string;
    status: string;
    manager: string;
    gdocUrl?: string;
}

const defaultRiskItems = [
    { name: '고소 작업 (맨홀)', location: 'A구역 2번 맨홀 내부 작업 (밀폐공간)', risk: 'High Risk', color: 'bg-red-50 border-red-200 text-red-700' },
    { name: '전기 작업', location: '통신실 분전반 결선 작업', risk: 'Medium', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
];

const defaultLogs: Omit<SafetyLog, 'id'>[] = [
    { date: '2024-04-10', type: 'TBM', content: '맨홀 작업 전 산소농도 측정 및 환기 교육', risk: 'High', status: 'Safe', manager: '이영희' },
    { date: '2024-04-10', type: 'Daily Check', content: '개인 보호구(안전모, 안전화) 착용 상태 점검', risk: 'Low', status: 'Safe', manager: '김현장' },
    { date: '2024-04-09', type: 'Permit', content: '고소 작업 허가서 (사다리차 사용)', risk: 'Medium', status: 'Resolved', manager: '박준형' },
    { date: '2024-04-08', type: 'Daily Check', content: '작업 현장 정리정돈 및 자재 적재 상태 불량', risk: 'Low', status: 'Caution', manager: '최민수' },
];

const typeOptions = ['TBM', 'Daily Check', 'Permit', 'Incident'];
const riskOptions = ['High', 'Medium', 'Low'];
const statusOptions = ['Safe', 'Caution', 'Resolved', 'Issue'];

function RiskBadge({ level }: { level: string }) {
    const map: Record<string, string> = { 'High': 'bg-red-500 text-white', 'Medium': 'bg-yellow-500 text-white', 'Low': 'bg-blue-500 text-white' };
    return <span className={`text-xs font-bold px-2.5 py-1 rounded ${map[level] || 'bg-gray-200'}`}>{level}</span>;
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = { 'Safe': 'text-green-600', 'Caution': 'text-yellow-600', 'Resolved': 'text-green-600', 'Issue': 'text-red-600' };
    return <span className={`text-xs font-semibold ${map[status] || ''}`}>✅ {status}</span>;
}

export default function SafetyPage() {
    const [logs, setLogs] = useState<SafetyLog[]>([]);
    const [showGDocModal, setShowGDocModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<SafetyLog | null>(null);
    const [gdocForceGenerate, setGDocForceGenerate] = useState(false);

    const colRef = collection(db, 'safetyLogs');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const wbs = searchParams.get('wbs');
            if (wbs) {
                const name = searchParams.get('name') || '';
                const loc = searchParams.get('location') || '';
                
                // 신규 작성을 위해 모달 오픈
                setSelectedLog(null);
                setGDocForceGenerate(false);
                setShowGDocModal(true);
                window.history.replaceState(null, '', '/safety');
            }
        }

        const q = query(colRef, orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            if (snap.empty) {
                defaultLogs.forEach((item) => addDoc(colRef, item));
                return;
            }
            setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SafetyLog)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleDelete = async (log: SafetyLog) => {
        if (!confirm(`"${log.content}" 활동 기록을 삭제하시겠습니까?`)) return;
        await deleteDoc(doc(db, 'safetyLogs', log.id));
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">
                <Link href="/" className="hover:text-blue-600 transition-colors">🏠 홈</Link> / <span className="text-gray-800 font-medium">Safety</span>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">안전 관리</h1>
                    <p className="text-sm text-gray-500">현장 위험성 평가(TBM) 및 안전 점검 현황</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedLog(null); setGDocForceGenerate(false); setShowGDocModal(true); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm">📋 안전 일지 작성</button>
                </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 text-white rounded-xl p-6 mb-6 flex items-center justify-between shadow-lg shadow-emerald-100">
                <div className="flex items-center gap-4">
                    <span className="text-4xl text-white/90">🛡️</span>
                    <div>
                        <p className="text-sm opacity-80">무재해 달성일수</p>
                        <p className="text-4xl font-black tracking-tight">124 <span className="text-lg font-normal">일째</span></p>
                    </div>
                </div>
                <div className="text-right hidden sm:block border-l border-white/20 pl-6">
                    <p className="text-sm opacity-80">최근 안전사고</p>
                    <p className="text-lg font-bold">없음 (공사 준공 D-50)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">⚠️ 금일 위험 작업 현황</h2>
                    <div className="space-y-3">
                        {defaultRiskItems.map((item, i) => (
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

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">최근 안전 활동 내역</h2>
                        <span className="text-xs text-gray-400">최근 7일 기준</span>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-gray-400 border-b">
                                    <th className="py-2 text-left">일자/유형</th>
                                    <th className="py-2 text-left">내용</th>
                                    <th className="py-2 text-center">위험등급</th>
                                    <th className="py-2 text-center">상태</th>
                                    <th className="py-2 text-right">담당자</th>
                                    <th className="py-2 text-center w-24">출력</th>
                                    <th className="py-2 text-right w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((row) => (
                                    <tr 
                                        key={row.id} 
                                        className="border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer"
                                        onClick={() => { setSelectedLog(row); setGDocForceGenerate(false); setShowGDocModal(true); }}
                                    >
                                        <td className="py-3">
                                            <p className="font-medium text-gray-700 text-xs">{row.date}</p>
                                            <p className="text-[10px] text-gray-400">{row.type}</p>
                                        </td>
                                        <td className="py-3 text-gray-600 text-xs">{row.content}</td>
                                        <td className="py-3 text-center"><RiskBadge level={row.risk} /></td>
                                        <td className="py-3 text-center"><StatusBadge status={row.status} /></td>
                                        <td className="py-3 text-right text-xs text-gray-600 font-medium">{row.manager}</td>
                                        <td className="py-3 px-2 text-center">
                                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                {row.gdocUrl ? (
                                                    <>
                                                        <a 
                                                            href={row.gdocUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            title="독스 열기"
                                                            className="p-1 bg-green-50 text-green-600 rounded border border-green-100 hover:bg-green-100 transition shadow-sm text-xs"
                                                        >
                                                            🌐
                                                        </a>
                                                        <a 
                                                            href={`https://docs.google.com/document/d/${row.gdocUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]}/export?format=pdf`}
                                                            title="PDF 다운로드"
                                                            className="p-1 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 transition shadow-sm text-xs"
                                                        >
                                                            📥
                                                        </a>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={() => { setSelectedLog(row); setGDocForceGenerate(true); setShowGDocModal(true); }}
                                                        className="text-[10px] px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold shadow-sm"
                                                    >
                                                        📄 출력
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="text-xs text-red-300 hover:text-red-500 transition">✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl">🦺</div>
                <span className="text-7xl">🦺</span>
                <div>
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Safety Campaign</p>
                    <p className="text-2xl font-black text-gray-900 mb-2">개인보호구 착용 철저</p>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-lg">모든 현장 출입 시 안전모, 안전화, 안전조끼를 반드시 착용하세요. 밀폐공간 진입 시 산소농도 측정기를 반드시 휴대해야 합니다.</p>
                </div>
            </div>

            {/* 구글 독스 모달 */}
            <GDocDynamicModal 
                isOpen={showGDocModal} 
                onClose={() => setShowGDocModal(false)}
                prefillData={selectedLog ? {
                    date: selectedLog.date,
                    type: selectedLog.type,
                    content: selectedLog.content,
                    risk: selectedLog.risk,
                    status: selectedLog.status,
                    manager: selectedLog.manager
                } : undefined}
                onSave={async (data) => {
                    if (selectedLog) {
                        const { gdocUrl, ...rest } = data;
                        await updateDoc(doc(db, 'safetyLogs', selectedLog.id), {
                            ...rest,
                            gdocUrl: gdocUrl || null,
                        });
                    }
                }}
                documentType="safety"
                forceGenerate={gdocForceGenerate}
            />
        </DashboardLayout>
    );
}
