"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface ModalField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'textarea';
    required: boolean;
    placeholder?: string;
}

export default function ModalDesignPage() {
    const [fields, setFields] = useState<ModalField[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 공통 모달 설정 로드
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'ui_config', 'work_modal'), (snap) => {
            if (snap.exists()) {
                setFields(snap.data().fields || []);
            } else {
                // 초기 기본 필드 설정
                setFields([
                    { id: 'date', label: '작업일자', type: 'date', required: true },
                    { id: 'location', label: '작업위치', type: 'text', required: true, placeholder: '현장 위치 입력' },
                    { id: 'work_type', label: '작업공정', type: 'text', required: true, placeholder: '공정명 자동 입력' },
                    { id: 'work_qty', label: '작업량', type: 'text', required: false, placeholder: '단위 포함 입력' }
                ]);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // 설정 저장
    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'ui_config', 'work_modal'), {
                fields,
                updatedAt: Date.now()
            });
            alert("입력 모달 설계가 저장되었습니다. 모든 공정에 공통 적용됩니다.");
        } catch (err) {
            console.error(err);
            alert("저장 실패");
        } finally {
            setSaving(false);
        }
    };

    const addField = () => {
        const newField: ModalField = {
            id: `field_${Date.now()}`,
            label: '새 항목',
            type: 'text',
            required: false,
            placeholder: ''
        };
        setFields([...fields, newField]);
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const updateField = (id: string, updates: Partial<ModalField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    if (loading) return <DashboardLayout><div className="p-8 text-center">설정 로드 중...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="p-8 max-w-4xl mx-auto space-y-8">
                {/* 헤더 섹션 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">공통 입력모달 설계 ⚙️</h1>
                        <p className="text-slate-500 mt-2 text-sm">작업발행 시 모든 공정 아이템에 공통으로 나타날 입력창을 설계합니다.</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => window.location.href = '/admin/process-design'}
                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm"
                        >
                            ← 공정 관리로 이동
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                        >
                            {saving ? '저장 중...' : '설계 확정/저장'}
                        </button>
                    </div>
                </div>

                {/* 필드 설계 리스트 */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800">입력 항목 구성</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{fields.length}개 필드 정의됨</p>
                    </div>

                    <div className="p-8 space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="group bg-slate-50/50 p-6 rounded-3xl border border-transparent hover:border-blue-200 hover:bg-white transition-all flex items-start gap-6 relative">
                                <div className="pt-2">
                                    <span className="text-xs font-black text-slate-300 font-mono">#{index + 1}</span>
                                </div>
                                
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1">라벨명</label>
                                        <input 
                                            type="text" 
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1">데이터 타입</label>
                                        <select 
                                            value={field.type}
                                            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-medium"
                                        >
                                            <option value="text">텍스트(한줄)</option>
                                            <option value="number">숫자</option>
                                            <option value="date">날짜</option>
                                            <option value="textarea">텍스트(여러줄)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1">힌트(Placeholder)</label>
                                        <input 
                                            type="text" 
                                            value={field.placeholder || ''}
                                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                                            placeholder="예: 내용을 입력하세요"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 h-full pt-4">
                                        <label className="flex items-center gap-2 cursor-pointer group/check">
                                            <input 
                                                type="checkbox" 
                                                checked={field.required}
                                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs font-bold text-slate-500">필수</span>
                                        </label>
                                        <button 
                                            onClick={() => removeField(field.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors ml-auto"
                                            title="삭제"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button 
                            onClick={addField}
                            className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-500 transition-all flex items-center justify-center gap-2"
                        >
                            <span>+</span> 새 입력 항목 추가
                        </button>
                    </div>

                    <div className="p-8 bg-blue-50/30 border-t border-slate-100">
                        <div className="flex items-start gap-4">
                            <span className="text-xl">⚠️</span>
                            <div className="space-y-1">
                                <p className="text-sm text-blue-900 font-bold">주의사항</p>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    설계를 변경하면 <strong>앞으로 발생하는 모든 작업발행</strong>에 즉시 적용됩니다. <br />
                                    기존에 생성된 데이터에는 영향을 주지 않지만, 통계 집계를 위해 &apos;라벨명&apos;을 일관성 있게 관리해 주세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
