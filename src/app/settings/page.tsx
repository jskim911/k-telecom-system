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

interface Person {
    name: string;
    role: string;
    cert: string;
    phone: string;
    avatar: string;
}

type GroupKey = 'inspectors' | 'clients' | 'contractors';

const groupConfig: Record<GroupKey, { title: string; icon: string; color: string; addLabel: string }> = {
    inspectors: { title: '감리원 정보', icon: '👷', color: 'bg-blue-600', addLabel: '+ 감리원 추가' },
    clients: { title: '발주자 정보', icon: '🏛️', color: 'bg-emerald-600', addLabel: '+ 발주자 인력 추가' },
    contractors: { title: '시공사 정보', icon: '🏗️', color: 'bg-orange-500', addLabel: '+ 시공사 인력 추가' },
};

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

const defaultGroups: Record<GroupKey, Person[]> = {
    inspectors: [
        { name: '김현장', role: '총괄감리원', cert: '감리기술사', phone: '010-1234-5678', avatar: 'PM' },
        { name: '이영희', role: '현장감리원', cert: '통신기사', phone: '010-2345-6789', avatar: 'LE' },
        { name: '박준형', role: '안전감리원', cert: '안전기사', phone: '010-3456-7890', avatar: 'PJ' },
        { name: '최민수', role: '품질감리원', cert: '품질기사', phone: '010-4567-8901', avatar: 'CM' },
    ],
    clients: [
        { name: '홍길동', role: '공사 담당', cert: '과장', phone: '010-5678-9012', avatar: 'HG' },
        { name: '김발주', role: '현장 대리인', cert: '대리', phone: '010-6789-0123', avatar: 'KB' },
    ],
    contractors: [
        { name: '정시공', role: '현장대리인', cert: '통신기사', phone: '010-7890-1234', avatar: 'JS' },
        { name: '한기술', role: '안전관리자', cert: '안전기사', phone: '010-8901-2345', avatar: 'HG' },
        { name: '오반장', role: '공사반장', cert: '기능사', phone: '010-9012-3456', avatar: 'OB' },
    ],
};

const fieldLabels: Record<string, string> = {
    projectName: '공사명', client: '발주처', contractor: '시공사', supervisor: '감리사',
    startDate: '공사 시작일', endDate: '공사 종료일', budget: '공사 금액', address: '현장 주소',
};

