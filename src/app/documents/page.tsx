"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, onSnapshot, query, orderBy, updateDoc, where } from 'firebase/firestore';
import GDocDynamicModal from '@/components/GDocDynamicModal';

// --- Types ---
interface Transmittal {
    id: string;
    docNo: string;
    title: string;
    type: '공문' | '현장지시서' | '보고서';
    sender: string;
    recipient: string;
    status: 'Draft' | 'Pending' | 'Rejected' | 'Approved' | 'Closed';
    currentStep: 'Submitter' | 'Reviewer' | 'Approver';
    approvalLine: {
        submitter: string;
        reviewer: string;
        approver: string;
    };
    createdAt: any;
    gdocUrl?: string;
}

const tabs = [
    { id: 'log', label: '수발송 대장', icon: '📋' },
    { id: 'approval', label: '전자 결재', icon: '🖋️' },
    { id: 'templates', label: '표준 양식함', icon: '📁' },
];

export default function SmartApprovalPage() {
    const [activeTab, setActiveTab] = useState('log');
    const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showGDocModal, setShowGDocModal] = useState(false);

    // Form states for new transmittal
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState<'공문' | '현장지시서' | '보고서'>('공문');
    const [newRecipient, setNewRecipient] = useState('');

    const colRef = collection(db, 'transmittals');

    useEffect(() => {
        const q = query(colRef, orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setTransmittals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transmittal)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const generateDocNo = () => {
        const year = new Date().getFullYear();
        const seq = String(transmittals.length + 1).padStart(3, '0');
        return `K-TEL-${newType === '공문' ? 'OFF' : newType === '현장지시서' ? 'FLD' : 'REP'}-${year}-${seq}`;
    };

    const handleCreate = async () => {
        if (!newTitle || !newRecipient) return alert('제목과 수신처를 입력하세요.');
        
        try {
            await addDoc(colRef, {
                docNo: generateDocNo(),
                title: newTitle,
                type: newType,
                sender: '김현장 (감리원)', // 임시: 현재 로그인 사용자 연동 필요
                recipient: newRecipient,
                status: 'Draft',
                currentStep: 'Submitter',
                approvalLine: {
                    submitter: '김현장',
                    reviewer: '이검토',
                    approver: '박승인'
                },
                createdAt: new Date(),
            });
            setShowNewModal(false);
            setNewTitle('');
            setNewRecipient('');
        } catch (err) {
            alert('생성 실패: ' + err);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Pending': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'Closed': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const renderLogTab = () => (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-800">전체 수발송 이력</h2>
                <button 
                    onClick={() => setShowNewModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition"
                >
                    + 신규 문서 작성
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                            <th className="py-4 px-6 text-left">문서번호</th>
                            <th className="py-4 px-6 text-left">제목</th>
                            <th className="py-4 px-6 text-left">수신/발신</th>
                            <th className="py-4 px-6 text-center">상태</th>
                            <th className="py-4 px-6 text-center">날짜</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                        {transmittals.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50/50 transition cursor-pointer">
                                <td className="py-4 px-6 font-black text-indigo-600">{t.docNo}</td>
                                <td className="py-4 px-6">{t.title}</td>
                                <td className="py-4 px-6 text-xs text-gray-500">
                                    <p>발신: {t.sender}</p>
                                    <p>수신: {t.recipient}</p>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(t.status)}`}>
                                        {t.status}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-center text-xs text-gray-400">
                                    {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '2024-04-17'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderApprovalTab = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2">미결재 문서</h2>
                    <p className="opacity-70 text-sm font-medium">검토 및 승인이 필요한 문서가 {transmittals.filter(t => t.status === 'Pending').length}건 있습니다.</p>
                </div>
                <div className="absolute right-0 bottom-0 p-8 opacity-10 text-[120px] font-black italic select-none">SIGN</div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {transmittals.filter(t => t.status === 'Pending' || t.status === 'Draft').map(t => (
                    <div key={t.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex items-center justify-between group">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black">
                                {t.type === '공문' ? '✉️' : t.type === '현장지시서' ? '📢' : '📊'}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-800">{t.title}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t.docNo}</span>
                                    <span className="text-[10px] text-gray-300">•</span>
                                    <span className="text-[10px] text-gray-400 font-bold">기안자: {t.approvalLine.submitter}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="px-6 py-3 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition">문서 보기</button>
                            <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">승인 하기</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTemplatesTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {[
                { title: '표준 공문 양식', icon: '✉️', desc: '외부 기관 및 업체로 발송하는 공식 문서' },
                { title: '현장 지시서', icon: '📢', desc: '시공사 앞 현장 시정명령 및 지시 사항' },
                { title: '감리 보고서(주간)', icon: '📊', desc: '주간 단위 공정 및 감리 결과 보고' },
            ].map((tmpl, i) => (
                <div key={i} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                    <div>
                        <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-3xl mb-6 shadow-inner group-hover:scale-110 transition">
                            {tmpl.icon}
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">{tmpl.title}</h3>
                        <p className="text-sm text-gray-400 font-medium leading-relaxed">{tmpl.desc}</p>
                    </div>
                    <button className="mt-8 w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition">양식 편집 / 미리보기</button>
                </div>
            ))}
        </div>
    );

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2 font-medium">🏠 홈 / <span className="text-gray-800 font-bold">스마트문서</span></div>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        🖋️ 스마트문서 센터
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">행정 문서 수발송 및 전자 결재 워크플로우</p>
                </div>
                <div className="flex gap-2 bg-gray-100/50 p-1.5 rounded-2xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-[600px]">
                {activeTab === 'log' && renderLogTab()}
                {activeTab === 'approval' && renderApprovalTab()}
                {activeTab === 'templates' && renderTemplatesTab()}
            </div>

            {/* 신규 문서 작성 모달 */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-800">📄 신규 문서 기안</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-2">문서 종류</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['공문', '현장지시서', '보고서'].map(type => (
                                        <button 
                                            key={type}
                                            onClick={() => setNewType(type as any)}
                                            className={`py-3 rounded-xl text-xs font-black transition-all ${newType === type ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1.5">문서 제목</label>
                                <input 
                                    value={newTitle} 
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-bold" 
                                    placeholder="예: OO지역 통신구 공사 시정 지시의 건" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1.5">수신처</label>
                                <input 
                                    value={newRecipient} 
                                    onChange={(e) => setNewRecipient(e.target.value)}
                                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-bold" 
                                    placeholder="예: (주)OO통신 대표" 
                                />
                            </div>
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                <p className="text-[10px] text-indigo-900/60 font-black uppercase tracking-widest mb-3">자동 지정 결재선</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 text-center py-2 bg-white rounded-xl text-[10px] font-black text-gray-800 shadow-sm border border-indigo-50">기안: 김현장</div>
                                    <div className="text-indigo-300">→</div>
                                    <div className="flex-1 text-center py-2 bg-white rounded-xl text-[10px] font-black text-gray-800 shadow-sm border border-indigo-50">검토: 이검토</div>
                                    <div className="text-indigo-300">→</div>
                                    <div className="flex-1 text-center py-2 bg-white rounded-xl text-[10px] font-black text-gray-800 shadow-sm border border-indigo-50">승인: 박승인</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t bg-gray-50/50 flex gap-3">
                            <button onClick={() => setShowNewModal(false)} className="flex-1 py-4 border-2 border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400">Cancel</button>
                            <button onClick={handleCreate} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100">문서 생성 및 기안</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
