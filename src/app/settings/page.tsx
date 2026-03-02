"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ProjectInfo {
    projectName: string;
    client: string;
    contractor: string;
    supervisor: string;
    startDate: string;
    endDate: string;
    budget: string;
    address: string;
}

interface Inspector {
    name: string;
    role: string;
    cert: string;
    avatar: string;
}

const defaultProject: ProjectInfo = {
    projectName: 'OO지역 통신선로 구축 공사',
    client: '한국전력공사',
    contractor: '(주)OO통신',
    supervisor: '(주)OO엔지니어링',
    startDate: '2024-03-01',
    endDate: '2024-06-30',
    budget: '1,250,000,000원',
    address: '경기도 OO시 OO구 OO로 123',
};

const defaultInspectors: Inspector[] = [
    { name: '김현장', role: '총괄감리원', cert: '감리기술사', avatar: 'PM' },
    { name: '이영희', role: '현장감리원', cert: '통신기사', avatar: 'LE' },
    { name: '박준형', role: '안전감리원', cert: '안전기사', avatar: 'PJ' },
    { name: '최민수', role: '품질감리원', cert: '품질기사', avatar: 'CM' },
];

const fieldLabels: Record<string, string> = {
    projectName: '공사명', client: '발주처', contractor: '시공사', supervisor: '감리사',
    startDate: '공사 시작일', endDate: '공사 종료일', budget: '공사 금액', address: '현장 주소',
};

export default function SettingsPage() {
    const [project, setProject] = useState<ProjectInfo>(defaultProject);
    const [inspectors, setInspectors] = useState<Inspector[]>(defaultInspectors);
    const [editingProject, setEditingProject] = useState(false);
    const [showInspectorModal, setShowInspectorModal] = useState(false);
    const [editingInspectorIdx, setEditingInspectorIdx] = useState<number | null>(null);
    const [formName, setFormName] = useState('');
    const [formRole, setFormRole] = useState('');
    const [formCert, setFormCert] = useState('');
    const [saved, setSaved] = useState(false);

    const docRef = doc(db, 'settings', 'project');

    useEffect(() => {
        getDoc(docRef).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.project) setProject(data.project);
                if (data.inspectors) setInspectors(data.inspectors);
            } else {
                setDoc(docRef, { project: defaultProject, inspectors: defaultInspectors });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveAll = async (p: ProjectInfo, i: Inspector[]) => {
        await setDoc(docRef, { project: p, inspectors: i });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleProjectChange = (key: string, value: string) => {
        setProject((prev) => ({ ...prev, [key]: value }));
    };

    const handleProjectSave = () => {
        saveAll(project, inspectors);
        setEditingProject(false);
    };

    const openAddInspector = () => {
        setFormName(''); setFormRole(''); setFormCert('');
        setEditingInspectorIdx(null);
        setShowInspectorModal(true);
    };

    const openEditInspector = (idx: number) => {
        const i = inspectors[idx];
        setFormName(i.name); setFormRole(i.role); setFormCert(i.cert);
        setEditingInspectorIdx(idx);
        setShowInspectorModal(true);
    };

    const handleInspectorSave = () => {
        const avatar = formName.split('').filter((_, i) => i === 0 || i === formName.length - 1).join('').toUpperCase().slice(0, 2);
        const newInspector: Inspector = { name: formName, role: formRole, cert: formCert, avatar };
        let updated: Inspector[];
        if (editingInspectorIdx !== null) {
            updated = [...inspectors];
            updated[editingInspectorIdx] = newInspector;
        } else {
            updated = [...inspectors, newInspector];
        }
        setInspectors(updated);
        saveAll(project, updated);
        setShowInspectorModal(false);
    };

    const handleDeleteInspector = (idx: number) => {
        if (!confirm(`"${inspectors[idx].name}" 감리원을 삭제하시겠습니까?`)) return;
        const updated = inspectors.filter((_, i) => i !== idx);
        setInspectors(updated);
        saveAll(project, updated);
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Settings</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">기준 정보 관리</h1>
                    <p className="text-sm text-gray-500">프로젝트 기본 정보 및 마스터 데이터 관리</p>
                </div>
                {saved && <span className="text-sm text-green-600 font-medium animate-pulse">✅ 저장 완료!</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 프로젝트 기본 정보 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">📋 프로젝트 기본 정보</h2>
                    <div className="space-y-3">
                        {Object.entries(project).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <span className="text-sm text-gray-500 font-medium">{fieldLabels[key] || key}</span>
                                {editingProject ? (
                                    <input
                                        type={key.includes('Date') ? 'date' : 'text'}
                                        value={value}
                                        onChange={(e) => handleProjectChange(key, e.target.value)}
                                        className="border rounded-lg px-2 py-1 text-sm text-right w-60"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-800 font-semibold">
                                        {key.includes('Date') ? value : value}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    {editingProject ? (
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setEditingProject(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">취소</button>
                            <button onClick={handleProjectSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">💾 저장</button>
                        </div>
                    ) : (
                        <button onClick={() => setEditingProject(true)} className="mt-4 w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">✏️ 정보 수정</button>
                    )}
                </div>

                {/* 감리원 정보 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">👷 감리원 정보</h2>
                    <div className="space-y-3">
                        {inspectors.map((person, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {person.avatar}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">{person.name}</p>
                                    <p className="text-xs text-gray-400">{person.role}</p>
                                </div>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">{person.cert}</span>
                                <button onClick={() => openEditInspector(i)} className="text-xs text-blue-500 hover:text-blue-700">수정</button>
                                <button onClick={() => handleDeleteInspector(i)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                            </div>
                        ))}
                    </div>
                    <button onClick={openAddInspector} className="mt-4 w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">+ 감리원 추가</button>
                </div>
            </div>

            {/* 감리원 추가/수정 모달 */}
            {showInspectorModal && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">{editingInspectorIdx !== null ? '👷 감리원 수정' : '👷 감리원 추가'}</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 font-medium">이름</label>
                                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="홍길동" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">역할</label>
                                <input value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="현장감리원" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">자격</label>
                                <input value={formCert} onChange={(e) => setFormCert(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="통신기사" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowInspectorModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">취소</button>
                            <button onClick={handleInspectorSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">{editingInspectorIdx !== null ? '수정 완료' : '추가 완료'}</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
