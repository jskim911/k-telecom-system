"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (err: any) {
            setError("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">K-Telecom</h1>
                <p className="text-gray-500 mb-6 text-sm">스마트 공사감리 시스템에 오신 것을 환영합니다.</p>

                {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                        <input
                            type="email"
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="admin@k-telecom.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-[#1A56DB] text-white rounded-md px-4 py-2 hover:bg-blue-700 transition font-medium mt-6"
                    >
                        로그인
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500 font-medium">
                        계정이 없으신가요?{" "}
                        <Link href="/signup" className="text-[#1A56DB] font-bold hover:underline">
                            회원가입 요청
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
