"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

interface DailyReport {
    id: string;
    date: string;
    weather: string;
    taskContent: string;
    personnel: string;
    issues: string;
    nextPlan: string;
    status: string;
}

const weatherOptions = ['맑음', '흐림', '비', '눈', '안개'];
const weatherIcons: Record<string, string> = { '맑음': '☀️', '흐림': '⛅', '비': '🌧️', '눈': '❄️', '안개': '🌫️' };

export default function DailyReportPage() {
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<DailyReport | null>(null);

    // Form
    const [formDate, setFormDate] = useState('');
    const [formWeather, setFormWeather] = useState('맑음');
    const [formTask, setFormTask] = useState('');
    const [formPersonnel, setFormPersonnel] = useState('');
    const [formIssues, setFormIssues] = useState('');
    const [formNext, setFormNext] = useState('');

    const colRef = collection(db, 'daily_reports');

    useEffect(() => {
        const q = query(colRef, orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyReport)));
            setLoading(false);
        });
        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetForm = () => {
        setFormDate(''); setFormWeather('맑음'); setFormTask('');
        setFormPersonnel(''); setFormIssues(''); setFormNext('');
        setEditItem(null);
    };

    const openAdd = () => { resetForm(); setShowModal(true); };

    const openEdit = (r: DailyReport) => {
        setEditItem(r);
        setFormDate(r.date); setFormWeather(r.weather); setFormTask(r.taskContent);
        setFormPersonnel(r.personnel); setFormIssues(r.issues || ''); setFormNext(r.nextPlan || '');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formDate || !formTask) return alert('일자와 작업 내용은 필수입니다.');
        const data = {
            date: formDate, weather: formWeather, taskContent: formTask,
            personnel: formPersonnel, issues: formIssues, nextPlan: formNext,
            status: 'submitted',
        };
        if (editItem) {
            await updateDoc(doc(db, 'daily_reports', editItem.id), data);
        } else {
            await addDoc(colRef, { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false);
        resetForm();
    };

    const handleDelete = async (r: DailyReport) => {
        if (!confirm(`${r.date} 감리일보를 삭제하시겠습니까?`)) return;
        await deleteDoc(doc(db, 'daily_reports', r.id));
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Daily Report</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">감리일보</h1>
                    <p className="text-sm text-gray-500">일일 현장 감리 보고서 작성 및 관리</p>
                </div>
                <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">📝 감리일보 작성</button>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                    <p className="text-xs text-gray-400">총 작성 일보</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{reports.length}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                    <p className="text-xs text-gray-400">이번 달</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                        {reports.filter(r => r.date?.startsWith(new Date().toISOString().slice(0, 7))).length}
                        <span className="text-sm font-normal text-gray-400 ml-1">건</span>
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                    <p className="text-xs text-gray-400">최근 작성일</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">{reports[0]?.date || '-'}</p>
                </div>
            </div>

            {/* 일보 리스트 */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : reports.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-gray-500 font-medium">작성된 감리일보가 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-1">위의 "감리일보 작성" 버튼을 클릭하여 첫 번째 일보를 작성하세요.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <th className="py-3 px-4 text-left">일자</th>
                                <th className="py-3 px-4 text-left">날씨</th>
                                <th className="py-3 px-4 text-left">금일 작업 내용</th>
                                <th className="py-3 px-4 text-left">투입 인력/장비</th>
                                <th className="py-3 px-4 text-left">특이사항</th>
                                <th className="py-3 px-4 text-center w-28">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((r) => (
                                <tr key={r.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition">
                                    <td className="py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">{r.date}</td>
                                    <td className="py-3 px-4 whitespace-nowrap">{weatherIcons[r.weather] || '🌤️'} {r.weather}</td>
                                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{r.taskContent}</td>
                                    <td className="py-3 px-4 text-gray-500 text-xs">{r.personnel || '-'}</td>
                                    <td className="py-3 px-4 text-gray-500 text-xs max-w-[150px] truncate">{r.issues || '-'}</td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">수정</button>
                                            <button onClick={() => handleDelete(r)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 작성/수정 모달 */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">{editItem ? '✏️ 감리일보 수정' : '📝 감리일보 작성'}</h2>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">작업 일자 *</label>
                                    <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">날씨</label>
                                    <select value={formWeather} onChange={(e) => setFormWeather(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                                        {weatherOptions.map((w) => <option key={w} value={w}>{weatherIcons[w]} {w}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">금일 작업 내용 *</label>
                                <textarea value={formTask} onChange={(e) => setFormTask(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" placeholder="광케이블 2km 포설, 통신주 건주 3본 등" required />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">투입 인력 및 장비</label>
                                <input value={formPersonnel} onChange={(e) => setFormPersonnel(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="기술자 3명, 굴착기 1대" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">특이사항 / 현장 이슈</label>
                                <textarea value={formIssues} onChange={(e) => setFormIssues(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" placeholder="A구역 암반 출현, 자재 수급 지연 등" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">명일 계획</label>
                                <textarea value={formNext} onChange={(e) => setFormNext(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" placeholder="B구역 관로 포설 착수 예정" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">취소</button>
                            <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">{editItem ? '수정 완료' : '일보 저장'}</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
