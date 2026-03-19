"use client";

import React, { useState, useEffect } from 'react';
import {
    analyzeGDocTemplate,
    generateGDocDocument,
    extractDocIdFromUrl,
    GDocAnalysisResult,
    GDocGenerateResult
} from '@/lib/gdoc-client';

interface GDocDynamicModalProps {
    isOpen: boolean;
    onClose: () => void;
    prefillData?: Record<string, string>;
    onSave?: (data: Record<string, string>) => Promise<void>;
    documentType?: string;
    forceGenerate?: boolean;
    initialDocUrl?: string; // 추가: 초기 URL 주입
}

/**
 * 구글 독스 동적 양식 입력 모달
 * 구글 독스 ID 또는 URL을 입력하면 내부 태그({{태그}})를 분석하여 자동으로 입력창을 생성합니다.
 */
export default function GDocDynamicModal({ isOpen, onClose, prefillData, onSave, documentType, forceGenerate, initialDocUrl }: GDocDynamicModalProps) {
    const [step, setStep] = useState<'select' | 'input' | 'result'>('select');
    const [docUrl, setDocUrl] = useState<string>('');
    const [analysis, setAnalysis] = useState<GDocAnalysisResult | null>(null);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generateResult, setGenerateResult] = useState<GDocGenerateResult | null>(null);
    const [recentTemplates, setRecentTemplates] = useState<any[]>([]);

    // 초기화 및 데이터 주입
    useEffect(() => {
        const initializeModal = async () => {
            if (!isOpen) {
                setStep('select');
                setDocUrl('');
                setAnalysis(null);
                setFormData({});
                setError(null);
                setGenerateResult(null);
            } else {
                // 메뉴별로 독립된 키 생성
                const typeSuffix = documentType ? `_${documentType}` : '';
                const templatesKey = `gdoc_recent_templates${typeSuffix}`;
                const cacheKey = `gdoc_analysis_cache${typeSuffix}`;

                // 분석 데이터 캐시 로드
                const cacheSaved = localStorage.getItem(cacheKey);
                const analysisCache = cacheSaved ? JSON.parse(cacheSaved) : {};

                // 최근 사용 양식 로드
                const saved = localStorage.getItem(templatesKey);
                const parsedTemplates = saved ? JSON.parse(saved) : [];
                setRecentTemplates(parsedTemplates);

                if (initialDocUrl) {
                    await handleAnalyze(initialDocUrl);
                } else if (parsedTemplates.length > 0) {
                    const defaultTemplate = parsedTemplates[0];
                    const docId = extractDocIdFromUrl(defaultTemplate.url);

                    if (analysisCache[docId]) {
                        console.log(`Using cached analysis for ${documentType}:`, docId);
                        const result = analysisCache[docId];
                        setAnalysis(result);
                        setDocUrl(defaultTemplate.url);
                        
                        const initialData = setupInitialFormData(result, prefillData);
                        setFormData(initialData);
                        
                        if (forceGenerate) {
                            await handleSaveAndGenerate(result, true);
                        } else {
                            setStep('input');
                        }
                    } else {
                        const result = await handleAnalyze(defaultTemplate.url);
                        if (forceGenerate && result) {
                            await handleSaveAndGenerate(result, true);
                        }
                    }
                }
            }
        };

        initializeModal();
    }, [isOpen, documentType, initialDocUrl]); // Added initialDocUrl to dependencies

    const handleAnalyze = async (specificUrl?: string): Promise<GDocAnalysisResult | null> => {
        const targetUrl = specificUrl || docUrl.trim();
        if (!targetUrl) {
            if (!specificUrl) setError("구글 독스 URL 또는 ID를 입력해주세요.");
            return null;
        }

        const docId = extractDocIdFromUrl(targetUrl);
        
        // 중복 방지: 이미 분석된 결과가 있고 ID가 같다면 즉시 입력 단계로
        if (analysis && analysis.documentId === docId) {
            setStep('input');
            return analysis;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await analyzeGDocTemplate(docId);
            setAnalysis(result);

            // 최근 사용 양식 저장
            const newRecent = {
                id: result.documentId,
                title: result.title,
                url: targetUrl,
                timestamp: Date.now()
            };
            
            // 메뉴별 구분 키
            const typeSuffix = documentType ? `_${documentType}` : '';
            const templatesKey = `gdoc_recent_templates${typeSuffix}`;
            const cacheKey = `gdoc_analysis_cache${typeSuffix}`;

            const currentSaved = localStorage.getItem(templatesKey);
            const currentParsed = currentSaved ? JSON.parse(currentSaved) : [];

            const updatedRecent = [
                newRecent,
                ...currentParsed.filter((t: any) => t.id !== result.documentId)
            ].slice(0, 5);

            localStorage.setItem(templatesKey, JSON.stringify(updatedRecent));
            setRecentTemplates(updatedRecent);

            // 분석 결과 캐시 저장 (성능 최적화)
            const cacheSaved = localStorage.getItem(cacheKey);
            const analysisCache = cacheSaved ? JSON.parse(cacheSaved) : {};
            analysisCache[docId] = result;
            localStorage.setItem(cacheKey, JSON.stringify(analysisCache));

            // 초기 폼 데이터 구성
            const initialData = setupInitialFormData(result, prefillData);

            setFormData(initialData);
            setStep('input');
            return result;
        } catch (err: any) {
            setError(err.message || "구글 독스 양식 분석 실패. 공유 설정을 확인해주세요.");
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * 초기 폼 데이터 매핑 로직 (캐시된 데이터나 prefillData 기반)
     */
    const setupInitialFormData = (result: GDocAnalysisResult, prefill?: Record<string, string>) => {
        const initialData: Record<string, string> = {};
        const aliasMap: Record<string, string> = {
            '작업날짜': 'date', '날짜': 'date',
            '공종': 'work_type', '작업종류': 'work_type',
            '위치': 'location', '작업위치': 'location',
            '인원': 'workers', '작업자': 'workers',
            '수량': 'work_qty', '물량': 'work_qty'
        };

        result.placeholders?.forEach((p: any) => {
            const tagName = p.name;
            if (prefill && prefill[tagName]) {
                initialData[tagName] = prefill[tagName];
            } else if (prefill) {
                const englishKey = aliasMap[tagName];
                initialData[tagName] = (englishKey && prefill[englishKey]) ? prefill[englishKey] : "";
            } else {
                initialData[tagName] = "";
            }
        });
        return initialData;
    };

    // 데이터만 DB에 저장하는 핸들러
    const handleOnlySave = async () => {
        setLoading(true);
        setError(null);
        try {
            const combinedData = { ...prefillData, ...formData };
            if (onSave) {
                await onSave(combinedData);
                alert("데이터가 DB에 저장되었습니다.");
                onClose();
            }
        } catch (err: any) {
            setError(err.message || "저장 중 오류 발생");
        } finally {
            setLoading(false);
        }
    };

    // DB 저장 및 문서 생성 통합 핸들러
    const handleSaveAndGenerate = async (forcedAnalysis?: GDocAnalysisResult, skipAlert = false) => {
        const targetAnalysis = forcedAnalysis || analysis;
        if (!targetAnalysis) return;
        
        setLoading(true);
        setError(null);
        try {
            // 1. 파일명 표준화 규칙 적용: [YYYY.MM.DD] {양식명}_{현장명}
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${year}.${month}.${day}`;
            
            // 현장명/위치 추출
            const siteName = formData['location'] || formData['작업위치'] || prefillData?.['location'] || prefillData?.['작업위치'] || "";
            const finalTitle = `[${dateStr}] ${targetAnalysis.title}${siteName ? '_' + siteName : ''}`;

            // 2. 구글 독스 문서 생성
            const result = await generateGDocDocument({
                templateId: targetAnalysis.documentId,
                textData: Object.keys(formData).length > 0 ? formData : prefillData || {},
                title: finalTitle,
                documentType: documentType
            });
            
            setGenerateResult(result);

            // 3. DB 저장 (onSave 콜백 호출 - URL 포함)
            const combinedData = { ...prefillData, ...formData, gdocUrl: result.url, documentId: result.documentId };
            if (onSave) {
                await onSave(combinedData);
            }

            // 4. 생성 완료 후 즉시 닫기
            if (!skipAlert) alert("문서 생성이 완료되었습니다!");
            onClose();
            
        } catch (err: any) {
            console.error(err);
            setError(err.message || "작업 처리 중 오류 발생");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* 헤더 */}
                <div className="px-6 py-5 border-b flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-blue-500">💙</span>
                        {step === 'select' ? '구글 독스 양식 연결' : step === 'input' ? '데이터 입력' : '생성 완료'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl text-sm flex items-center gap-3">
                            <span className="text-lg">⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* Step 1: 구글 독스 URL/ID 입력 */}
                    {step === 'select' && (
                        <div className="space-y-8">
                            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4">
                                <span className="text-2xl mt-1">💡</span>
                                <div className="space-y-1">
                                    <p className="text-sm text-blue-900 font-semibold">새로운 문서 자동 생성 방식</p>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        구글 독스 양식의 URL을 복사해 넣어주세요. <br />
                                        문서 내의 <code>{"{{항목명}}"}</code> 부분을 자동으로 찾아 입력창을 만들어 드립니다.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-bold text-slate-700 block ml-1">구글 독스 URL 또는 ID</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={docUrl}
                                        onChange={(e) => setDocUrl(e.target.value)}
                                        placeholder="https://docs.google.com/document/d/..."
                                        className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                    />
                                </div>
                                <button
                                    onClick={() => handleAnalyze()}
                                    disabled={loading || !docUrl.trim()}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                                            양식 분석 중...
                                        </div>
                                    ) : '양식 불러오기'}
                                </button>
                            </div>

                            {/* 최근 사용 양식 목록 */}
                            {recentTemplates.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[11px] text-slate-400 uppercase font-bold tracking-widest ml-1">최근 사용한 양식</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {recentTemplates.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => handleAnalyze(t.url)}
                                                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left group"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <span className="text-xl">📄</span>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-bold text-slate-700 truncate">{t.title}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">{new Date(t.timestamp).toLocaleDateString()} 사용</p>
                                                    </div>
                                                </div>
                                                <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">선택 →</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 text-center">
                                <p className="text-xs text-slate-400">
                                    * 구글 독스의 공유 설정이 &quot;링크가 있는 모든 사용자&quot; <br /> 
                                    또는 전용 서비스 계정에 권한이 있어야 합니다.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: 데이터 입력 */}
                    {step === 'input' && analysis && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="text-2xl">📄</span>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-slate-800 truncate">{analysis.title}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{analysis.documentId}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setStep('select')}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1 bg-white rounded-lg border border-blue-100"
                                >
                                    양식 변경
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[11px] text-slate-400 uppercase font-bold tracking-widest">
                                        발견된 {analysis.placeholders.length}개 항목 자동 생성됨
                                    </p>
                                </div>
                                
                                <div className="space-y-4">
                                    {analysis.placeholders.length === 0 ? (
                                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-sm text-slate-400">해당 문서에서 {"{{태그}}"} 패턴을 찾지 못했습니다.</p>
                                        </div>
                                    ) : (
                                        analysis.placeholders.map((p, idx) => (
                                            <div key={idx} className="space-y-2 group">
                                                <label className="text-sm font-bold text-slate-600 flex items-center gap-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                                                    {p.name}
                                                    <span className="text-[10px] text-slate-300 font-mono font-normal">{"{{" + p.name + "}}"}</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData[p.name] || ""}
                                                    onChange={(e) => setFormData({ ...formData, [p.name]: e.target.value })}
                                                    placeholder={`${p.name} 내용을 입력하세요`}
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: 생성 결과 */}
                    {step === 'result' && generateResult && (
                        <div className="text-center py-8 space-y-6">
                            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">✨</div>
                            <div className="space-y-2">
                                <h4 className="text-2xl font-black text-slate-800">문서 생성 완료!</h4>
                                <p className="text-slate-500 text-sm">
                                    구글 드라이브에 새로운 문서가 생성되었습니다.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                                <div className="text-left space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">생성된 파일명</p>
                                    <p className="font-bold text-slate-700">{generateResult.title}</p>
                                </div>
                                
                                <div className="flex flex-col gap-3">
                                    <a
                                        href={generateResult.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        🌐 구글 독스에서 열기
                                    </a>
                                    <a
                                        href={`https://docs.google.com/document/d/${generateResult.documentId}/export?format=pdf`}
                                        className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2"
                                    >
                                        📥 PDF로 다운로드
                                    </a>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => setStep('select')}
                                className="text-sm font-bold text-slate-400 hover:text-slate-600 underline underline-offset-4"
                            >
                                다른 문서 새로 만들기
                            </button>
                        </div>
                    )}
                </div>

                {/* 푸터 버튼 */}
                {step === 'input' && (
                    <div className="px-8 py-5 border-t bg-slate-50 flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-medium">실시간으로 구글 클라우드와 동기화됩니다.</p>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors">취소</button>
                            <button
                                onClick={handleOnlySave}
                                disabled={loading}
                                className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition disabled:opacity-50 text-sm"
                            >
                                DB 저장
                            </button>
                            <button
                                onClick={() => handleSaveAndGenerate()}
                                disabled={loading}
                                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/10 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                        처리 중...
                                    </div>
                                ) : 'DB 저장 및 문서 생성'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
