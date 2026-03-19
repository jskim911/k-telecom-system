"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, doc, onSnapshot, query, orderBy, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import GDocDynamicModal from '@/components/GDocDynamicModal';
import { insertSignature } from '@/lib/gdoc-client';

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
    gdocUrl?: string; // 생성된 문서 URL
    documentId?: string;
    formData?: Record<string, string>;
}

interface UserProfile {
    uid: string;
    name: string;
    pin: string;
    signatureUrl: string;
    role: string;
}

const tabs = [
    { id: 'log', label: '수발송 대장', icon: '📋' },
    { id: 'approval', label: '전자 결재', icon: '🖋️' },
    { id: 'templates', label: '스마트문서함', icon: '🗂️' },
    { id: 'create', label: '신규문서작성', icon: '➕' },
];

// 표준 양식용 구글 독합 템플릿 ID (관공서 표준 서식)
const STANDARD_TEMPLATES = {
    '공문': 'https://docs.google.com/document/d/15bWsLdtP0U_6VcO-dqTR04pfCns812LCD-2McEhaMMQ/edit',
    '현장지시서': 'https://docs.google.com/document/d/1lispaf_vQT-_OravoQD5eBanbHWSw649qjpwEvg0mvE/edit',
    '보고서': 'https://docs.google.com/document/d/1WR-TbkXpOKMvlzJnGsSQkQNPWt28y55FFd31WlvsH30/edit'
};

