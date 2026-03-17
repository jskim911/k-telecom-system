"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import GDocDynamicModal from '@/components/GDocDynamicModal';

// --- Interfaces ---
interface JobOrder {
    id: string;
    title: string;
    date: string;
    location: string;
    process: string;
}

interface FormCategory {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    bgHover: string;
}

const categories: FormCategory[] = [
    { 
        id: 'quality', 
        title: '품질/검측 관리', 
        description: '검측요청서, 품질 시험 등 품질 관련 양식', 
        icon: '🔍', 
        color: 'text-blue-600',
        bgHover: 'hover:bg-blue-50'
    },
    { 
        id: 'safety', 
        title: '안전 관리', 
        description: 'TBM 기록부, 안전 점검 일지 등 안전 양식', 
        icon: '⛑️', 
        color: 'text-orange-600',
        bgHover: 'hover:bg-orange-50'
    },
    { 
        id: 'completion', 
        title: '준공 관리', 
        description: '준공 사진첩, 준공 신고서 등 마감 양식', 
        icon: '🏗️', 
        color: 'text-emerald-600',
        bgHover: 'hover:bg-emerald-50'
    },
    { 
        id: 'environment', 
        title: '환경 관리', 
        description: '폐기물 처리 기록, 환경 점검표 등 환경 양식', 
        icon: '🌿', 
        color: 'text-teal-600',
        bgHover: 'hover:bg-teal-50'
    },
];

interface BaseReport {
    id: string;
    title: string;
    date: string;
    location: string;
    process: string;
    jobOrderId?: string;
}

export default function FormsPage() {
    const [jobOrders, setJobOrders] = useState<BaseReport[]>([]);
    const [workReports, setWorkReports] = useState<BaseReport[]>([]);
    const [supervisionReports, setSupervisionReports] = useState<BaseReport[]>([]);
    
    const [selectedCategory, setSelectedCategory] = useState<FormCategory | null>(null);
    const [showJobSelector, setShowJobSelector] = useState(false);
    const [selectedJob, setSelectedJob] = useState<BaseReport | null>(null);
    const [showGDocModal, setShowGDocModal] = useState(false);
    const [displayList, setDisplayList] = useState<BaseReport[]>([]);

    useEffect(() => {
        // Job Orders
        const unsubJobs = onSnapshot(query(collection(db, 'job_orders'), orderBy('date', 'desc')), (snap) => {
            setJobOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as BaseReport)));
        });
        
        // Work Reports
        const unsubWork = onSnapshot(query(collection(db, 'work_reports'), orderBy('date', 'desc')), (snap) => {
            setWorkReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as BaseReport)));
        });

        // Supervision Reports
        const unsubSuper = onSnapshot(query(collection(db, 'supervision_reports'), orderBy('date', 'desc')), (snap) => {
            setSupervisionReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as BaseReport)));
        });

        return () => {
            unsubJobs();
            unsubWork();
            unsubSuper();
        };
    }, []);

    const handleCategoryClick = (category: FormCategory) => {
        setSelectedCategory(category);
        
        // 연동 규칙:
        // 준공관리(completion), 환경관리(environment) -> 작업일보(work_reports)
        // 품질/검측(quality), 안전관리(safety) -> 감리일보(supervision_reports)
        if (category.id === 'completion' || category.id === 'environment') {
            setDisplayList(workReports);
        } else {
            setDisplayList(supervisionReports);
        }
        
        setShowJobSelector(true);
    };

    const handleJobSelect = (job: BaseReport) => {
        setSelectedJob(job);
        setShowJobSelector(false);
        setShowGDocModal(true);
    };

    const handleFormSave = async (data: Record<string, any>) => {
        if (!selectedCategory || !selectedJob) return;

        try {
            const { gdocUrl, ...rest } = data;
            const payload = {
                category: selectedCategory.id,
                categoryTitle: selectedCategory.title,
                linkedReportId: selectedJob.id,
                jobOrderId: selectedJob.jobOrderId || selectedJob.id,
                jobTitle: selectedJob.title,
                data: rest,
                gdocUrl: gdocUrl || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'form_reports'), payload);
            console.log("Form report saved successfully");
        } catch (error) {
            console.error("Error saving form report:", error);
            alert("DB 저장 중 오류가 발생했습니다.");
            throw error;
        }
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-4">🏠 홈 / <span className="text-gray-800 font-medium font-bold">양식관리</span></div>

            <div className="mb-10">
                <h1 className="text-2xl font-black text-slate-800">양식관리 센터</h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">카테고리별 구글 드라이브 양식 및 문서 생성</p>
            </div>

            {/* 2x2 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat)}
                        className={`group p-10 bg-white border border-slate-100 rounded-[32px] shadow-sm transition-all duration-300 ${cat.bgHover} hover:shadow-xl hover:-translate-y-1 text-left flex flex-col items-start gap-4`}
                    >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner bg-slate-50 group-hover:scale-110 transition-transform`}>
                            {cat.icon}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${cat.color} mb-2`}>{cat.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{cat.description}</p>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                            관리하기 <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* 리스트 선택 모달 */}
            {showJobSelector && (
                <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <span>{selectedCategory?.icon}</span>
                                    {selectedCategory?.title} - 대상 선택
                                </h2>
                                <p className="text-xs text-slate-400 font-bold mt-0.5">
                                    {selectedCategory?.id === 'completion' || selectedCategory?.id === 'environment' 
                                        ? '작업일보 리스트에서 대상을 선택하세요.' 
                                        : '감리일보 리스트에서 대상을 선택하세요.'}
                                </p>
                            </div>
                            <button onClick={() => setShowJobSelector(false)} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
                            {displayList.length === 0 ? (
                                <div className="py-20 text-center text-slate-400 font-bold">
                                    연동된 일보 리스트가 없습니다.<br/>공정관리 메뉴에서 먼저 일보를 발행해주세요.
                                </div>
                            ) : (
                                displayList.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleJobSelect(item)}
                                        className="w-full p-4 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all text-left flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="text-sm font-bold text-slate-800 mb-1 group-hover:text-blue-700">{item.title}</div>
                                            <div className="text-xs text-slate-400 font-medium">📍 {item.location} | 📅 {item.date}</div>
                                        </div>
                                        <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm">선택</span>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setShowJobSelector(false)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm">취소</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 구글 독스 모달 연동 */}
            {selectedJob && (
                <GDocDynamicModal
                    isOpen={showGDocModal}
                    onClose={() => {
                        setShowGDocModal(false);
                        setSelectedJob(null);
                    }}
                    onSave={handleFormSave}
                    documentType={selectedCategory?.id}
                    prefillData={{
                        job_title: selectedJob.title,
                        job_date: selectedJob.date,
                        job_location: selectedJob.location,
                        job_process: selectedJob.process,
                        category: selectedCategory?.title || ''
                    }}
                />
            )}
        </DashboardLayout>
    );
}
