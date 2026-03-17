"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, 
    onSnapshot, query, orderBy, where, getDocs, serverTimestamp 
} from 'firebase/firestore';
import GDocDynamicModal from '@/components/GDocDynamicModal';

// --- Interfaces ---
interface JobOrder {
    id: string;
    jobNo: string;      // 자동 생성 번호 (일련번호)
    title: string;      // 작업날짜+작업위치+작업공정+일련번호
    date: string;
    location: string;
    process: string;    // 작업공정
    processId: string;  // 작업공정 ID 추가
    manager: string;
    status: string;
    rate: number;
    createdAt: any;
}

interface ProcessItem {
    id: string;
    name: string;
    weight: number;
}

interface WorkReport {
    id: string;
    jobOrderId: string; // 연동된 작업지시서 ID
    processId?: string; // 공정 ID 추가
    title: string;
    date: string;
    location: string;
    process: string;
    status: string;
    gdocUrl?: string;
    documentId?: string; // 구글 독스 ID
    createdAt: any;
}

interface SupervisionReport {
    id: string;
    jobOrderId: string; // 연동된 작업지시서 ID
    processId?: string; // 공정 ID 추가
    title: string;
    date: string;
    location: string;
    process: string;
    status: string;
    gdocUrl?: string;
    documentId?: string; // 구글 독스 ID
    createdAt: any;
}

type TabType = 'job_order' | 'work_report' | 'supervision_report';

