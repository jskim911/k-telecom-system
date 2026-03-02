"use client";

import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function SafetyPhotoForm() {
    const [photoType, setPhotoType] = useState('시공 전');
    const [description, setDescription] = useState('');
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
        if (!file) {
            setMessage('오류: 업로드할 사진을 선택해주세요.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // 1. Storage 업로드
            const fileRef = ref(storage, `safety_photos/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            const photoUrl = await getDownloadURL(snapshot.ref);

            // 2. Firestore 기록
            await addDoc(collection(db, 'safety_logs'), {
                photoType,
                description,
                photoUrl,
                createdAt: serverTimestamp(),
            });

            setMessage('현장/안전 사진이 성공적으로 업로드되었습니다.');
            setDescription('');
            setFile(null);
            // Reset file input UI manually if needed
            const fileInput = document.getElementById('safety-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error: any) {
            setMessage('저장 중 오류 발생: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 w-full mt-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">현장 / 안전관리 사진 업로드</h2>

            {message && (
                <div className={`mb-4 p-3 rounded-md text-sm ${message.includes('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">사진 유형</label>
                        <select
                            value={photoType}
                            onChange={(e) => setPhotoType(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="시공 전">시공 전</option>
                            <option value="시공 중">시공 중</option>
                            <option value="시공 후">시공 후</option>
                            <option value="안전교육/TBM">안전교육 (TBM)</option>
                            <option value="지적사항">지적/개선사항</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">사진 첨부 (필수)</label>
                        <input id="safety-file-input" type="file" accept="image/*" required onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상세 설명</label>
                    <textarea
                        required rows={2}
                        placeholder="사진에 대한 설명을 입력하세요 (예: 2층 통신단자함 케이블 결속 상태 점검)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none resize-none"
                    />
                </div>

                <div className="pt-2 text-right">
                    <button type="submit" disabled={loading} className="px-5 py-2 bg-gray-800 text-white rounded-md font-medium shadow-sm transition hover:bg-black disabled:opacity-50">
                        {loading ? '처리 중...' : '사진 올리기'}
                    </button>
                </div>
            </form>
        </div>
    );
}
