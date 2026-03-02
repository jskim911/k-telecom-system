import ProtectedRoute from "@/components/ProtectedRoute";
import HwpxDownloadButton from "@/components/HwpxDownloadButton";
import DailyReportForm from "@/components/DailyReportForm";
import ProgressForm from "@/components/ProgressForm";
import DocumentBoxForm from "@/components/DocumentBoxForm";
import SafetyPhotoForm from "@/components/SafetyPhotoForm";

export default function Home() {
    return (
        <ProtectedRoute>
            <main className="flex min-h-screen flex-col items-center bg-gray-50 p-8 pb-20">
                <div className="w-full max-w-5xl mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-[#1A56DB] mb-2">
                            K-Telecom 스마트 공사감리
                        </h1>
                        <p className="text-lg text-gray-600">
                            대시보드 운영 테스트 패널
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                    <DailyReportForm />
                    <ProgressForm />
                    <DocumentBoxForm />
                    <SafetyPhotoForm />
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8 w-full max-w-5xl flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold mb-1">HWPX 다운로드 테스트</h2>
                        <p className="text-sm text-gray-500">Node 서버리스 API를 거쳐 한글문서를 렌더링합니다.</p>
                    </div>
                    <HwpxDownloadButton />
                </div>
            </main>
        </ProtectedRoute>
    )
}
