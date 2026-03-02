"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SafetyPhotoForm from '@/components/SafetyPhotoForm';

export default function SafetyPage() {
    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Safety</span></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">안전 관리</h1>
                    <p className="text-sm text-gray-500">현장 위험성 평가(TBM) 및 안전 점검 현황</p>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm">📋 안전 일지 작성</button>
            </div>

            {/* 무재해 달성 배너 */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 text-white rounded-xl p-6 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">🛡️</span>
                    <div>
                        <p className="text-sm opacity-80">무재해 달성일수</p>
                        <p className="text-4xl font-bold">124 <span className="text-lg font-normal">일째</span></p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm opacity-80">최근 안전사고</p>
                    <p className="text-lg font-semibold">없음 (준공 예정일 D-50)</p>
                </div>
            </div>

            <SafetyPhotoForm />
        </DashboardLayout>
    );
}
