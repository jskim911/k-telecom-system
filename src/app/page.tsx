"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';

interface ProcessItem {
    id: string;
    name: string;
    weight: number;
}

interface JobOrder {
    id: string;
    processId: string;
    rate: number;
    status: string;
}

interface ProjectInfo {
    projectName: string;
    client: string;
    contractor: string;
    supervisor: string;
    startDate: string;
    endDate: string;
    budget: string;
}

interface Transmittal {
    id: string;
    docNo: string;
    title: string;
    status: string;
    createdAt: any;
}

interface ResourceCounts {
    inspectors: number;
    clients: number;
    contractors: number;
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'In Progress': 'bg-blue-100 text-blue-700',
        'Completed': 'bg-green-100 text-green-700',
        'Approved': 'bg-emerald-100 text-emerald-700',
        'Pending': 'bg-orange-100 text-orange-700',
        'Rejected': 'bg-red-100 text-red-700',
        'Delayed': 'bg-red-100 text-red-700',
    };
    return <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
}

export default function DashboardPage() {
    const [project, setProject] = useState<ProjectInfo | null>(null);
    const [processes, setProcesses] = useState<ProcessItem[]>([]);
    const [jobs, setJobs] = useState<JobOrder[]>([]);
    const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
    const [resourceCounts, setResourceCounts] = useState<ResourceCounts>({ inspectors: 0, clients: 0, contractors: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. 프로젝트 기본 정보 및 인력 카운트
        const unsubProject = onSnapshot(doc(db, 'settings', 'project'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.project) setProject(data.project as ProjectInfo);
                setResourceCounts({
                    inspectors: data.inspectors?.length || 0,
                    clients: data.clients?.length || 0,
                    contractors: data.contractors?.length || 0,
                });
            }
        });

        // 2. 공정 아이템
        const unsubProc = onSnapshot(collection(db, 'process_items'), (snap) => {
            setProcesses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcessItem)));
        });

        // 3. 작업지시서
        const unsubJobs = onSnapshot(collection(db, 'job_orders'), (snap) => {
            setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobOrder)));
        });

        // 4. 최근 수발송 (5건)
        const qTrans = query(collection(db, 'transmittals'), orderBy('createdAt', 'desc'), limit(5));
        const unsubTrans = onSnapshot(qTrans, (snap) => {
            setTransmittals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transmittal)));
            setLoading(false);
        });

        return () => {
            unsubProject();
            unsubProc();
            unsubJobs();
            unsubTrans();
        };
    }, []);

    // 집계 로직
    const processProgressMap = processes.map(proc => {
        const linkedJobs = jobs.filter(j => j.processId === proc.id);
        const avgRate = linkedJobs.length > 0 
            ? linkedJobs.reduce((acc, j) => acc + (j.rate || 0), 0) / linkedJobs.length 
            : 0;
        return { ...proc, avgRate: Math.round(avgRate * 10) / 10 };
    });

    const totalWeightedProgress = Math.round(
        processProgressMap.reduce((acc, proc) => acc + (proc.avgRate * (proc.weight || 0) / 100), 0)
    );

    const pendingApprovals = transmittals.filter(t => t.status === 'Pending').length;

    return (
        <DashboardLayout>
            {/* Breadcrumb */}
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Main / Dashboard</div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* 1. 개인 업무 대시보드 (My Tasks) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black mb-2">오늘의 업무 현황</h2>
                            <p className="text-indigo-100 font-medium">검토 및 승인이 필요한 문서가 <span className="text-white font-black underline decoration-2 underline-offset-4">{pendingApprovals}건</span> 있습니다.</p>
                            
                            <div className="flex gap-4 mt-8">
                                <Link href="/documents" className="bg-white text-indigo-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition shadow-lg">결재 센터 바로가기</Link>
                                <Link href="/schedule" className="bg-indigo-500/50 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition border border-indigo-400">현장 관리</Link>
                            </div>
                        </div>
                        <div className="absolute right-0 bottom-0 p-10 opacity-10 text-[160px] font-black italic select-none leading-none translate-y-20 translate-x-10">TASK</div>
                    </div>

                    {/* 2. 퀵 액션 섹션 */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { title: '작업발행', desc: '신규 지시서', icon: '📝', href: '/schedule' },
                            { title: '결재상신', desc: '공문/보고서', icon: '🖋️', href: '/documents' },
                            { title: '양식작성', desc: '품질/안전', icon: '📁', href: '/forms' },
                        ].map((action, i) => (
                            <Link href={action.href} key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                                <div className="text-2xl mb-3 group-hover:scale-110 transition">{action.icon}</div>
                                <h3 className="text-sm font-black text-gray-800">{action.title}</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{action.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* 3. 프로젝트 요약 & 인원 위젯 */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center justify-between">
                            Project Resources
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </h2>
                        <div className="space-y-4">
                            {[
                                { label: '감리단', count: resourceCounts.inspectors, bg: 'bg-blue-50', text: 'text-blue-600' },
                                { label: '발주처', count: resourceCounts.clients, bg: 'bg-indigo-50', text: 'text-indigo-600' },
                                { label: '시공사', count: resourceCounts.contractors, bg: 'bg-slate-50', text: 'text-slate-600' },
                            ].map((res, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-gray-50/50 border border-transparent hover:border-gray-200 transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl ${res.bg} ${res.text} flex items-center justify-center font-black`}>{res.label[0]}</div>
                                        <span className="text-xs font-black text-gray-600">{res.label}</span>
                                    </div>
                                    <span className="text-sm font-black text-gray-800">{res.count}명</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Link href="/settings" className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition">관계자 정보 관리 ↗</Link>
                </div>
            </div>

            {/* Bottom Grid: Progress + Recent Logistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 4. 가중치 기반 공정 현황 (시각화 강화) */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-gray-800">공정별 진도 분석</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Weighted Progress Matrix</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-indigo-600">{totalWeightedProgress}%</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase">Total Weighted</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {processProgressMap.map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-tighter">W: {item.weight}%</span>
                                        <span className="text-sm font-black text-gray-700">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-indigo-600">{item.avgRate}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                                        style={{ width: `${item.avgRate}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. 최근 수발송 이력 (Recent Transmittals) */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-gray-800">최근 행정 업무</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Latest Transmittals</p>
                        </div>
                        <Link href="/documents" className="text-[10px] font-black uppercase text-indigo-600 hover:underline">View All</Link>
                    </div>

                    <div className="space-y-4">
                        {transmittals.map((t, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl border border-transparent hover:border-gray-100 transition cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition">📄</div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-700 truncate max-w-[150px]">{t.title}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{t.docNo}</p>
                                    </div>
                                </div>
                                <StatusBadge status={t.status} />
                            </div>
                        ))}
                        {transmittals.length === 0 && (
                            <div className="text-center py-20 text-gray-300 font-black uppercase text-xs tracking-widest">No Recent Data</div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
