"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import GDocDynamicModal from '@/components/GDocDynamicModal'; // 추가
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Inspection {
    id: string;
    inspId: string;
    name: string;
    location: string;
    date: string;
    inspector: string;
    status: string;
    gdocUrl?: string;
}

const defaultInspections: Omit<Inspection, 'id'>[] = [
    { inspId: 'INS-001', name: '자재 검수', location: '현장 자재 창고', date: '2024-03-28', inspector: '감리단장', status: 'Approved' },
    { inspId: 'INS-002', name: '관로 매설 깊이 검측', location: 'A구역 2번 맨홀', date: '2024-04-02', inspector: '김감리', status: 'Rejected' },
    { inspId: 'INS-003', name: '통신 랙 접지 저항 측정', location: 'MDF실', date: '2024-04-05', inspector: '이감리', status: 'Pending' },
];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'Approved': 'bg-green-100 text-green-700 font-bold border-green-200',
        'Rejected': 'bg-red-100 text-red-700 font-bold border-red-200',
        'Pending': 'bg-yellow-100 text-yellow-700 font-bold border-yellow-200',
    };
    return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${map[status] || ''}`}>{status}</span>;
}

export default function QualityPage() {
    const [items, setItems] = useState<Inspection[]>([]);
    const [showGDocModal, setShowGDocModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<Inspection | null>(null);
    const [gdocForceGenerate, setGDocForceGenerate] = useState(false);

    const colRef = collection(db, 'inspections');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const wbs = searchParams.get('wbs');
            if (wbs) {
                const name = searchParams.get('name') || '';
                const loc = searchParams.get('location') || '';
                
                // 신규 작성을 위해 모달 오픈
                setSelectedItem(null);
                setGDocForceGenerate(false);
                setShowGDocModal(true);
                window.history.replaceState(null, '', '/quality');
            }
        }

        const q = query(colRef, orderBy('inspId'));
        const unsub = onSnapshot(q, (snap) => {
            if (snap.empty) {
                defaultInspections.forEach((item) => addDoc(colRef, item));
                return;
            }
            setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inspection)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleApprove = async (item: Inspection) => {
        await updateDoc(doc(db, 'inspections', item.id), { status: 'Approved' });
    };

    const handleReject = async (item: Inspection) => {
        await updateDoc(doc(db, 'inspections', item.id), { status: 'Rejected' });
    };

    const handleDelete = async (item: Inspection) => {
        if (!confirm(`"${item.name}" 검측 요청을 삭제하시겠습니까?`)) return;
        await deleteDoc(doc(db, 'inspections', item.id));
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">
                <Link href="/" className="hover:text-blue-600 transition-colors">🏠 홈</Link> / <span className="text-gray-800 font-medium">Quality</span>
            </div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">품질/검측 관리</h1>
                    <p className="text-sm text-gray-500">현장 검측 요청 내역 및 승인 프로세스</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedItem(null); setGDocForceGenerate(false); setShowGDocModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">📋 검측 요청서 작성</button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <div 
                            key={item.id} 
                            className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group ${selectedItem?.id === item.id ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`} 
                            onClick={() => { setSelectedItem(item); setGDocForceGenerate(false); setShowGDocModal(true); }}
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 bg-white/90 backdrop-blur-md rounded-bl-xl border-l border-b border-gray-100 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                {item.gdocUrl ? (
                                    <>
                                        <a href={item.gdocUrl} target="_blank" rel="noopener noreferrer" title="독스 열기" className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-xs">🌐</a>
                                        <a href={`https://docs.google.com/document/d/${item.gdocUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]}/export?format=pdf`} title="PDF 다운로드" className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-xs">📥</a>
                                    </>
                                ) : (
                                    <button onClick={() => { setSelectedItem(item); setGDocForceGenerate(true); setShowGDocModal(true); }} className="text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-1">📄 출력</button>
                                )}
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] tracking-tighter bg-gray-50 text-gray-400 px-2 py-1 rounded-md font-mono border border-gray-100">{item.inspId}</span>
                                <StatusBadge status={item.status} />
                            </div>
                            <h3 className="text-lg font-black text-gray-800 mb-2 leading-tight">{item.name}</h3>
                            <div className="flex items-start gap-2 mb-6">
                                <span className="text-gray-400 text-xs">📍</span>
                                <p className="text-xs text-gray-500 font-medium">{item.location}</p>
                            </div>
                            <div className="flex justify-between items-center py-3 border-t border-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">
                                <div className="flex flex-col">
                                    <span className="opacity-50">DATE</span>
                                    <span className="text-gray-600">{item.date}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="opacity-50">INSPECTOR</span>
                                    <span className="text-gray-600">{item.inspector}</span>
                                </div>
                            </div>
                            {item.status === 'Pending' ? (
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleReject(item); }} className="flex-1 py-2.5 border border-red-100 rounded-xl text-xs text-red-600 font-bold hover:bg-red-50 transition uppercase tracking-wider">Reject</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleApprove(item); }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 uppercase tracking-wider">Approve</button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 font-black flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
                                        COMPLETED
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="text-[10px] font-black text-red-300 hover:text-red-500 transition-colors uppercase">Delete</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 구글 독스 모달 */}
            <GDocDynamicModal 
                isOpen={showGDocModal} 
                onClose={() => setShowGDocModal(false)}
                prefillData={selectedItem ? {
                    inspId: selectedItem.inspId,
                    name: selectedItem.name,
                    location: selectedItem.location,
                    date: selectedItem.date,
                    inspector: selectedItem.inspector,
                    status: selectedItem.status,
                } : undefined}
                onSave={async (data) => {
                    if (selectedItem) {
                        const { gdocUrl, ...rest } = data;
                        await updateDoc(doc(db, 'inspections', selectedItem.id), {
                            ...rest,
                            gdocUrl: gdocUrl || null,
                        });
                    }
                }}
                documentType="quality"
                forceGenerate={gdocForceGenerate}
            />
        </DashboardLayout>
    );
}
