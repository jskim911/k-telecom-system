"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const documents = [
    { name: '착공계_최종.pdf', category: 'Contract', categoryColor: 'bg-orange-100 text-orange-700', size: '2.5MB', author: '박공무', date: '2024-02-28', icon: '📄' },
    { name: '통신선로_시공상세도_V2.dwg', category: 'Drawing', categoryColor: 'bg-purple-100 text-purple-700', size: '15.4MB', author: '최설계', date: '2024-03-10', icon: '📐' },
    { name: '3월_월간_공정_보고서.pptx', category: 'Report', categoryColor: 'bg-blue-100 text-blue-700', size: '5.1MB', author: '김현장', date: '2024-04-01', icon: '📊' },
    { name: '감리일보_0401.hwpx', category: '감리일보', categoryColor: 'bg-green-100 text-green-700', size: '1.2MB', author: '이감리', date: '2024-04-01', icon: '📝' },
    { name: '자재검수_성적서.pdf', category: '품질서류', categoryColor: 'bg-teal-100 text-teal-700', size: '3.8MB', author: '감리단장', date: '2024-03-28', icon: '✅' },
    { name: '안전관리계획서_V3.pdf', category: '안전서류', categoryColor: 'bg-red-100 text-red-700', size: '4.2MB', author: '박안전', date: '2024-03-05', icon: '🛡️' },
];

export default function DocumentsPage() {
    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Documents</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">문서/도면 관리</h1>
                    <p className="text-sm text-gray-500">프로젝트 산출물 및 도면 버전 관리</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">+ 문서 업로드</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition cursor-pointer">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                            {doc.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${doc.categoryColor}`}>{doc.category}</span>
                                <span className="text-xs text-gray-400">{doc.size}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-400">{doc.author}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-400">{doc.date}</span>
                            </div>
                        </div>
                        <button className="text-gray-400 hover:text-blue-600 transition text-sm">⬇️</button>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
}
