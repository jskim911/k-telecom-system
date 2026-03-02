"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
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
}

const defaultInspections: Omit<Inspection, 'id'>[] = [
    { inspId: 'INS-001', name: '자재 검수', location: '현장 자재 창고', date: '2024-03-28', inspector: '감리단장', status: 'Approved' },
    { inspId: 'INS-002', name: '관로 매설 깊이 검측', location: 'A구역 2번 맨홀', date: '2024-04-02', inspector: '김감리', status: 'Rejected' },
    { inspId: 'INS-003', name: '통신 랙 접지 저항 측정', location: 'MDF실', date: '2024-04-05', inspector: '이감리', status: 'Pending' },
];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'Approved': 'bg-green-100 text-green-700',
        'Rejected': 'bg-red-100 text-red-700',
        'Pending': 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`text-xs font-bold px-3 py-1 rounded-full ${map[status] || ''}`}>{status}</span>;
}

export default function QualityPage() {
    const [items, setItems] = useState<Inspection[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [formId, setFormId] = useState('');
    const [formName, setFormName] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formInspector, setFormInspector] = useState('');

    const colRef = collection(db, 'inspections');

    useEffect(() => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleAdd = async () => {
        await addDoc(colRef, {
            inspId: formId,
            name: formName,
            location: formLocation,
            date: formDate,
            inspector: formInspector,
            status: 'Pending',
        });
        setShowModal(false);
        setFormId(''); setFormName(''); setFormLocation(''); setFormDate(''); setFormInspector('');
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Quality</span></div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">품질/검측 관리</h1>
                    <p className="text-sm text-gray-500">현장 검측 요청 내역 및 승인 프로세스</p>
                </div>
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">📋 검측 요청서 작성</button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-mono">{item.inspId}</span>
                                <StatusBadge status={item.status} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">• {item.location}</p>
                            <div className="flex justify-between text-xs text-gray-400 mb-4">
                                <span>요청일자: {item.date}</span>
                                <span>검측관: {item.inspector}</span>
                            </div>
                            {item.status === 'Pending' ? (
                                <div className="flex gap-2">
                                    <button onClick={() => handleReject(item)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-red-600 font-medium hover:bg-red-50 transition">❌ 반려</button>
                                    <button onClick={() => handleApprove(item)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">✅ 승인</button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <p className="flex-1 text-center text-xs text-gray-400 py-2">처리 완료</p>
                                    <button onClick={() => handleDelete(item)} className="text-xs text-red-400 hover:text-red-600 px-2">삭제</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 검측 요청서 작성 모달 */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">📋 검측 요청서 작성</h2>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">검측 ID</label>
                                    <input value={formId} onChange={(e) => setFormId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="INS-004" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">검측관</label>
                                    <input value={formInspector} onChange={(e) => setFormInspector(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="김감리" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">검측명</label>
                                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="배관 압력 시험" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">검측 위치</label>
                                <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="B구역 3번 맨홀" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">요청일자</label>
                                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">취소</button>
                            <button onClick={handleAdd} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">요청서 제출</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
