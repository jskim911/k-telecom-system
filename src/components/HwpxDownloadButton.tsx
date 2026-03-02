"use client";

import React, { useState } from 'react';

export default function HwpxDownloadButton() {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            // 실제 구현 시에는 Firebase Storage의 템플릿 URL을 입력합니다.
            // 여기서는 테스트를 위해 더미 URL을 입력해두었습니다. 실제 연결 전에는 에러가 날 수 있습니다.
            const payload = {
                templateUrl: "https://example.com/template.hwpx", // TODO: 실제 템플릿 URL로 교체
                mappingData: {
                    "DATE": "2026-03-02",
                    "SITE_NAME": "K-Telecom 서울지사 현장",
                    "MANAGER_NAME": "홍길동 감리원",
                    "REPORT_CONTENT": "광케이블 2km 포설 및 통신주 3본 건주 테스트 완료",
                },
                outputFileName: "감리일보_20260302.hwpx"
            };

            const response = await fetch('/api/generate-hwpx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('파일 다운로드에 실패했습니다.');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = payload.outputFileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            console.error(error);
            alert('HWPX 생성 중 오류가 발생했습니다. (템플릿 URL을 확인해주세요)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className={`px-4 py-2 mt-4 text-white font-medium rounded-md shadow-sm transition ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1A56DB] hover:bg-blue-700'
                }`}
        >
            {loading ? '문서 생성 중...' : '감리일보 HWPX 다운로드 테스트'}
        </button>
    );
}
