"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface MappingItem {
    id: string;
    templateName: string;
    documentType: string;
    dataSource: string;
    fieldCount: number;
    mappings: Record<string, string>;
    createdAt: any;
}

export default function TemplatesPage() {
    const [mappings, setMappings] = useState<MappingItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Firestore 매핑 정보 구독
    useEffect(() => {
        const colRef = collection(db, 'template_mappings');
        const q = query(colRef, orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const items: MappingItem[] = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
            })) as MappingItem[];
            setMappings(items);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">📋 양식 및 매핑 관리</h1>
                        <p className="text-sm text-gray-500 mt-1">구글 독스 양식 및 데이터 매핑 현황을 확인합니다.</p>
                    </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-start gap-4">
                    <span className="text-2xl">⚡</span>
                    <div className="space-y-1">
                        <p className="text-sm text-indigo-900 font-bold">구글 독스 전환 완료</p>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                            이제 별도의 로컬 에이전트 없이 웹에서 직접 구글 독스 양식을 연결할 수 있습니다. <br />
                            <strong>감리일보</strong> 메뉴에서 &apos;구글독스 자동 양식&apos; 버튼을 클릭하여 양식 URL을 입력하세요.
                        </p>
                    </div>
                </div>

                {/* 등록된 매핑 목록 (Legacy) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800">기존 매핑 정보 (참고용)</h2>
                        <span className="text-xs text-gray-400">{mappings.length}개</span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
                    ) : mappings.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <p className="text-sm">표시할 매핑 정보가 없습니다.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3 text-left">양식명</th>
                                    <th className="px-6 py-3 text-left">데이터 소스</th>
                                    <th className="px-6 py-3 text-center">필드 수</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {mappings.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-800">{m.templateName}</td>
                                        <td className="px-6 py-4 text-gray-600">{m.dataSource}</td>
                                        <td className="px-6 py-4 text-center text-gray-600 font-mono">{m.fieldCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
