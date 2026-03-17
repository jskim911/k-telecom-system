"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import GDocDynamicModal from '@/components/GDocDynamicModal';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

interface SchemaField {
    korean: string;
    english: string;
    type: string;
    required: boolean;
    label: string;
}

interface Schema {
    namespace: string;
    title: string;
    source_file: string;
    fields: SchemaField[];
}

interface DailyReport {
    id: string;
    data: Record<string, any>;
    createdAt: any;
    gdocUrl?: string;
}

export default function DailyReportPage() {
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGDocModal, setShowGDocModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
    const [gdocForceGenerate, setGDocForceGenerate] = useState(false);

    // Schema
    const [schema, setSchema] = useState<Schema | null>(null);

    // Form - Dynamic
    const [formData, setFormData] = useState<Record<string, any>>({});

    const colRef = collection(db, 'daily_reports');

    // 스키마 로드 (기존 파이썬 서버 의존성 제거를 위해 기본 스키마 사용 또는 로컬 JSON 참조 권장)
    const loadSchema = async () => {
        try {
            // 우선 기본 스키마로 폴백 설정
            const defaultSchema: Schema = {
                namespace: "daily_report",
                title: "감리일보",
                source_file: "감리일보_양식",
                fields: [
                    { korean: "일자", english: "date", type: "date", required: true, label: "보고 일자" },
                    { korean: "공종", english: "work_type", type: "text", required: true, label: "주요 공종" },
                    { korean: "작업위치", english: "location", type: "text", required: false, label: "작업 위치" },
                    { korean: "작업자", english: "workers", type: "text", required: false, label: "당일 작업자" },
                    { korean: "금일작업량", english: "work_qty", type: "text", required: false, label: "금일 작업량" },
                    { korean: "기온", english: "temperature", type: "text", required: false, label: "현장 기온" },
                    { korean: "비고", english: "notes", type: "textarea", required: false, label: "특이 사항" }
                ]
            };
            setSchema(defaultSchema);
            
            // 향후 API가 준비되면 아래 코드 활성화 가능
            // const res = await fetch('/api/schemas/daily_report');
            // if (res.ok) { ... }
        } catch (e) {
            console.error("Schema load failed:", e);
        }
    };

    useEffect(() => {
        loadSchema();
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const wbs = searchParams.get('wbs');
            if (wbs) {
                const name = searchParams.get('name') || '';
                const loc = searchParams.get('location') || '';
                const workers = searchParams.get('workers') || '';
                const qty = searchParams.get('qty') || '';
                
                // 새로운 레코드를 바로 생성하거나, 혹은 모달에서 저장 시 생성되도록 함
                // 여기선 우선 빈 레코드를 보여주거나 모달을 바로 띄움
                setSelectedReport(null); // 신규 작성
                setGDocForceGenerate(false);
                setShowGDocModal(true);
                window.history.replaceState(null, '', '/daily-report');
            }
        }

        const q = query(colRef, orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyReport)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleDelete = async (r: DailyReport) => {
        if (!confirm(`해당 감리일보를 삭제하시겠습니까?`)) return;
        await deleteDoc(doc(db, 'daily_reports', r.id));
    };

    const getDisplayValue = (r: DailyReport, key: string) => {
        const val = r.data?.[key];
        if (key === 'work_type') {
            const date = r.data?.['date'] || '-';
            const loc = r.data?.['location'] || '-';
            const type = r.data?.['work_type'] || '-';
            return `${date} ${loc} ${type}`;
        }
        return val || '-';
    };

    const handleGDocSave = async (data: Record<string, any>) => {
        try {
            const { gdocUrl, ...rest } = data;
            const payload = {
                data: rest,
                gdocUrl: gdocUrl || null,
                updatedAt: serverTimestamp(),
            };

            if (selectedReport) {
                await updateDoc(doc(db, 'daily_reports', selectedReport.id), payload);
            } else {
                await addDoc(colRef, { ...payload, createdAt: serverTimestamp() });
            }
        } catch (e) {
            console.error("GDoc save to DB failed:", e);
            alert("DB 저장 중 오류가 발생했습니다.");
            throw e; // 모달에서도 에러를 인지하게 함
        }
    };

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">
                <Link href="/" className="hover:text-blue-600 transition-colors">🏠 홈</Link> / <span className="text-gray-800 font-medium">Daily Report</span>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{schema?.title || '감리일보'}</h1>
                    <p className="text-sm text-gray-500">일일 현장 감리 보고서 작성 및 관리 (항목을 클릭하여 작성/출력하세요)</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : reports.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-gray-500 font-medium">작성된 일보가 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-1">위의 버튼을 클릭하여 첫 번째 일보를 작성하세요.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <th className="py-3 px-4 text-left w-24">일자/기온</th>
                                <th className="py-3 px-4 text-left">공종</th>
                                <th className="py-3 px-4 text-left">작업 정보 (장소/인원/수량)</th>
                                <th className="py-3 px-4 text-center w-24">문서 출력</th>
                                <th className="py-3 px-4 text-center w-28">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((r) => (
                                <tr key={r.id} className={`border-t border-gray-50 hover:bg-blue-50/30 transition cursor-pointer group ${selectedReport?.id === r.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`} 
                                    onClick={() => { setSelectedReport(r); setGDocForceGenerate(false); setShowGDocModal(true); }}>
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-gray-700">{getDisplayValue(r, 'date')}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">기온: {getDisplayValue(r, 'temperature')}</div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-800 font-medium">{getDisplayValue(r, 'work_type')}</td>
                                    <td className="py-3 px-4 text-sm">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-gray-600"><span className="text-xs text-gray-400 mr-1">📍</span>{getDisplayValue(r, 'location')}</div>
                                            <div className="text-gray-600"><span className="text-xs text-gray-400 mr-1">👷</span>{getDisplayValue(r, 'workers')}</div>
                                            <div className="text-blue-600 font-bold bg-blue-50 w-fit px-1.5 py-0.5 rounded mt-0.5"><span className="text-xs font-normal text-blue-400 mr-1">📦</span>{getDisplayValue(r, 'work_qty')}</div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            {r.gdocUrl ? (
                                                <>
                                                    <a 
                                                        href={r.gdocUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        title="구글 독스 열기"
                                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg border border-green-100 hover:bg-green-100 transition shadow-sm"
                                                    >
                                                        🌐
                                                    </a>
                                                    <a 
                                                        href={`https://docs.google.com/document/d/${r.gdocUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]}/export?format=pdf`}
                                                        title="PDF 다운로드"
                                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition shadow-sm"
                                                    >
                                                        📥
                                                    </a>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => { setSelectedReport(r); setGDocForceGenerate(true); setShowGDocModal(true); }}
                                                    className="text-[10px] px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm flex items-center gap-1"
                                                >
                                                    📄 출력
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleDelete(r)} className="text-xs text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition">삭제</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
                <span className="text-indigo-500 text-lg">💡</span>
                <div className="text-xs text-indigo-700 leading-normal">
                    <p className="font-bold mb-1">구글 독스 자동 출력 안내</p>
                    <p>별도의 서버 프로그램 설치 없이, 구글 독스 URL만 연결하면 즉시 문서를 생성하고 PDF로 다운로드할 수 있습니다.</p>
                </div>
            </div>

            {/* 구글 독스 동적 모달 */}
            <GDocDynamicModal 
                isOpen={showGDocModal} 
                onClose={() => setShowGDocModal(false)} 
                prefillData={selectedReport?.data}
                onSave={handleGDocSave}
                documentType="daily_report"
                forceGenerate={gdocForceGenerate}
            />
        </DashboardLayout>
    );
}
