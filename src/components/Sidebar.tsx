"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
    { label: '대시보드', icon: '📊', href: '/' },
    { label: '공정 관리', icon: '📅', href: '/schedule' },
    { label: '감리일보', icon: '📝', href: '/daily-report' },
    { label: '품질/검측', icon: '🔍', href: '/quality' },
    { label: '안전 관리', icon: '⚠️', href: '/safety' },
    { label: '문서 관리', icon: '📁', href: '/documents' },
    { label: '기준 정보', icon: '⚙️', href: '/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed top-0 left-0 h-screen w-[240px] bg-[#1E293B] text-white flex flex-col z-50">
            {/* 로고 */}
            <div className="px-6 py-6 border-b border-slate-700">
                <h1 className="text-lg font-bold text-blue-400">TeleCom PIMS</h1>
                <p className="text-xs text-slate-400 mt-0.5">Construction Manager</p>
            </div>

            {/* 메뉴 */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* 하단 프로필 */}
            <div className="px-4 py-4 border-t border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                        PM
                    </div>
                    <div>
                        <p className="text-sm font-semibold">김현장 소장</p>
                        <p className="text-xs text-slate-400">현장관리자</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
