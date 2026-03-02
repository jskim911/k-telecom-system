"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Sidebar />
            <main className="ml-[240px] flex-1 p-8">
                {children}
            </main>
        </div>
    );
}
