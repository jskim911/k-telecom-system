"use client";

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface DocItem {
    id: string;
    name: string;
    category: string;
    size: string;
    author: string;
    date: string;
    icon: string;
    url?: string;
}

const categoryOptions = [
    { label: 'Contract', color: 'bg-orange-100 text-orange-700', icon: '📄' },
    { label: 'Drawing', color: 'bg-purple-100 text-purple-700', icon: '📐' },
    { label: 'Report', color: 'bg-blue-100 text-blue-700', icon: '📊' },
    { label: '감리일보', color: 'bg-green-100 text-green-700', icon: '📝' },
    { label: '품질서류', color: 'bg-teal-100 text-teal-700', icon: '✅' },
    { label: '안전서류', color: 'bg-red-100 text-red-700', icon: '🛡️' },
];

const defaultDocs: Omit<DocItem, 'id'>[] = [
    { name: '착공계_최종.pdf', category: 'Contract', size: '2.5MB', author: '박공무', date: '2024-02-28', icon: '📄' },
    { name: '통신선로_시공상세도_V2.dwg', category: 'Drawing', size: '15.4MB', author: '최설계', date: '2024-03-10', icon: '📐' },
    { name: '3월_월간_공정_보고서.pptx', category: 'Report', size: '5.1MB', author: '김현장', date: '2024-04-01', icon: '📊' },
    { name: '감리일보_0401.hwpx', category: '감리일보', size: '1.2MB', author: '이감리', date: '2024-04-01', icon: '📝' },
    { name: '자재검수_성적서.pdf', category: '품질서류', size: '3.8MB', author: '감리단장', date: '2024-03-28', icon: '✅' },
    { name: '안전관리계획서_V3.pdf', category: '안전서류', size: '4.2MB', author: '박안전', date: '2024-03-05', icon: '🛡️' },
];

function getCategoryStyle(cat: string) {
    return categoryOptions.find((c) => c.label === cat) || { label: cat, color: 'bg-gray-100 text-gray-600', icon: '📁' };
}

export default function DocumentsPage() {
    const [docs, setDocs] = useState<DocItem[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Form
    const [formCategory, setFormCategory] = useState('Contract');
    const [formAuthor, setFormAuthor] = useState('');
    const [formDate, setFormDate] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const colRef = collection(db, 'documents');

    useEffect(() => {
        const q = query(colRef, orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            if (snap.empty) {
                defaultDocs.forEach((item) => addDoc(colRef, item));
                return;
            }
            setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DocItem)));
            setLoading(false);
        });
        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const handleUpload = async () => {
        if (!selectedFile || !formAuthor || !formDate) return alert('파일, 작성자, 날짜를 입력하세요.');
        setUploading(true);
        try {
            const catInfo = getCategoryStyle(formCategory);
            let url = '';
            // Firebase Storage 업로드
            try {
                const storageRef = ref(storage, `documents/${Date.now()}_${selectedFile.name}`);
                const snapshot = await uploadBytes(storageRef, selectedFile);
                url = await getDownloadURL(snapshot.ref);
            } catch {
                // Storage 미설정 시 URL 없이 메타데이터만 저장
                console.log('Storage upload skipped');
            }

            await addDoc(colRef, {
                name: selectedFile.name,
                category: formCategory,
                size: formatSize(selectedFile.size),
                author: formAuthor,
                date: formDate,
                icon: catInfo.icon,
                url,
            });
            setShowModal(false);
            setSelectedFile(null);
            setFormAuthor(''); setFormDate(''); setFormCategory('Contract');
        } catch (err) {
            alert('업로드 실패: ' + err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (item: DocItem) => {
        if (!confirm(`"${item.name}" 문서를 삭제하시겠습니까?`)) return;
        await deleteDoc(doc(db, 'documents', item.id));
    };

    const handleDownload = (item: DocItem) => {
        if (item.url) {
            window.open(item.url, '_blank');
        } else {
            alert('이 문서는 다운로드 URL이 없습니다.\n(기본 샘플 데이터)');
        }
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Documents</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">문서/도면 관리</h1>
                    <p className="text-sm text-gray-500">프로젝트 산출물 및 도면 버전 관리</p>
                </div>
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">+ 문서 업로드</button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {docs.map((item) => {
                        const catStyle = getCategoryStyle(item.category);
                        return (
                            <div key={item.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition group">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                                    {item.icon || catStyle.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${catStyle.color}`}>{item.category}</span>
                                        <span className="text-xs text-gray-400">{item.size}</span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-400">{item.author}</span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-400">{item.date}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleDownload(item)} className="text-gray-400 hover:text-blue-600 transition text-sm p-1" title="다운로드">⬇️</button>
                                    <button onClick={() => handleDelete(item)} className="text-gray-300 hover:text-red-500 transition text-sm p-1 opacity-0 group-hover:opacity-100" title="삭제">✕</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 문서 업로드 모달 */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">📁 문서 업로드</h2>
                        <div className="space-y-3">
                            {/* 파일 선택 영역 */}
                            <div>
                                <label className="text-xs text-gray-500 font-medium">파일 선택</label>
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
                                >
                                    {selectedFile ? (
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-400 mt-1">{formatSize(selectedFile.size)}</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-2xl mb-1">📂</p>
                                            <p className="text-sm text-gray-500">클릭하여 파일을 선택하세요</p>
                                            <p className="text-xs text-gray-400 mt-1">PDF, HWP, HWPX, DWG, PPTX 등</p>
                                        </div>
                                    )}
                                </div>
                                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">카테고리</label>
                                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                                        {categoryOptions.map((c) => <option key={c.label} value={c.label}>{c.icon} {c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">작성자</label>
                                    <input value={formAuthor} onChange={(e) => setFormAuthor(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="이름" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">등록일</label>
                                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => { setShowModal(false); setSelectedFile(null); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">취소</button>
                            <button onClick={handleUpload} disabled={uploading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                                {uploading ? '업로드 중...' : '📤 업로드'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
