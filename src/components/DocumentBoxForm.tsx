"use client";

import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function DocumentBoxForm() {
    const [docType, setDocType] = useState('수신');
    const [sender, setSender] = useState('');
    const [receiver, setReceiver] = useState('');
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let fileUrl = '';
            if (file) {
                const fileRef = ref(storage, `documents/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(fileRef, file);
                fileUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, 'official_documents'), {
                docType,
                sender,
                receiver,
                title,
                fileUrl,
                createdAt: serverTimestamp(),
            });

            setMessage(`공문 ${docType} 기록이 성공적으로 저장되었습니다.`);
            setTitle('');
            setSender('');
            setReceiver('');
            setFile(null);
        } catch (error: any) {
            setMessage('저장 중 오류 발생: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 w-full">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">수발신 공문 등록</h2>

            {message && (
                <div className={`mb-4 p-3 rounded-md text-sm ${message.includes('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">구분</label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="수신">수신</option>
                            <option value="발신">발신</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">발신처</label>
                        <input type="text" required value={sender} onChange={(e) => setSender(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">수신처</label>
                        <input type="text" required value={receiver} onChange={(e) => setReceiver(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">문서 제목 (건명)</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none" placeholder="예: [발주처] 3월 기성 청구의 건" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">첨부 파일 (선택)</label>
                    <input type="file" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>

                <div className="pt-2 text-right">
                    <button type="submit" disabled={loading} className="px-5 py-2 bg-[#1A56DB] text-white rounded-md font-medium shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                        {loading ? '업로드 중...' : '공문 등록'}
                    </button>
                </div>
            </form>
        </div>
    );
}
