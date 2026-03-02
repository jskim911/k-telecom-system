"use client";

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2">🏠 홈 / <span className="text-gray-800 font-medium">Settings</span></div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">기준 정보 관리</h1>
                <p className="text-sm text-gray-500">프로젝트 기본 정보 및 마스터 데이터 관리</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 프로젝트 기본 정보 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">📋 프로젝트 기본 정보</h2>
                    <div className="space-y-3">
                        {[
                            { label: '공사명', value: 'OO지역 통신선로 구축 공사' },
                            { label: '발주처', value: '한국전력공사' },
                            { label: '시공사', value: '(주)OO통신' },
                            { label: '감리사', value: '(주)OO엔지니어링' },
                            { label: '공사 기간', value: '2024-03-01 ~ 2024-06-30' },
                            { label: '공사 금액', value: '1,250,000,000원' },
                            { label: '현장 주소', value: '경기도 OO시 OO구 OO로 123' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <span className="text-sm text-gray-500 font-medium">{item.label}</span>
                                <span className="text-sm text-gray-800 font-semibold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <button className="mt-4 w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">✏️ 정보 수정</button>
                </div>

                {/* 감리원 정보 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">👷 감리원 정보</h2>
                    <div className="space-y-3">
                        {[
                            { name: '김현장', role: '총괄감리원', cert: '감리기술사', avatar: 'PM' },
                            { name: '이영희', role: '현장감리원', cert: '통신기사', avatar: 'LE' },
                            { name: '박준형', role: '안전감리원', cert: '안전기사', avatar: 'PJ' },
                            { name: '최민수', role: '품질감리원', cert: '품질기사', avatar: 'CM' },
                        ].map((person, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {person.avatar}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">{person.name}</p>
                                    <p className="text-xs text-gray-400">{person.role}</p>
                                </div>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">{person.cert}</span>
                            </div>
                        ))}
                    </div>
                    <button className="mt-4 w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">+ 감리원 추가</button>
                </div>
            </div>
        </DashboardLayout>
    );
}
