"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

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
    const [pmName, setPmName] = useState('감리원');
    const [pmRole, setPmRole] = useState('');
    const [pmAvatar, setPmAvatar] = useState('PM');
    const [projectName, setProjectName] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'project'), (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            // 프로젝트명
            if (data.project?.projectName) {
                setProjectName(data.project.projectName);
            }
            // 감리원 중 첫 번째(총괄감리원)를 PM으로 표시
            const inspectors = data.inspectors;
            if (inspectors && inspectors.length > 0) {
                const pm = inspectors[0];
                setPmName(pm.name);
                setPmRole(pm.role);
                setPmAvatar(pm.avatar || pm.name.slice(0, 2));
            }
        });
        return () => unsub();
    }, []);

    return (
        <aside className="fixed top-0 left-0 h-screen w-[240px] bg-[#1E293B] text-white flex flex-col z-50">
            {/* 로고 + 프로젝트명 */}
            <div className="px-6 py-6 border-b border-slate-700">
                <h1 className="text-lg font-bold text-blue-400">TeleCom PIMS</h1>
                {projectName ? (
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight truncate" title={projectName}>{projectName}</p>
                ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Construction Manager</p>
                )}
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

            {/* 하단 PM 프로필 - Firestore 연동 */}
            <div className="px-4 py-4 border-t border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {pmAvatar}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{pmName}</p>
                        <p className="text-xs text-slate-400 truncate">{pmRole}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