export default function SettingsPage() {
    const [project, setProject] = useState<ProjectInfo>(defaultProject);
    const [groups, setGroups] = useState<Record<GroupKey, Person[]>>(defaultGroups);
    const [editingProject, setEditingProject] = useState(false);
    const [saved, setSaved] = useState(false);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [modalGroup, setModalGroup] = useState<GroupKey>('inspectors');
    const [editIdx, setEditIdx] = useState<number | null>(null);
    const [formName, setFormName] = useState('');
    const [formRole, setFormRole] = useState('');
    const [formCert, setFormCert] = useState('');
    const [formPhone, setFormPhone] = useState('');

    const docRef = doc(db, 'settings', 'project');

    useEffect(() => {
        getDoc(docRef).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.project) setProject(data.project);
                const loaded: Record<GroupKey, Person[]> = {
                    inspectors: data.inspectors || defaultGroups.inspectors,
                    clients: data.clients || defaultGroups.clients,
                    contractors: data.contractors || defaultGroups.contractors,
                };
                setGroups(loaded);
            } else {
                setDoc(docRef, { project: defaultProject, ...defaultGroups });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveAll = async (p: ProjectInfo, g: Record<GroupKey, Person[]>) => {
        await setDoc(docRef, { project: p, ...g });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // Project
    const handleProjectChange = (key: string, value: string) => {
        setProject((prev) => ({ ...prev, [key]: value }));
    };
    const handleProjectSave = () => { saveAll(project, groups); setEditingProject(false); };

    // Person Modal
    const openAdd = (group: GroupKey) => {
        setModalGroup(group); setEditIdx(null);
        setFormName(''); setFormRole(''); setFormCert(''); setFormPhone('');
        setShowModal(true);
    };

    const openEdit = (group: GroupKey, idx: number) => {
        const p = groups[group][idx];
        setModalGroup(group); setEditIdx(idx);
        setFormName(p.name); setFormRole(p.role); setFormCert(p.cert); setFormPhone(p.phone || '');
        setShowModal(true);
    };

    const handlePersonSave = () => {
        if (!formName) return alert('이름을 입력하세요.');
        const avatar = formName.length >= 2 ? (formName[0] + formName[formName.length - 1]).toUpperCase() : formName.toUpperCase();
        const person: Person = { name: formName, role: formRole, cert: formCert, phone: formPhone, avatar };
        const updated = { ...groups };
        if (editIdx !== null) {
            updated[modalGroup] = [...groups[modalGroup]];
            updated[modalGroup][editIdx] = person;
        } else {
            updated[modalGroup] = [...groups[modalGroup], person];
        }
        setGroups(updated);
        saveAll(project, updated);
        setShowModal(false);
    };

    const handleDelete = (group: GroupKey, idx: number) => {
        const cfg = groupConfig[group];
        if (!confirm(`"${groups[group][idx].name}"을(를) 삭제하시겠습니까?`)) return;
        const updated = { ...groups, [group]: groups[group].filter((_, i) => i !== idx) };
        setGroups(updated);
        saveAll(project, updated);
    };

    // Person Card Component
    const PersonCard = ({ group }: { group: GroupKey }) => {
        const cfg = groupConfig[group];
        const people = groups[group] || [];
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span>{cfg.icon}</span> {cfg.title}
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-auto">{people.length}명</span>
                </h2>
                <div className="space-y-2">
                    {people.map((person, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition group">
                            <div className={`w-8 h-8 rounded-full ${cfg.color} text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0`}>
                                {person.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{person.name}</p>
                                <p className="text-xs text-gray-400">{person.role}{person.phone ? ` · ${person.phone}` : ''}</p>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded hidden sm:inline">{person.cert}</span>
                            <button onClick={() => openEdit(group, i)} className="text-xs text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition">수정</button>
                            <button onClick={() => handleDelete(group, i)} className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">삭제</button>
                        </div>
                    ))}
                </div>
                <button onClick={() => openAdd(group)} className="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition">{cfg.addLabel}</button>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Settings</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">기준 정보 관리</h1>
                    <p className="text-sm text-gray-500">프로젝트 기본 정보 및 참여 인력 관리</p>
                </div>
                {saved && <span className="text-sm text-green-600 font-medium animate-pulse">✅ 저장 완료!</span>}
            </div>

            {/* 프로젝트 기본 정보 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">📋 프로젝트 기본 정보</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    {Object.entries(project).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50">
                            <span className="text-sm text-gray-500 font-medium">{fieldLabels[key] || key}</span>
                            {editingProject ? (
                                <input
                                    type={key.includes('Date') ? 'date' : 'text'}
                                    value={value}
                                    onChange={(e) => handleProjectChange(key, e.target.value)}
                                    className="border rounded-lg px-2 py-1 text-sm text-right w-52"
                                />
                            ) : (
                                <span className="text-sm text-gray-800 font-semibold">{value}</span>
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

            {/* 3개 인력 그룹 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PersonCard group="inspectors" />
                <PersonCard group="clients" />
                <PersonCard group="contractors" />
            </div>

            {/* 인력 추가/수정 모달 */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">
                            {groupConfig[modalGroup].icon} {editIdx !== null ? '인력 수정' : '인력 추가'} - {groupConfig[modalGroup].title}
                        </h2>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">이름 *</label>
                                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="홍길동" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">연락처</label>
                                    <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="010-0000-0000" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">직위/역할</label>
                                <input value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="현장감리원, 과장, 공사반장 등" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">자격/직급</label>
                                <input value={formCert} onChange={(e) => setFormCert(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="통신기사, 대리, 기능사 등" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">취소</button>
                            <button onClick={handlePersonSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">{editIdx !== null ? '수정 완료' : '추가 완료'}</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
