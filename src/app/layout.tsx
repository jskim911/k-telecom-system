import type { Metadata } from 'next'
import './globals.css'

import { AuthProvider } from '@/context/AuthContext'

export const metadata: Metadata = {
    title: 'K-Telecom 스마트 공사감리 시스템',
    description: '통신분야 공사감리 업무 전산화 및 HWPX 공문서 자동화 시스템',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ko">
            <head>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
            </head>
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
