"use client";

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import GDocDynamicModal from '@/components/GDocDynamicModal';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

// --- Types ---
interface Person {
    id: string;
    name: string;
    role: string;
    phone?: string;
    email?: string;
    avatar?: string;
}

interface ProjectInfo {
    projectName: string;
    location: string;
    period: string;
    manager: string;
    client: string;
    contractor: string;
}

type GroupKey = 'inspectors' | 'clients' | 'contractors';

const TAB_CONFIG = [
    { id: 'master', label: '마스터정보', icon: '🏛️' },
    { id: 'people', label: '관계자 정보', icon: '👷' },
    { id: 'account', label: '내 정보 설정', icon: '👤' },
    { id: 'design', label: '설계자료', icon: '🏗️' },
    { id: 'resource', label: '시공자원', icon: '🏗️' },
    { id: 'library', label: '기술 자료실', icon: '📚' },
];

export default function SettingsCenterPage() {
    const { user, userData } = useAuth();
    const [activeTab, setActiveTab] = useState('master');
    const [project, setProject] = useState<ProjectInfo>({
        projectName: '',
        location: '',
        period: '',
        manager: '',
        client: '',
        contractor: '',
    });

    const [userGeminiKey, setUserGeminiKey] = useState('');
    const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

    useEffect(() => {
        if (userData?.geminiApiKey) {
            setUserGeminiKey(userData.geminiApiKey);
        }
    }, [userData]);

    const [groups, setGroups] = useState<Record<GroupKey, Person[]>>({
        inspectors: [],
        clients: [],
        contractors: [],
    });

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal state for adding people
    const [showAddModal, setShowAddModal] = useState<GroupKey | null>(null);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');

    const docRef = useMemo(() => doc(db, 'settings', 'project'), []);

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.project) setProject(data.project);
                setGroups({
                    inspectors: data.inspectors || [],
                    clients: data.clients || [],
                    contractors: data.contractors || [],
                });
            }
            setLoading(false);
        }, (error) => {
            console.error("Settings: Firestore error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [docRef]);

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateDoc(docRef, { project });
            alert('프로젝트 마스터 정보가 업데이트되었습니다.');
        } catch (err) {
            alert('저장 실패: ' + err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddPerson = async () => {
        if (!showAddModal || !newName) return;
        const newPerson: Person = {
            id: Date.now().toString(),
            name: newName,
            role: newRole || '담당자',
            avatar: newName.slice(0, 2),
        };

        try {
            await updateDoc(docRef, {
                [showAddModal]: arrayUnion(newPerson)
            });
            setShowAddModal(null);
            setNewName('');
            setNewRole('');
        } catch (err) {
            alert('추가 실패: ' + err);
        }
    };

    const handleUpdateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsUpdatingAccount(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                geminiApiKey: userGeminiKey.trim()
            });
            alert('개인 설정이 업데이트되었습니다.');
        } catch (err) {
            alert('저장 실패: ' + err);
        } finally {
            setIsUpdatingAccount(false);
        }
    };

    const handleDeletePerson = async (group: GroupKey, person: Person) => {
        if (!confirm(`${person.name}님을 삭제하시겠습니까?`)) return;
        try {
            await updateDoc(docRef, {
                [group]: arrayRemove(person)
            });
        } catch (err) {
            alert('삭제 실패: ' + err);
        }
    };

    const renderMasterTab = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl text-lg">📁</span>
                    기본 정보 설정
                </h2>
                <form onSubmit={handleUpdateProject} className="space-y-5">
                    {[
                        { label: '프로젝트명', key: 'projectName', placeholder: '예: OO지역 통신구 공사' },
                        { label: '현장 위치', key: 'location', placeholder: '서울특별시 OO구 OO동' },
                        { label: '공사 기간', key: 'period', placeholder: '2024.01.01 ~ 2025.12.31' },
                        { label: '현장 대리인', key: 'manager', placeholder: '성함 입력' },
                        { label: '발주처 명칭', key: 'client', placeholder: '예: 한국전력공사' },
                        { label: '시공사 명칭', key: 'contractor', placeholder: '예: (주)OO건설' },
                    ].map((field) => (
                        <div key={field.key}>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">{field.label}</label>
                            <input
                                value={(project as any)[field.key]}
                                onChange={(e) => setProject({ ...project, [field.key]: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm outline-none transition-all font-bold text-gray-700"
                                placeholder={field.placeholder}
                            />
                        </div>
                    ))}
                    <button
                        disabled={isSaving}
                        className="w-full bg-slate-900 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 mt-4 disabled:opacity-50"
                    >
                        {isSaving ? '저장 중...' : '마스터 정보 업데이트'}
                    </button>
                </form>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black mb-4">Master Info</h2>
                    <p className="text-blue-100 leading-relaxed font-medium">
                        여기에 입력된 정보는 모든 공문서(Transmittal), 작업지시서, <br />
                        그리고 스마트 태그 자동 매핑의 기준 데이터가 됩니다.
                    </p>
                </div>
                <div className="relative z-10 flex gap-4 mt-8">
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Status</p>
                        <p className="text-xl font-bold">In Progress</p>
                    </div>
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Health</p>
                        <p className="text-xl font-bold">Stable</p>
                    </div>
                </div>
                <div className="absolute -right-20 -bottom-20 opacity-10 text-[200px] font-black italic select-none">PRJ</div>
            </div>
        </div>
    );

    const renderPeopleTab = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            {(['inspectors', 'clients', 'contractors'] as GroupKey[]).map((groupKey) => (
                <div key={groupKey} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-gray-800">
                                {groupKey === 'inspectors' ? '👷 감리단 구성' : groupKey === 'clients' ? '🏛️ 발주처 인력' : '🏗️ 시공사 관계자'}
                            </h3>
                            <p className="text-xs text-gray-400 font-bold mt-1">현장 비상연락망 및 결재선 지정용 데이터</p>
                        </div>
                        <button
                            onClick={() => setShowAddModal(groupKey)}
                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition"
                        >
                            + 인원 추가
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {groups[groupKey].map((person) => (
                            <div key={person.id} className="group p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white transition-all relative overflow-hidden">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-100">
                                        {person.avatar || person.name.slice(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-gray-800 truncate">{person.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400">{person.role}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeletePerson(groupKey, person)}
                                    className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderAccountTab = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-lg">👤</span>
                    내 정보 설정
                </h2>
                <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl">
                            {userData?.name?.slice(0, 2) || '??'}
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-800">{userData?.name || '사용자'}</p>
                            <p className="text-xs text-gray-400 font-bold">{userData?.role || '권한 없음'}</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateAccount} className="space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">이메일 계정</label>
                            <input
                                value={userData?.email || ''}
                                disabled
                                className="w-full bg-gray-100 border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm outline-none font-bold text-gray-400 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Gemini API Key</label>
                            <input
                                type="password"
                                value={userGeminiKey}
                                onChange={(e) => setUserGeminiKey(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm outline-none transition-all font-bold text-gray-700"
                                placeholder="프로젝트 AI 비서용 API 키"
                            />
                            <p className="text-[10px] text-gray-400 mt-2 font-bold italic ml-1">* 이 키는 본인의 AI 비서 기능을 활성화하는 데에만 사용됩니다.</p>
                        </div>
                        <button
                            disabled={isUpdatingAccount}
                            className="w-full bg-indigo-600 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 mt-4 disabled:opacity-50"
                        >
                            {isUpdatingAccount ? '저장 중...' : '개인 설정 저장'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="bg-indigo-50 rounded-[2.5rem] p-10 flex flex-col justify-center border border-indigo-100">
                <div className="text-4xl mb-6">🤖</div>
                <h3 className="text-2xl font-black text-indigo-900 mb-4">개인화된 AI 경험</h3>
                <p className="text-indigo-700/70 font-medium leading-relaxed">
                    Gemini API 키를 등록하면 시스템의 모든 메뉴에서 나만을 위한 AI 비서를 사용할 수 있습니다. <br /><br />
                    프로젝트 마스터 정보와 설계 자료를 바탕으로 질문에 답하며, 현장의 복잡한 규정이나 도면 정보를 빠르게 요약해 드립니다.
                </p>
                <div className="mt-8 flex gap-3">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition">API 키 발급받기 ↗</a>
                </div>
            </div>
        </div>
    );

    const renderLibraryTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
             <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="text-6xl mb-6">📚</div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">기술 자료실</h3>
                <p className="text-gray-400 font-medium max-w-xs">표준 시방서, 기술 가이드라인 및 <br />참조 자료를 중앙 관리합니다.</p>
                <button className="mt-8 px-8 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">준비 중</button>
             </div>
             <div className="bg-slate-900 rounded-3xl p-10 shadow-2xl relative overflow-hidden flex flex-col justify-end">
                <div className="relative z-10 text-white">
                    <h2 className="text-4xl font-black mb-4">Archive</h2>
                    <p className="text-slate-400 font-medium leading-relaxed">
                        문서 번호 체계와 관계자 정보가 <br />
                        정확해야 시스템의 모든 자동화 <br />
                        기능이 정상 작동합니다.
                    </p>
                </div>
                <div className="absolute -right-10 -top-10 opacity-10 text-[180px] font-black text-white select-none">DOC</div>
             </div>
        </div>
    );

    if (loading) return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="text-xs text-blue-600 font-black uppercase tracking-widest mb-2">System Center</div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">기본정보 관리 센터</h1>
                    <p className="text-slate-500 font-medium mt-1">현장 마스터 데이터 및 관계자 통합 관리</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
                    {TAB_CONFIG.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pb-20">
                {activeTab === 'master' && renderMasterTab()}
                {activeTab === 'people' && renderPeopleTab()}
                {activeTab === 'account' && renderAccountTab()}
                {activeTab === 'library' && renderLibraryTab()}
                {(activeTab === 'design' || activeTab === 'resource') && (
                    <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-100">
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Next Phase Implementation</p>
                    </div>
                )}
            </div>

            {/* 인원 추가 모달 */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 bg-slate-50 border-b">
                            <h2 className="text-lg font-black text-slate-800">👤 관계자 추가</h2>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">성함</label>
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 outline-none font-bold"
                                    placeholder="홍길동"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">직함/역할</label>
                                <input
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 outline-none font-bold"
                                    placeholder="총괄감리원"
                                />
                            </div>
                        </div>
                        <div className="p-8 border-t flex gap-3">
                            <button onClick={() => setShowAddModal(null)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400">Cancel</button>
                            <button onClick={handleAddPerson} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100">Add Member</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
