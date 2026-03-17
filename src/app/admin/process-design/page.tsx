"use client";

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db, storage } from '@/lib/firebase';
import { 
    collection, onSnapshot, doc, deleteDoc, 
    writeBatch, query, orderBy, addDoc, updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { extractDocIdFromUrl } from '@/lib/gdoc-client';

interface Project {
    id: string;
    name: string;
    createdAt: number;
}

interface ProcessItem {
    id: string;
    name: string;
    projectId: string;
    weight: number; // 가중치 추가
    createdAt: number;
}

interface DocItem {
    id: string;
    name: string;
    category: string;
    url?: string;
    date: string;
    size?: string;
}

interface GDocTemplate {
    id: string;
    title: string;
    url: string;
    projectId?: string;
    projectName?: string;
    createdAt: number;
}

export default function UnifiedScreenDesignPage() {
    // 프로젝트(공사) 상태
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingProjectName, setEditingProjectName] = useState('');

    // 공정 아이템 상태
    const [processes, setProcesses] = useState<ProcessItem[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [bulkInput, setBulkInput] = useState('');
    const [procLoading, setProcLoading] = useState(false);

    // 양식 관리 상태
    const [docs, setDocs] = useState<DocItem[]>([]);
    const [templates, setTemplates] = useState<GDocTemplate[]>([]);
    
    // 선택 및 큐 상태
    const [selectedLeft, setSelectedLeft] = useState<Set<string>>(new Set());
    const [selectedRight, setSelectedRight] = useState<Set<string>>(new Set());
    const [pendingQueue, setPendingQueue] = useState<DocItem[]>([]);

    const [registering, setRegistering] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // 데이터 로드
    // 1. 공사 마스터 목록 로드
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'projects'), (snap) => {
            const projs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)).sort((a,b) => b.createdAt - a.createdAt);
            setProjects(projs);
        }, (err) => console.error("❌ 프로젝트 로드 에러:", err));
        return () => unsub();
    }, []);

    // 2. 공사가 하나도 없는데 선택된 게 있으면 초기화, 혹은 새로 등록 시 자동 선택
    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0].id);
        } else if (projects.length > 0 && !projects.find(p => p.id === selectedProjectId)) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    // 3. 선택된 공사에 맞게 '실시간' 데이터 매핑 (Strict Filter)
    useEffect(() => {
        if (!selectedProjectId) {
            setProcesses([]);
            setTemplates([]);
            return;
        }

        // 공정 아이템: projectId 일치 항목만
        const unsubProc = onSnapshot(collection(db, 'process_items'), (snap) => {
            const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcessItem));
            setProcesses(all.filter(p => p.projectId === selectedProjectId).sort((a,b) => b.createdAt - a.createdAt));
        });

        // 템플릿: projectId 일치 항목만 (이름 기반 제거하여 실시간 연동 보장)
        const unsubTemps = onSnapshot(collection(db, 'gdoc_templates'), (snap) => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as GDocTemplate));
            setTemplates(all.filter(t => t.projectId === selectedProjectId).sort((a,b) => b.createdAt - a.createdAt));
        });

        // 임시 문서 (글로벌)
        const unsubDocs = onSnapshot(query(collection(db, 'documents'), orderBy('date', 'desc')), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as DocItem));
            data.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
            setDocs(data);
        });

        return () => { unsubProc(); unsubDocs(); unsubTemps(); };
    }, [selectedProjectId]);

    // --- 프로젝트 관련 ---
    const handleProjectAdd = async () => {
        if (!newProjectName.trim()) return;
        try {
            await addDoc(collection(db, 'projects'), {
                name: newProjectName.trim(),
                createdAt: Date.now()
            });
            setNewProjectName('');
            setIsProjectModalOpen(false);
        } catch (err) { alert("공사 추가 오류"); }
    };

    const handleProjectDelete = async (id: string, name: string) => {
        if (confirm(`'${name}' 공사와 관련된 모든 데이터가 연결 해제됩니다. 정말 삭제하시겠습니까?`)) {
            await deleteDoc(doc(db, 'projects', id));
            if (selectedProjectId === id) setSelectedProjectId('');
        }
    };

    const handleProjectUpdate = async (id: string) => {
        if (!editingProjectName.trim()) return;
        try {
            const batch = writeBatch(db);
            
            // 1. 프로젝트 이름 업데이트
            batch.update(doc(db, 'projects', id), {
                name: editingProjectName.trim()
            });

            // 2. 연결된 템플릿들의 projectName 필드도 업데이트 (선택 사항이나 일관성을 위해 권장)
            // 실제로는 projectId로 필터링하므로 필수적이지는 않으나, 
            // 구글 드라이브 상의 폴더 구조와 매칭하기 위해 유용할 수 있음
            // *주의: 대용량의 경우 별도 처리 필요하지만 현재 수준에선 배치 내 처리가 나을 수 있음

            await batch.commit();
            setEditingProjectId(null);
        } catch (err) { alert("공사명 수정 오류"); }
    };

    // --- 공정 아이템 관련 ---
    const handleBulkAdd = async () => {
        if (!selectedProjectId) return alert("먼저 공사를 선택하거나 등록해주세요.");
        const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n !== '');
        if (names.length === 0) return;
        setProcLoading(true);
        try {
            const batch = writeBatch(db);
            names.forEach(name => {
                const id = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                batch.set(doc(db, 'process_items', id), { 
                    name, 
                    projectId: selectedProjectId,
                    weight: 0, // 초기 가중치 0
                    createdAt: Date.now() 
                });
            });
            await batch.commit();
            setBulkInput('');
            setIsAddModalOpen(false);
        } catch (err) { alert("공정 추가 오류"); } finally { setProcLoading(false); }
    };

    const handleWeightUpdate = async (id: string, weight: number) => {
        try {
            await updateDoc(doc(db, 'process_items', id), { weight });
        } catch (err) { console.error("가중치 업데이트 실패:", err); }
    };

    const handleDeleteProcess = async (id: string) => {
        if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, 'process_items', id));
    };

    // --- 양식 관리 로직 ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploading(true);
        try {
            const storagePath = `documents/templates/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, 'documents'), {
                name: file.name,
                category: 'Template_Source',
                size: (file.size / 1024).toFixed(1) + 'KB',
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                url: downloadUrl
            });
            window.alert(`'${file.name}' 업로드가 완료되었습니다.`);
        } catch (err: any) { 
            window.alert(`업로드 중 문제가 발생했습니다: ${err.message || "알 수 없는 에러"}`); 
        } finally { 
            setUploading(false); 
            if (e.target) e.target.value = ''; 
        }
    };

    // 왼쪽(임시) -> 오른쪽(대기) 이동
    const moveToRight = (specificId?: string) => {
        if (specificId) {
            const item = docs.find(d => d.id === specificId);
            if (item && !pendingQueue.some(p => p.id === item.id)) {
                setPendingQueue(prev => [...prev, item]);
            }
            const newSet = new Set(selectedLeft);
            newSet.delete(specificId);
            setSelectedLeft(newSet);
        } else {
            const itemsToMove = docs.filter(d => selectedLeft.has(d.id) && !pendingQueue.some(p => p.id === d.id));
            setPendingQueue(prev => [...prev, ...itemsToMove]);
            setSelectedLeft(new Set());
        }
    };

    const moveToLeft = (specificId?: string) => {
        if (specificId) {
            setPendingQueue(prev => prev.filter(p => p.id !== specificId));
            const newSet = new Set(selectedRight);
            newSet.delete(specificId);
            setSelectedRight(newSet);
        } else {
            setPendingQueue(prev => prev.filter(p => !selectedRight.has(p.id)));
            setSelectedRight(new Set());
        }
    };

    const handleRegister = async () => {
        const currentProject = projects.find(p => p.id === selectedProjectId);
        if (!currentProject) return alert("먼저 공사를 선택해주세요.");
        if (pendingQueue.length === 0) return alert("등록할 양식이 없습니다. 오른쪽 박스로 이동시켜주세요.");
        
        setRegistering(true);
        try {
            let successCount = 0;
            for (const item of pendingQueue) {
                const isGDoc = item.url?.includes('docs.google.com');
                const gdocId = isGDoc ? extractDocIdFromUrl(item.url || '') : null;
                
                const res = await fetch('/api/admin/register-template', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        documentId: gdocId,
                        title: item.name.split('.')[0],
                        url: item.url,
                        projectName: currentProject.name,
                        projectId: selectedProjectId,
                        isGDoc: isGDoc
                    })
                });
                if (res.ok) {
                    successCount++;
                    await deleteDoc(doc(db, 'documents', item.id));
                }
            }
            alert(`✅ '${currentProject.name}' 공사에 ${successCount}개의 양식이 구글 드라이브에 등록되었습니다.`);
            setPendingQueue([]);
            setSelectedRight(new Set());
        } catch (err) {
            alert("등록 중 오류 발생");
        } finally {
            setRegistering(false);
        }
    };

    const handleDeleteTempDoc = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("파일을 완전히 삭제하시겠습니까? (Storage에서도 제거됩니다)")) {
            await deleteDoc(doc(db, 'documents', id));
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (confirm("등록된 템플릿 설정을 삭제하시겠습니까?")) await deleteDoc(doc(db, 'gdoc_templates', id));
    };

    return (
        <DashboardLayout>
            <div className="p-8 max-w-7xl mx-auto space-y-12">
                {/* 0. 공사 마스터 관리 섹션 */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-[40px] shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight">화면설계 및 양식 자동화 🎨</h1>
                        <p className="text-blue-100 text-sm font-medium">관리할 공사를 선택하고 작업공정 및 양식을 매핑합니다.</p>
                    </div>
                    <div className="w-full md:w-[450px] space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-200">현재 관리 중인 공사 선택</label>
                        <div className="flex gap-2">
                            <select 
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="flex-1 px-6 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:bg-white focus:text-slate-900 transition-all font-bold appearance-none cursor-pointer"
                            >
                                <option value="" className="text-slate-900">공사를 선택해주세요</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={() => setIsProjectModalOpen(true)}
                                className="px-6 bg-white/10 border border-white/20 rounded-2xl font-black hover:bg-white hover:text-blue-600 transition-all"
                            >
                                관리
                            </button>
                        </div>
                    </div>
                </div>

                {/* 1. 작업공정 영역 */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-slate-800">1. 작업공정 아이템 설계 🚧</h2>
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const totalWeight = processes.reduce((sum, p) => sum + (p.weight || 0), 0);
                                    return (
                                        <>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                전체 가중치 합계: 
                                                <span className={`px-2 py-0.5 rounded-full ${totalWeight === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {totalWeight}%
                                                </span>
                                            </div>
                                            {totalWeight !== 100 && (
                                                <span className="text-[10px] text-red-400 font-bold animate-pulse">⚠️ 합계가 100%가 되어야 정확한 집계가 가능합니다.</span>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => window.location.href='/admin/modal-design'} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-black transition-all">⚙️ 공통 모달 필드 설계</button>
                            <button onClick={() => setIsAddModalOpen(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-blue-700 transition-all">+ 다중 공정 추가</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {processes.map((proc) => (
                            <div key={proc.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <h4 className="font-bold text-slate-800 truncate flex-1">{proc.name}</h4>
                                    <button onClick={() => handleDeleteProcess(proc.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">🗑️</button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">공종 가중치(Weight)</label>
                                        <span className="text-xs font-bold text-blue-600 px-2 py-1 bg-blue-50 rounded-lg">{proc.weight || 0}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={proc.weight || 0}
                                        onChange={(e) => handleWeightUpdate(proc.id, parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-300 font-bold">
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {processes.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm font-medium">등록된 공정이 없습니다. 상단 공사를 선택한 후 공정을 추가해주세요. ✨</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 2. 이동식 양식 관리 영역 */}
                <section className="space-y-6">
                    <h2 className="text-xl font-black text-slate-800 px-2">2. 양식등록 및 드라이브 연동 📝</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* 왼쪽 박스: 임시 업로드 */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-3">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">임시 업로드 목록 (Firebase)</span>
                                <input type="file" ref={fileRef} className="hidden" onChange={handleFileUpload} />
                                <button 
                                    onClick={() => fileRef.current?.click()} 
                                    disabled={uploading}
                                    className="text-[10px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold text-slate-500 hover:border-slate-800 transition-all disabled:opacity-50"
                                >
                                    {uploading ? '업로드 중...' : '📤 파일 업로드'}
                                </button>
                            </div>
                            <div className="bg-slate-50 rounded-[40px] border border-slate-100 h-[500px] overflow-y-auto custom-scrollbar p-6 space-y-2">
                                {docs.filter(d => !pendingQueue.some(p => p.id === d.id)).map(d => (
                                    <div 
                                        key={d.id} 
                                        onClick={() => {
                                            const newSet = new Set(selectedLeft);
                                            if (newSet.has(d.id)) newSet.delete(d.id); else newSet.add(d.id);
                                            setSelectedLeft(newSet);
                                        }}
                                        className={`group relative flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all ${selectedLeft.has(d.id) ? 'bg-blue-600 text-white shadow-lg' : 'bg-white hover:bg-slate-100 text-slate-700'}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{d.name}</p>
                                            <p className={`text-[10px] font-medium ${selectedLeft.has(d.id) ? 'text-blue-200' : 'text-slate-400'}`}>{d.date} • {d.size}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveToRight(d.id); }}
                                                className={`p-1.5 rounded-lg transition-all ${selectedLeft.has(d.id) ? 'bg-white/20 text-white hover:bg-white/40' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                                title="오른쪽으로 이동"
                                            >
                                                ➔
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteTempDoc(d.id, e)} 
                                                className={`p-1.5 rounded-lg transition-all ${selectedLeft.has(d.id) ? 'text-white hover:bg-white/20' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                                title="공영 기록 삭제"
                                            >
                                                ❌
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 오른쪽 박스: 대기 및 등록 */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-3">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">등록 대기 및 완료 현황</span>
                                <button 
                                    onClick={handleRegister}
                                    disabled={registering || pendingQueue.length === 0}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all disabled:grayscale disabled:opacity-30"
                                >
                                    {registering ? '구글 드라이브 연동 중...' : '🚀 선택 항목 일괄 등록 (드라이브)'}
                                </button>
                            </div>
                            <div className="bg-white rounded-[40px] border-2 border-slate-50 h-[500px] overflow-y-auto custom-scrollbar p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 대기 중인 항목 */}
                                    {pendingQueue.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => {
                                                const newSet = new Set(selectedRight);
                                                if (newSet.has(p.id)) newSet.delete(p.id); else newSet.add(p.id);
                                                setSelectedRight(newSet);
                                            }}
                                            className={`relative p-5 rounded-3xl border-2 cursor-pointer transition-all ${selectedRight.has(p.id) ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xl">⏳</span>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); moveToLeft(p.id); }}
                                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all"
                                                    title="목록에서 제거 (왼쪽으로)"
                                                >
                                                    ⬅
                                                </button>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                                            <span className="mt-2 inline-block text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">등록 대기</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. 등록 완료 양식 라이브러리 (Google Drive) */}
                <section className="space-y-6 pt-12 border-t border-slate-100">
                    <div className="flex items-center justify-between px-2">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-slate-800">3. 드라이브 연동 양식 라이브러리 📂</h2>
                            <p className="text-xs text-slate-500 font-medium">구글 드라이브에 최종 등록된 양식들입니다. 현재 선택된 공사 기준입니다.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(t => (
                            <div 
                                key={t.id} 
                                className="group p-5 rounded-[32px] border border-slate-100 bg-white hover:shadow-xl hover:border-blue-100 transition-all flex flex-col justify-between"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-xl">📄</div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => window.open(t.url, '_blank')}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="구글 드라이브에서 열기"
                                        >
                                            🔗
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteTemplate(t.id)} 
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="연동 해제"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-sm font-bold text-slate-800 truncate">{t.title}</h4>
                                    <p className="text-[9px] text-blue-500 font-black uppercase mt-1 tracking-wider">Connected to Drive</p>
                                </div>
                            </div>
                        ))}
                        {templates.length === 0 && (
                            <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm font-medium">드라이브에 등록된 양식이 없습니다.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* 공정 다중 추가 모달 */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black text-slate-900">작업공정 다중 추가</h3>
                            <p className="text-slate-500 text-sm">엔터(Enter) 혹은 줄바꿈으로 구분해 여러 공정을 한 번에 입력하세요.</p>
                        </div>
                        <textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} placeholder={"광케이블 포설\n카메라 설치\n접지 공사..."} className="w-full h-48 px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl outline-none transition-all font-medium resize-none" autoFocus />
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all">취소</button>
                            <button onClick={handleBulkAdd} disabled={procLoading || !bulkInput.trim()} className="flex-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20">{procLoading ? '추가 중...' : '공정 리스트 생성'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 공사 마스터 관리 모달 */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                        <div className="bg-slate-50 px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-900">🏗️ 공사 마스터 관리</h3>
                            <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">닫기</button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">새로운 공사 등록</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        placeholder="공사명을 입력하세요 (예: 하남 스마트시티)"
                                        className="flex-1 px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                    />
                                    <button 
                                        onClick={handleProjectAdd}
                                        className="px-8 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                                    >
                                        등록
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">등록된 공사 목록</label>
                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {projects.map(p => (
                                        <div key={p.id} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all">
                                            {editingProjectId === p.id ? (
                                                <div className="flex-1 flex gap-2">
                                                    <input 
                                                        type="text"
                                                        value={editingProjectName}
                                                        onChange={(e) => setEditingProjectName(e.target.value)}
                                                        className="flex-1 px-3 py-1 bg-white border border-blue-300 rounded-lg outline-none font-bold text-slate-700"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleProjectUpdate(p.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">저장</button>
                                                    <button onClick={() => setEditingProjectId(null)} className="px-3 py-1 bg-slate-200 text-slate-500 rounded-lg text-xs font-bold">취소</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="font-bold text-slate-700">{p.name}</span>
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingProjectId(p.id);
                                                                setEditingProjectName(p.name);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="공사명 수정"
                                                        >
                                                            ✍️
                                                        </button>
                                                        <button 
                                                            onClick={() => handleProjectDelete(p.id, p.name)}
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            title="삭제"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {projects.length === 0 && (
                                        <div className="py-12 text-center text-slate-400 font-medium">등록된 공사가 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
