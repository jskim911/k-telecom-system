"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';

interface UserData {
    id: string; // auth uid
    email: string;
    name: string;
    role: string;
    status: 'pending' | 'approved' | 'rejected';
    signatureUrl?: string;
    pin?: string;
    createdAt: any;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
            setUsers(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected' | 'pending') => {
        try {
            await updateDoc(doc(db, 'users', id), { status: newStatus });
        } catch (error) {
            console.error("Error updating user status:", error);
            alert("상태 변경 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteUser = async (id: string, email: string) => {
        if (!confirm(`사용자(${email})의 데이터를 삭제하시겠습니까?\n(주의: Authentication 계정은 Firebase Console에서 별도로 삭제해야 완전히 파기됩니다.)`)) return;
        
        try {
            await deleteDoc(doc(db, 'users', id));
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("사용자 삭제 중 오류가 발생했습니다.");
        }
    };

    const filteredUsers = users.filter(u => filter === 'all' || u.status === filter);

    const pendingCount = users.filter(u => u.status === 'pending').length;
    const approvedCount = users.filter(u => u.status === 'approved').length;

    return (
        <DashboardLayout>
            <div className="text-sm text-gray-500 mb-2 font-medium">🏠 홈 / 기획재정부 / <span className="text-gray-800 font-bold">사용자 관리</span></div>
            
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        👥 회원가입 승인 관리
                        {pendingCount > 0 && <span className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs rounded-full animate-bounce">{pendingCount}</span>}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">시스템을 이용할 감리원, 시공사 등 사용자의 가입을 승인하거나 반려합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Total Users</p>
                        <p className="text-4xl font-black text-gray-800">{users.length}</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl">👥</div>
                </div>
                <div onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')} className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex items-center justify-between cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-orange-500 bg-orange-50/10' : 'hover:bg-gray-50'}`}>
                    <div>
                        <p className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-1">Pending Approval</p>
                        <p className="text-4xl font-black text-orange-600">{pendingCount}</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl">⏳</div>
                </div>
                <div onClick={() => setFilter(filter === 'approved' ? 'all' : 'approved')} className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex items-center justify-between cursor-pointer transition-all ${filter === 'approved' ? 'ring-2 ring-emerald-500 bg-emerald-50/10' : 'hover:bg-gray-50'}`}>
                    <div>
                        <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-1">Active Users</p>
                        <p className="text-4xl font-black text-emerald-600">{approvedCount}</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl">✅</div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-800">사용자 계정 목록</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>전체보기</button>
                        <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>대기만 보기</button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center flex-col items-center py-20 gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
                        <p className="text-sm text-gray-500 font-bold tracking-widest uppercase">Loading Users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-20 text-center">
                        <span className="text-6xl opacity-20 mb-4 block">📭</span>
                        <p className="text-gray-500 font-bold">조건에 맞는 사용자가 없습니다.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    <th className="py-4 px-6 text-left">사용자 / 소속</th>
                                    <th className="py-4 px-6 text-left">이메일 계정</th>
                                    <th className="py-4 px-6 text-center">결재 서명/PIN</th>
                                    <th className="py-4 px-6 text-center">상태</th>
                                    <th className="py-4 px-6 text-center">가입일시</th>
                                    <th className="py-4 px-6 text-center w-56">관리 작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition duration-150">
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-100 flex-shrink-0">
                                                    {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-800 text-base">{user.name || '이름 미설정'}</p>
                                                    <p className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider font-bold inline-block mt-1">{user.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-gray-600 font-medium">
                                            {user.email}
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {user.signatureUrl ? (
                                                    <div className="w-12 h-8 bg-gray-50 border border-gray-100 rounded overflow-hidden flex items-center justify-center group/sign relative">
                                                        <img src={user.signatureUrl} alt="Sign" className="max-h-full max-w-full object-contain" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/sign:opacity-100 transition flex items-center justify-center backdrop-blur-[1px]">
                                                            <button onClick={() => window.open(user.signatureUrl, '_blank')} className="text-[8px] text-white font-black uppercase tracking-tighter">VIEW</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-gray-300 italic">No Sign</span>
                                                )}
                                                <span className="text-[10px] font-black text-indigo-400">PIN: {user.pin ? '••••' : 'None'}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            {user.status === 'pending' && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-orange-200 shadow-sm animate-pulse">Pending</span>}
                                            {user.status === 'approved' && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-200 shadow-sm">Approved</span>}
                                            {user.status === 'rejected' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-red-200 shadow-sm">Rejected</span>}
                                        </td>
                                        <td className="py-5 px-6 text-gray-400 text-xs font-medium text-center">
                                            {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString('ko-KR') : '-'}
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                {user.status === 'pending' || user.status === 'rejected' ? (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(user.id, 'approved')} 
                                                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-lg shadow-emerald-100"
                                                    >
                                                        Approve
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(user.id, 'pending')} 
                                                        className="px-4 py-2 border-2 border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition"
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                                
                                                {user.status === 'pending' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(user.id, 'rejected')} 
                                                        className="px-4 py-2 border-2 border-red-100 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition"
                                                    >
                                                        Reject
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => handleDeleteUser(user.id, user.email)} 
                                                    className="w-9 h-9 flex items-center justify-center border-2 border-red-100 text-red-400 rounded-xl hover:bg-red-50 transition ml-2"
                                                    title="데이터 삭제"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
