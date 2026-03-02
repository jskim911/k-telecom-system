"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (userData && userData.status === "pending") {
                // Allow access to a specific "pending" approval page if needed
                if (pathname !== "/pending") {
                    router.push("/pending");
                }
            }
        }
    }, [user, userData, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-500">인증 정보를 확인 중입니다...</p>
            </div>
        );
    }

    // Pending user handling (optional, adjust according to project needs)
    if (user && userData?.status === "pending" && pathname !== "/pending") {
        return null; // Will redirect in useEffect
    }

    if (!user && pathname !== "/login") {
        return null; // Will redirect in useEffect
    }

    return <>{children}</>;
}