// --- Component ---
export default function SchedulePage() {
    const [activeTab, setActiveTab] = useState<TabType>('job_order');
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
    const [workReports, setWorkReports] = useState<WorkReport[]>([]);
    const [supervisionReports, setSupervisionReports] = useState<SupervisionReport[]>([]);
    
    // Selection State
    const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
    
    // Modal States
    const [showJobModal, setShowJobModal] = useState(false);
    const [showReportGDocModal, setShowReportGDocModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<WorkReport | SupervisionReport | null>(null);
    
    // Job Issuance Form State
    const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
    const [jobLocation, setJobLocation] = useState('');
    const [jobProcess, setJobProcess] = useState(''); // 공정명
    const [jobProcessId, setJobProcessId] = useState(''); // 공정 ID 추가
    const [jobManager, setJobManager] = useState('');

    const [availableProcesses, setAvailableProcesses] = useState<ProcessItem[]>([]);

    // Fetch Data
    useEffect(() => {
        setLoading(true);
        
        // 1. Job Orders
        const qJob = query(collection(db, 'job_orders'), orderBy('createdAt', 'desc'));
        const unsubJob = onSnapshot(qJob, (snap) => {
            setJobOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobOrder)));
        });

        // 2. Work Reports
        const qWork = query(collection(db, 'work_reports'), orderBy('createdAt', 'desc'));
        const unsubWork = onSnapshot(qWork, (snap) => {
            setWorkReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkReport)));
        });

        // 3. Supervision Reports
        const qSuper = query(collection(db, 'supervision_reports'), orderBy('createdAt', 'desc'));
        const unsubSuper = onSnapshot(qSuper, (snap) => {
            setSupervisionReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupervisionReport)));
            setLoading(false);
        });

        // 4. Available Processes (for issuance)
        const qProc = query(collection(db, 'process_items'), orderBy('createdAt', 'desc'));
        const unsubProc = onSnapshot(qProc, (snap) => {
            setAvailableProcesses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcessItem)));
        });

        return () => {
            unsubJob();
            unsubWork();
            unsubSuper();
            unsubProc();
        };
    }, []);

    // --- Actions ---

    // 리포트 클릭 (작업일보/감리일보 모달 오픈)
    const handleReportClick = (report: WorkReport | SupervisionReport) => {
        setSelectedReport(report);
        setShowReportGDocModal(true);
    };

    const handleReportSave = async (data: Record<string, any>) => {
        if (!selectedReport) return;
        
        const { gdocUrl, documentId, ...rest } = data;
        const collectionName = activeTab === 'work_report' ? 'work_reports' : 'supervision_reports';
        
        try {
            await updateDoc(doc(db, collectionName, selectedReport.id), {
                data: rest,
                documentId: documentId || null,
                gdocUrl: gdocUrl || null,
                status: '작성완료',
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error saving report:", error);
            alert("DB 저장 중 오류가 발생했습니다.");
            throw error;
        }
    };

    // 구글 독스 데이터 동기화
    const handleSync = async (e: React.MouseEvent, report: WorkReport | SupervisionReport) => {
        e.stopPropagation();
        if (!report.documentId) {
            alert("연결된 구글 문서 ID가 없습니다.");
            return;
        }

        const collectionName = activeTab === 'work_report' ? 'work_reports' : 'supervision_reports';
        
        try {
            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: report.documentId,
                    firebaseCollection: collectionName,
                    firebaseId: report.id
                })
            });

            if (!res.ok) throw new Error("동기화 실패");
            
            const result = await res.json();
            alert(`동기화 완료: ${JSON.stringify(result.updatedData)}`);
        } catch (error) {
            console.error("Sync error:", error);
            alert("동기화 중 오류가 발생했습니다.");
        }
    };

    // 1. 작업발행 (Job Issuance)
    const handleIssueJob = async () => {
        if (!jobDate || !jobLocation || !jobProcessId) {
            alert('날짜, 위치, 공정은 필수 입력 항목입니다.');
            return;
        }

        try {
            // 선택된 공정명 찾기
            const selectedProc = availableProcesses.find(p => p.id === jobProcessId);
            const procName = selectedProc ? selectedProc.name : '';

            // 일련번호 생성 로직 (해당 날짜의 기존 작업 수 + 1)
            const q = query(
                collection(db, 'job_orders'), 
                where('date', '==', jobDate)
            );
            const querySnapshot = await getDocs(q);
            const sequence = querySnapshot.size + 1;
            const seqStr = String(sequence).padStart(2, '0');
            
            // 제목: 작업날짜+작업위치+작업공정+일련번호
            const title = `${jobDate}_${jobLocation}_${procName}_${seqStr}`;
            
            const newJob = {
                jobNo: seqStr,
                title,
                date: jobDate,
                location: jobLocation,
                processId: jobProcessId,
                process: procName,
                manager: jobManager || '미지정',
                status: '발행됨',
                rate: 0,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'job_orders'), newJob);
            setShowJobModal(false);
            // 필드 초기화
            setJobLocation('');
            setJobProcessId('');
            alert('작업지시서가 발행되었습니다.');
        } catch (error) {
            console.error('Job issuance error:', error);
            alert('발행 중 오류가 발생했습니다.');
        }
    };

    // 2. 일보발행 (Report Issuance)
    const handleIssueReport = async () => {
        if (selectedJobIds.size === 0) {
            alert('발행할 작업지시서를 선택해주세요.');
            return;
        }

        if (!confirm(`선택한 ${selectedJobIds.size}건의 작업에 대해 작업일보와 감리일보를 발행하시겠습니까?`)) return;

        try {
            const jobsToIssue = jobOrders.filter(j => selectedJobIds.has(j.id));
            
            for (const job of jobsToIssue) {
                const baseData = {
                    jobOrderId: job.id,
                    processId: job.processId || null, // 공정 ID 보존
                    title: job.title,
                    date: job.date,
                    location: job.location,
                    process: job.process,
                    status: '작성대기',
                    createdAt: serverTimestamp()
                };

                // 작업일보 생성
                await addDoc(collection(db, 'work_reports'), baseData);
                // 감리일보 생성
                await addDoc(collection(db, 'supervision_reports'), baseData);
            }

            setSelectedJobIds(new Set());
            alert('작업일보 및 감리일보 리스트가 생성되었습니다.');
            setActiveTab('work_report'); // 작업일보 탭으로 이동
        } catch (error) {
            console.error('Report issuance error:', error);
            alert('일보 발행 중 오류가 발생했습니다.');
        }
    };

    // 체크박스 토글
    const toggleJobSelection = (id: string) => {
        setSelectedJobIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllJobs = () => {
        if (selectedJobIds.size === jobOrders.length) {
            setSelectedJobIds(new Set());
        } else {
            setSelectedJobIds(new Set(jobOrders.map(j => j.id)));
        }
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-4">🏠 홈 / <span className="text-gray-800 font-medium font-bold">공정관리</span></div>

            {/* 헤더 및 기능 버튼 */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-[#1E293B]">공정관리 시스템</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">작업지시 및 일보 통합 관리 (V2)</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowJobModal(true)}
                        className="px-6 py-3 bg-[#2563EB] text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                        <span>📝</span> 작업발행
                    </button>
                    {activeTab === 'job_order' && (
                        <button 
                            onClick={handleIssueReport}
                            className="px-6 py-3 bg-[#059669] text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center gap-2"
                        >
                            <span>📄</span> 일보발행
                        </button>
                    )}
                </div>
            </div>

            {/* 탭 메뉴 */}
            <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl overflow-hidden">
                {[
                    { id: 'job_order', label: '작업지시서', icon: '📋' },
                    { id: 'work_report', label: '작업일보', icon: '👷' },
                    { id: 'supervision_report', label: '감리일보', icon: '🔍' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                            activeTab === tab.id 
                            ? 'text-[#2563EB] border-b-2 border-[#2563EB] bg-blue-50/50' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <span className="text-lg">{tab.icon}</span>
                        {tab.label}
                        {tab.id === 'job_order' && jobOrders.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px]">{jobOrders.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* 리스트 섹션 */}
            <div className="bg-white rounded-b-xl shadow-sm border border-slate-100 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-slate-400 font-medium">데이터를 불러오는 중입니다...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left bg-white">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    {activeTab === 'job_order' && (
                                        <th className="py-4 px-6 w-12 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300"
                                                checked={selectedJobIds.size === jobOrders.length && jobOrders.length > 0}
                                                onChange={toggleAllJobs}
                                            />
                                        </th>
                                    )}
                                    <th className="py-4 px-6 text-sm font-bold text-slate-600">제 목 (작업정보)</th>
                                    <th className="py-4 px-6 text-sm font-bold text-slate-600">날 짜</th>
                                    <th className="py-4 px-6 text-sm font-bold text-slate-600">위치 / 공정</th>
                                    <th className="py-4 px-6 text-sm font-bold text-center text-slate-600">상태 / 진도율</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTab === 'job_order' && (
                                    <>
                                        {jobOrders.length === 0 ? <EmptyRow span={5} /> : jobOrders.map(job => (
                                            <tr key={job.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition group">
                                                <td className="py-4 px-6 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-slate-300"
                                                        checked={selectedJobIds.has(job.id)}
                                                        onChange={() => toggleJobSelection(job.id)}
                                                    />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-blue-600 mb-0.5">#{job.jobNo}</span>
                                                        <span className="text-sm font-bold text-slate-800">{job.title}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-sm font-medium text-slate-600">{job.date}</td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">📍 {job.location}</span>
                                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">⚙️ {job.process}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            job.rate === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>{job.status}</span>
                                                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-blue-600 h-full transition-all" style={{ width: `${job.rate}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400">{job.rate}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}

                                {activeTab === 'work_report' && (
                                    <>
                                        {workReports.length === 0 ? <EmptyRow span={4} /> : workReports.map(report => (
                                            <tr key={report.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition cursor-pointer" onClick={() => handleReportClick(report)}>
                                                <td className="py-4 px-6">
                                                    <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                        <span className="text-emerald-500">📄</span> {report.title}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-sm font-medium text-slate-600">{report.date}</td>
                                                <td className="py-4 px-6">
                                                    <div className="text-xs font-medium text-slate-500">📍 {report.location} | {report.process}</div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                                                            report.status === '작성완료' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>{report.status}</span>
                                                        {report.documentId && (
                                                            <button 
                                                                onClick={(e) => handleSync(e, report)}
                                                                className="p-1.5 hover:bg-emerald-100 rounded-md text-emerald-600 transition"
                                                                title="구글 독스 데이터 동기화"
                                                            >🔄</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}

                                {activeTab === 'supervision_report' && (
                                    <>
                                        {supervisionReports.length === 0 ? <EmptyRow span={4} /> : supervisionReports.map(report => (
                                            <tr key={report.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition cursor-pointer" onClick={() => handleReportClick(report)}>
                                                <td className="py-4 px-6">
                                                    <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                        <span className="text-blue-500">🔍</span> {report.title}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-sm font-medium text-slate-600">{report.date}</td>
                                                <td className="py-4 px-6">
                                                    <div className="text-xs font-medium text-slate-500">📍 {report.location} | {report.process}</div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                                                            report.status === '작성완료' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>{report.status}</span>
                                                        {report.documentId && (
                                                            <button 
                                                                onClick={(e) => handleSync(e, report)}
                                                                className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition"
                                                                title="구글 독스 데이터 동기화"
                                                            >🔄</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 작업발행 모달 */}
            {showJobModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">📝 신규 작업 발행</h2>
                            <button onClick={() => setShowJobModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">작업 날짜</label>
                                <input 
                                    type="date" 
                                    value={jobDate} 
                                    onChange={e => setJobDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">작업 위치</label>
                                <input 
                                    type="text" 
                                    value={jobLocation}
                                    onChange={e => setJobLocation(e.target.value)}
                                    placeholder="기지국 옥탑 A구역 등"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">작업 공정</label>
                                <select 
                                    value={jobProcessId}
                                    onChange={e => setJobProcessId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold cursor-pointer"
                                >
                                    <option value="">공정을 선택하세요</option>
                                    {availableProcesses.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 ml-1">※ &apos;양식 관리&apos;에서 등록한 공정이 나타납니다.</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">담당자</label>
                                <input 
                                    type="text" 
                                    value={jobManager}
                                    onChange={e => setJobManager(e.target.value)}
                                    placeholder="홍길동"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowJobModal(false)} className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors">취소</button>
                            <button 
                                onClick={handleIssueJob}
                                className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                            >저장 및 발행</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 일보 발행 구글 독스 모달 */}
            {selectedReport && (
                <GDocDynamicModal
                    isOpen={showReportGDocModal}
                    onClose={() => {
                        setShowReportGDocModal(false);
                        setSelectedReport(null);
                    }}
                    onSave={handleReportSave}
                    documentType={activeTab}
                    prefillData={{
                        date: selectedReport.date,
                        location: selectedReport.location,
                        work_type: selectedReport.process,
                        title: selectedReport.title
                    }}
                />
            )}
        </DashboardLayout>
    );
}

function EmptyRow({ span }: { span: number }) {
    return (
        <tr>
            <td colSpan={span} className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl filter grayscale">📂</span>
                    <p className="text-slate-400 font-bold text-sm">등록된 리스트가 없습니다.</p>
                </div>
            </td>
        </tr>
    );
}