export default function SmartApprovalPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('log');
    const [subTab, setSubTab] = useState<'standard' | 'output'>('standard');
    const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGDocModal, setShowGDocModal] = useState(false);
    
    // 유저 및 PIN 관련 상태
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pendingItem, setPendingItem] = useState<Transmittal | null>(null);

    // 모달용 상태
    const [modalConfig, setModalConfig] = useState<{
        type: '공문' | '현장지시서' | '보고서';
        prefill?: Record<string, string>;
        url?: string;
    }>({ type: '공문' });

    const colRef = collection(db, 'transmittals');

    useEffect(() => {
        // 1. 문서 목록 실시간 감시
        const q = query(colRef, orderBy('createdAt', 'desc'));
        const unsubDocs = onSnapshot(q, (snap) => {
            setTransmittals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transmittal)));
            setLoading(false);
        });

        // 2. 현재 로그인 사용자 정보 가져오기 (PIN 및 서명 이미지 확보용)
        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserProfile({ uid: user.uid, ...userDoc.data() } as UserProfile);
                }
            }
        });

        return () => { unsubDocs(); unsubAuth(); };
    }, []);

    const generateDocNo = (type: string) => {
        const year = new Date().getFullYear();
        const seq = String(transmittals.length + 1).padStart(3, '0');
        const typeCode = type === '공문' ? 'OFF' : type === '현장지시서' ? 'FLD' : 'REP';
        return `K-TEL-${typeCode}-${year}-${seq}`;
    };

    // GDocDynamicModal에서 호출될 저장 콜백
    const handleGDocSave = async (data: Record<string, string>) => {
        try {
            const docNo = generateDocNo(modalConfig.type);
            const docRef = await addDoc(collection(db, 'transmittals'), {
                docNo,
                title: data.title || '새 문서',
                type: modalConfig.type,
                sender: '김정수 (관리자)',
                recipient: '한국전력공사', // 샘플 데이터
                status: 'Draft',
                currentStep: 'Submitter',
                approvalLine: {
                    submitter: '김정수',
                    reviewer: '박검토',
                    approver: '이승인'
                },
                createdAt: new Date(),
                gdocUrl: data.gdocUrl,
                documentId: data.documentId,
                formData: data
            });

            // 생성 후 즉시 워크숍(편집기)으로 이동
            setShowGDocModal(false);
            router.push(`/documents/workshop/${docRef.id}`);
        } catch (err) {
            console.error('문서 저장 실패:', err);
            alert('DB 저장 실패');
        }
    };

    //--- 결재 처리 로직 (고도화) ---

    const startApproval = (t: Transmittal) => {
        setPendingItem(t);
        setPinInput("");
        setShowPinModal(true);
    };

    const handlePinSubmit = async () => {
        if (!userProfile || !pendingItem) return;

        if (pinInput !== userProfile.pin) {
            alert("결재 PIN 번호가 일치하지 않습니다.");
            setPinInput("");
            return;
        }

        setShowPinModal(false);
        await handleApproveFinal(pendingItem);
    };

    // 1. 승인 처리: 상태 변경 + 디지털 서명 이미지 삽입
    const handleApproveFinal = async (t: Transmittal) => {
        try {
            // Firestore 상태 업데이트
            const docRef = doc(db, 'transmittals', t.id);
            await updateDoc(docRef, { status: 'Approved' });

            // 구글 독스 본문에 서명 이미지 삽입 시도
            if (t.documentId && userProfile?.signatureUrl) {
                // 실제 사용자의 서명 이미지 사용
                await insertSignature(t.documentId, '{{서명}}', userProfile.signatureUrl);
                alert(`[${t.title}] 승인이 완료되었습니다. 실시간 서명이 날인되었습니다.`);
            } else {
                alert('승인되었습니다. (서명 이미지가 설정되지 않아 날인은 생략되었습니다)');
            }
        } catch (err: any) {
            console.error('승인 처리 중 오류:', err);
            alert('승인 처리 실패: ' + err.message);
        }
    };

    // 2. 반려 처리
    const handleReject = async (t: Transmittal) => {
        if (!confirm('문서를 반려하시겠습니까?')) return;
        try {
            const docRef = doc(db, 'transmittals', t.id);
            await updateDoc(docRef, { status: 'Rejected' });
            alert('반려 처리되었습니다.');
        } catch (err: any) {
            alert('반려 실패: ' + err.message);
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
                            <tr key={t.id} className="hover:bg-gray-50/50 transition">
                                <td className="py-4 px-6">
                                    <button 
                                        onClick={() => router.push(`/documents/workshop/${t.id}`)}
                                        className="font-black text-indigo-600 hover:underline text-left"
                                    >
                                        {t.docNo}
                                    </button>
                                </td>
                                <td className="py-4 px-6">
                                    <button 
                                        onClick={() => router.push(`/documents/workshop/${t.id}`)}
                                        className="hover:underline text-left"
                                    >
                                        {t.title}
                                    </button>
                                </td>
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
                                    {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '2026. 3. 19.'}
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
                {transmittals.filter(t => t.status === 'Pending').map(t => (
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
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => t.gdocUrl && window.open(t.gdocUrl, '_blank')}
                                className="px-5 py-3 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition shadow-sm border border-gray-100"
                            >
                                미리보기
                            </button>
                            <button 
                                onClick={() => handleReject(t)}
                                className="px-5 py-3 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition border border-red-100"
                            >
                                반려
                            </button>
                            <button 
                                onClick={() => startApproval(t)}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                            >
                                승인
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTemplatesTab = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 서브 탭 (표준양식함 / 출력문서함) */}
            <div className="flex gap-4 border-b border-gray-100 pb-1">
                <button 
                    onClick={() => setSubTab('standard')}
                    className={`pb-3 px-2 text-sm font-black transition-all relative ${subTab === 'standard' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    표준양식함
                    {subTab === 'standard' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                </button>
                <button 
                    onClick={() => setSubTab('output')}
                    className={`pb-3 px-2 text-sm font-black transition-all relative ${subTab === 'output' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    출력문서함
                    {subTab === 'output' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                </button>
            </div>

            {subTab === 'standard' ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h2 className="text-lg font-black text-gray-800">표준 양식 리스트</h2>
                        <p className="text-xs text-gray-400 mt-1 font-bold">공식 업무에 사용되는 표준 서식 파일들입니다.</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[
                            { type: '공문', title: '[표준] 관공서식 공문 양식_K-TEL', icon: '📄', url: STANDARD_TEMPLATES['공문'] },
                            { type: '현장지시서', title: '[표준] 관공서식 현장지시서_K-TEL', icon: '📄', url: STANDARD_TEMPLATES['현장지시서'] },
                            { type: '보고서', title: '[표준] 관공서식 보고서_K-TEL', icon: '📄', url: STANDARD_TEMPLATES['보고서'] },
                        ].map((tmpl, i) => (
                            <button 
                                key={i} 
                                onClick={() => tmpl.url && window.open(tmpl.url, '_blank')}
                                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition group"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition shadow-inner">
                                        {tmpl.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-800 text-sm">{tmpl.title}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{tmpl.type} 표준 서식</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(tmpl.url, '_blank');
                                        }}
                                        className="text-[10px] font-black text-gray-400 hover:text-gray-600 transition"
                                    >
                                        양식 보기
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setModalConfig({ type: tmpl.type as any, url: tmpl.url });
                                            setShowGDocModal(true);
                                        }}
                                        className="text-[10px] font-black text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                                    >
                                        작성하기
                                    </button>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h2 className="text-lg font-black text-gray-800">문서 출력 보관소 (Archives)</h2>
                        <p className="text-xs text-gray-400 mt-1 font-bold">이미 작성 및 출력된 모든 문서를 날짜순으로 관리합니다.</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {transmittals.length > 0 ? (
                            transmittals.map((t, i) => (
                                <div key={t.id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition group border-l-4 border-l-transparent hover:border-l-indigo-500">
                                    <div className="flex items-center gap-6 flex-1">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg shadow-inner group-hover:bg-indigo-50 transition">📄</div>
                                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-tight">
                                                    {t.docNo}
                                                </span>
                                                <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">
                                                    {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '2026.03.19'}
                                                </span>
                                                <h4 className="font-black text-gray-800 text-sm truncate max-w-md">{t.title}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => t.gdocUrl && window.open(t.gdocUrl, '_blank')}
                                            className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black hover:bg-slate-100 transition border border-gray-100"
                                        >
                                            문서 열기
                                        </button>
                                        <button 
                                            onClick={() => router.push(`/documents/workshop/${t.id}`)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                                        >
                                            편집/서명
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-20 text-center text-gray-300 font-bold">출력된 문서가 없습니다.</div>
                        )}
                    </div>
                </div>
            )}
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
                            onClick={() => {
                                if (tab.id === 'create') {
                                    setActiveTab('templates');
                                    setSubTab('standard');
                                } else {
                                    setActiveTab(tab.id);
                                }
                            }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                (activeTab === tab.id || (tab.id === 'create' && activeTab === 'templates' && subTab === 'standard')) 
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

            {/* 구글 독스 동적 매핑 모달 */}
            <GDocDynamicModal 
                isOpen={showGDocModal}
                onClose={() => setShowGDocModal(false)}
                onSave={handleGDocSave}
                documentType={modalConfig.type}
                prefillData={modalConfig.prefill}
                initialDocUrl={modalConfig.url}
            />

            {/* 🔒 결재 PIN 입력 모달 */}
            {showPinModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-10 border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-4xl mb-6 mx-auto shadow-inner">🔒</div>
                            <h3 className="text-2xl font-black text-gray-900">결재 PIN 인증</h3>
                            <p className="text-sm text-gray-400 mt-2 font-bold leading-relaxed">회원가입 시 등록한<br/>4자리 결재 비밀번호를 입력해주세요.</p>
                        </div>
                        
                        <div className="flex justify-center gap-3 mb-10">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${pinInput.length > i ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 bg-gray-50'}`}>
                                    {pinInput.length > i ? '●' : ''}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map(key => (
                                <button
                                    key={key.toString()}
                                    onClick={() => {
                                        if (key === 'C') setPinInput("");
                                        else if (key === '←') setPinInput(p => p.slice(0, -1));
                                        else if (pinInput.length < 4) setPinInput(p => p + key);
                                    }}
                                    className="h-14 rounded-2xl bg-gray-50 text-gray-800 text-lg font-black hover:bg-gray-100 active:scale-95 transition"
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowPinModal(false)}
                                className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handlePinSubmit}
                                disabled={pinInput.length !== 4}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50"
                            >
                                결재 승인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
