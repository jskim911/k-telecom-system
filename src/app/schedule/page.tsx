"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface WbsItem {
    id: string;
    wbs: string;
    name: string;
    startDate: string;
    endDate: string;
    manager: string;
    status: string;
    rate: number;
}

const defaultData: Omit<WbsItem, 'id'>[] = [
    { wbs: 'WBS-100', name: '기반 시설 공사 (전체)', startDate: '2024-03-01', endDate: '2024-04-10', manager: '김현장', status: 'In Progress', rate: 92 },
    { wbs: 'WBS-101', name: '↳ 현장 사무소 개설 및 인허가', startDate: '2024-03-01', endDate: '2024-03-15', manager: '김철수', status: 'Completed', rate: 100 },
    { wbs: 'WBS-102', name: '↳ 기초 맨홀 터파기 및 관로 포설', startDate: '2024-03-16', endDate: '2024-04-10', manager: '이영희', status: 'In Progress', rate: 85 },
    { wbs: 'WBS-200', name: '통신 설비 구축 (전체)', startDate: '2024-04-05', endDate: '2024-04-30', manager: '김현장', status: 'In Progress', rate: 13 },
    { wbs: 'WBS-201', name: '↳ 통신 장비실 랙 설치', startDate: '2024-04-05', endDate: '2024-04-15', manager: '최민수', status: 'Delayed', rate: 40 },
    { wbs: 'WBS-202', name: '↳ 광케이블 접속 및 성단', startDate: '2024-04-11', endDate: '2024-04-20', manager: '박준형', status: 'Planned', rate: 0 },
];

const statusOptions = ['In Progress', 'Completed', 'Delayed', 'Planned'];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
        'Completed': 'bg-green-100 text-green-700 border-green-200',
        'Delayed': 'bg-red-100 text-red-700 border-red-200',
        'Planned': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${map[status] || ''}`}>{status}</span>;
}

export default function SchedulePage() {
    const [items, setItems] = useState<WbsItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<WbsItem | null>(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formWbs, setFormWbs] = useState('');
    const [formName, setFormName] = useState('');
    const [formStart, setFormStart] = useState('');
    const [formEnd, setFormEnd] = useState('');
    const [formManager, setFormManager] = useState('');
    const [formStatus, setFormStatus] = useState('Planned');
    const [formRate, setFormRate] = useState(0);

    const colRef = collection(db, 'schedules');

    useEffect(() => {
        const q = query(colRef, orderBy('wbs'));
        const unsub = onSnapshot(q, (snap) => {
            if (snap.empty) {
                // 초기 데이터가 없으면 기본 데이터 seed
                defaultData.forEach((item) => addDoc(colRef, item));
                return;
            }
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WbsItem));
            setItems(data);
            setLoading(false);
        });
        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetForm = () => {
        setFormWbs(''); setFormName(''); setFormStart(''); setFormEnd('');
        setFormManager(''); setFormStatus('Planned'); setFormRate(0);
        setEditItem(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (item: WbsItem) => {
        setEditItem(item);
        setFormWbs(item.wbs); setFormName(item.name);
        setFormStart(item.startDate); setFormEnd(item.endDate);
        setFormManager(item.manager); setFormStatus(item.status);
        setFormRate(item.rate);
        setShowModal(true);
    };

    const handleSave = async () => {
        const data = { wbs: formWbs, name: formName, startDate: formStart, endDate: formEnd, manager: formManager, status: formStatus, rate: Number(formRate) };
        if (editItem) {
            await updateDoc(doc(db, 'schedules', editItem.id), data);
        } else {
            await addDoc(colRef, data);
        }
        setShowModal(false);
        resetForm();
    };

    const handleDelete = async () => {
        if (selected.size === 0) return alert('삭제할 항목을 선택하세요.');
        if (!confirm(`${selected.size}건을 삭제하시겠습니까?`)) return;
        const promises = Array.from(selected).map((id) => deleteDoc(doc(db, 'schedules', id)));
        await Promise.all(promises);
        setSelected(new Set());
    };

    const handleEditSelected = () => {
        if (selected.size !== 1) return alert('수정할 항목을 1건만 선택하세요.');
        const id = Array.from(selected)[0];
        const item = items.find((i) => i.id === id);
        if (item) openEditModal(item);
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === items.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(items.map((i) => i.id)));
        }
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Schedule</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">공정 관리</h1>
                    <p className="text-sm text-gray-500">WBS 기반 전체 공정 현황 및 진도율 관리</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleEditSelected} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">✏️ 수정</button>
                    <button onClick={handleDelete} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition text-red-600">🗑 삭제</button>
                    <button onClick={openAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">+ 공정 추가</button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <th className="py-3 px-4 text-left w-8"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} /></th>
                                <th className="py-3 px-4 text-left">WBS 코드</th>
                                <th className="py-3 px-4 text-left">공종명</th>
                                <th className="py-3 px-4 text-left">기간</th>
                                <th className="py-3 px-4 text-left">담당자</th>
                                <th className="py-3 px-4 text-center">상태</th>
                                <th className="py-3 px-4 text-right">진도율(%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row) => (
                                <tr key={row.id} className={`border-t border-gray-50 hover:bg-blue-50/30 transition cursor-pointer ${selected.has(row.id) ? 'bg-blue-50' : ''}`} onDoubleClick={() => openEditModal(row)}>
                                    <td className="py-4 px-4"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                                    <td className="py-4 px-4 font-mono text-gray-500">{row.wbs}</td>
                                    <td className="py-4 px-4 font-semibold text-gray-700">{row.name}</td>
                                    <td className="py-4 px-4 text-gray-500 text-xs">{row.startDate}<br />{row.endDate}</td>
                                    <td className="py-4 px-4 text-gray-600">{row.manager}</td>
                                    <td className="py-4 px-4 text-center"><StatusBadge status={row.status} /></td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${row.status === 'Delayed' ? 'bg-red-500' : row.status === 'Completed' ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${row.rate}%` }}></div>
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 w-10 text-right">{row.rate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 추가/수정 모달 */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-[520px] p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">{editItem ? '📝 공정 수정' : '➕ 공정 추가'}</h2>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">WBS 코드</label>
                                    <input value={formWbs} onChange={(e) => setFormWbs(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="WBS-300" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">담당자</label>
                                    <input value={formManager} onChange={(e) => setFormManager(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="김감리" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">공종명</label>
                                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="통신 케이블 포설" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">시작일</label>
                                    <input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">종료일</label>
                                    <input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">상태</label>
                                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">진도율 (%)</label>
                                    <input type="number" min={0} max={100} value={formRate} onChange={(e) => setFormRate(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">취소</button>
                            <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">{editItem ? '수정 완료' : '추가 완료'}</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
