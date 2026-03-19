"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { insertSignature } from '@/lib/gdoc-client';

interface Transmittal {
    id: string;
    docNo: string;
    title: string;
    status: string;
    gdocUrl?: string;
    documentId?: string;
    sender: string;
    recipient: string;
}

interface UserProfile {
    uid: string;
    name: string;
    pin: string;
    signatureUrl: string;
    role: string;
}

export default function DocumentWorkshop() {
    const { id } = useParams();
    const router = useRouter();
    const [docData, setDocData] = useState<Transmittal | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [showPinModal, setShowPinModal] = useState(false);
    const [pendingRole, setPendingRole] = useState<'입안' | '검토' | '승인' | null>(null);

    useEffect(() => {
        if (!id) return;

        const unsub = onSnapshot(doc(db, 'transmittals', id as string), (docSnap) => {
            if (docSnap.exists()) {
                setDocData({ id: docSnap.id, ...docSnap.data() } as Transmittal);
            }
            setLoading(false);
        });

        const authUnsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserProfile({ uid: user.uid, ...userDoc.data() } as UserProfile);
                }
            }
        });

        return () => {
            unsub();
            authUnsub();
        };
    }, [id]);

    const handleSignRequest = (role: '입안' | '검토' | '승인') => {
        setPendingRole(role);
        setPinInput('');
        setShowPinModal(true);
    };

    const handlePinSubmit = async () => {
        if (!userProfile || !docData || !pendingRole) return;

        if (pinInput !== userProfile.pin) {
            alert('PIN 번호가 일치하지 않습니다.');
            return;
        }

        setSigning(true);
        setShowPinModal(false);

        try {
            const tag = `{{${pendingRole}서명}}`;
            if (docData.documentId && userProfile.signatureUrl) {
                await insertSignature(docData.documentId, tag, userProfile.signatureUrl);
                
                // 해당 역할의 서명 완료 상태 업데이트 (필요시 Firestore에도 기록)
                // 예: const roleKey = pendingRole === '입안' ? 'submitterSigned' : ...
                
                alert(`[${pendingRole}] 서명이 완료되었습니다.`);
            } else {
                alert('문서 ID 또는 서명 이미지가 없습니다.');
            }
        } catch (err: any) {
            console.error('서명 중 오류:', err);
            alert('서명 처리 실패: ' + err.message);
        } finally {
            setSigning(false);
        }
    };

    if (loading) return <div className="p-10 text-center">불러오는 중...</div>;
    if (!docData) return <div className="p-10 text-center">문서를 찾을 수 없습니다.</div>;

    // 구글 독스 편집 URL (임베드용)
    const embedUrl = docData.gdocUrl ? docData.gdocUrl.replace('/edit', '/edit?rm=minimal') : '';

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-120px)] gap-6">
                {/* 상단 툴바 */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-lg font-black text-gray-800">{docData.title}</h2>
                            <p className="text-xs text-gray-400 font-bold">{docData.docNo} | {docData.status}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleSignRequest('입안')}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-200 transition"
                        >
                            입안자 서명
                        </button>
                        <button 
                            onClick={() => handleSignRequest('검토')}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-200 transition"
                        >
                            검토자 서명
                        </button>
                        <button 
                            onClick={() => handleSignRequest('승인')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                        >
                            최종 승인/서명
                        </button>
                    </div>
                </div>

                {/* 메인 작업 영역: 구글 독스 임베드 */}
                <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
                    {embedUrl ? (
                        <iframe 
                            src={embedUrl}
                            className="w-full h-full border-none"
                            allow="autoplay"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-center items-center justify-center text-gray-400 font-bold">
                            문서 URL이 올바르지 않습니다.
                        </div>
                    )}

                    {signing && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
                                <p className="font-black text-indigo-600">서명 날인 중...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PIN 입력 모달 (재사용 가능하도록 추출하는 게 좋으나 우선 로컬에 구현) */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-gray-800">[{pendingRole}] 서명 인증</h3>
                            <p className="text-sm text-gray-400 font-bold">결재 비밀번호(PIN) 4자리를 입력하세요</p>
                        </div>
                        
                        <div className="flex justify-center gap-3">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pinInput.length > i ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-gray-100 text-gray-300'}`}>
                                    {pinInput.length > i ? '●' : ''}
                                </div>
                            ))}
                        </div>
                        
                        <input 
                            type="password" 
                            maxLength={4}
                            autoFocus
                            value={pinInput}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setPinInput(val);
                                if (val.length === 4) {
                                    // 딜레이를 약간 주어 마지막 점이 보이는 효과
                                    setTimeout(() => {}, 100);
                                }
                            }}
                            className="opacity-0 absolute -z-10"
                        />
                        
                        <button 
                            onClick={handlePinSubmit}
                            disabled={pinInput.length !== 4}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            서명 완료
                        </button>
                        <button onClick={() => setShowPinModal(false)} className="text-sm text-gray-400 font-bold hover:text-gray-600 underline">취소</button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
