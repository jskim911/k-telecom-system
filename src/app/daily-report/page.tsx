"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import DailyReportForm from '@/components/DailyReportForm';

export default function DailyReportPage() {
    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Daily Report</span></div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">감리일보</h1>
                    <p className="text-sm text-gray-500">일일 현장 감리 보고서 작성 및 관리</p>
                </div>
            </div>
            <DailyReportForm />
        </DashboardLayout>
    );
}
