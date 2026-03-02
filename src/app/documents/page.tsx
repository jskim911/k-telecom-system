"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import DocumentBoxForm from '@/components/DocumentBoxForm';

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
            <DocumentBoxForm />
        </DashboardLayout>
    );
}
