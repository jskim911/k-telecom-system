"use client";

import React, { useState, useRef } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("감리사");
    const [pin, setPin] = useState("");
    const [signature, setSignature] = useState<File | null>(null);
    const [geminiApiKey, setGeminiApiKey] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    
    const fileRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSignature(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!name || !pin || pin.length !== 4) {
            return setError("이름과 4자리 결재 PIN을 정확히 입력해주세요.");
        }
        if (!signature) {
            return setError("서명(직인) 이미지를 업로드해주세요.");
        }

        setLoading(true);
        try {
            // 1. Auth 계정 생성
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 2. 서명 이미지 업로드
            let signatureUrl = "";
            const storageRef = ref(storage, `signatures/${uid}`);
            const snapshot = await uploadBytes(storageRef, signature);
            signatureUrl = await getDownloadURL(snapshot.ref);

            // 3. Firestore 사용자 리스트에 추가 (status: pending)
            await setDoc(doc(db, "users", uid), {
                email,
                name,
                role,
                pin, 
                signatureUrl,
                geminiApiKey: geminiApiKey.trim(), // Gemini API Key 저장
                status: "pending",
                createdAt: serverTimestamp(),
            });

            alert("회원가입 요청이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.");
            router.push("/login");
        } catch (err: any) {
            console.error("Signup error:", err);
            if (err.code === "auth/email-already-in-use") {
                setError("이미 사용 중인 이메일입니다.");
            } else {
                setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">K-Telecom</h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">스마트 공사감리 시스템 회원가입</p>
                </div>

                {error && <div className="mb-6 text-sm font-bold text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100">{error}</div>}

                <form onSubmit={handleSignup} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 label-required">이메일</label>
                            <input
                                type="email"
                                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 label-required">비밀번호</label>
                            <input
                                type="password"
                                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 label-required">성명</label>
                            <input
                                type="text"
                                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold"
                                placeholder="홍길동"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 label-required">소속/권한</label>
                            <select
                                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold bg-white"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="발주처">🏛️ 발주처</option>
                                <option value="감리사">👷 감리사</option>
                                <option value="시공사">🏗️ 시공사</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 label-required">결재 전용 PIN (4자리)</label>
                        <input
                            type="password"
                            maxLength={4}
                            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold"
                            placeholder="숫자 4자리 입력"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                            required
                        />
                        <p className="text-[10px] text-gray-400 mt-1 font-bold italic">* 스마트문서 승인 시 사용될 비밀번호입니다.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 label-required">Gemini API Key</label>
                        <input
                            type="password"
                            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold"
                            placeholder="AI 비서 사용을 위한 API 키 입력"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            required
                        />
                        <p className="text-[10px] text-gray-400 mt-1 font-bold italic">* AI 비서 기능을 사용하기 위해 구글 제미나이 API 키가 필요합니다.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 label-required">서명/인장 이미지 업로드</label>
                        <div 
                            onClick={() => fileRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 rounded-3xl p-6 text-center cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition group relative overflow-hidden h-32 flex items-center justify-center font-bold"
                        >
                            {preview ? (
                                <img src={preview} alt="Sign Preview" className="h-full object-contain" />
                            ) : (
                                <div className="text-gray-400">
                                    <p className="text-2xl mb-1">🖋️</p>
                                    <p className="text-xs">이름이 새겨진 도장이나 서명(PNG/JPG) 파일을 선택하세요</p>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileChange} 
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 disabled:opacity-50 mt-4"
                    >
                        {loading ? "처리 중..." : "회원가입 요청"}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 font-medium">
                        이미 계정이 있으신가요?{" "}
                        <Link href="/login" className="text-indigo-600 font-black hover:underline">
                            로그인
                        </Link>
                    </p>
                </div>
            </div>
            <style jsx>{`
                .label-required::after {
                    content: ' *';
                    color: #ef4444;
                }
            `}</style>
        </div>
    );
}
