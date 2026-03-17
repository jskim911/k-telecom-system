"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    userData: any | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("AuthContext: Initializing...");
        
        // Safety timeout: 8초 동안 반응이 없으면 무조건 로딩 해제
        const timeoutId = setTimeout(() => {
            setLoading((currentLoading) => {
                if (currentLoading) {
                    console.error("AuthContext: Initialization timed out after 8s. Forcing loading to false.");
                    return false;
                }
                return currentLoading;
            });
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log("AuthContext: Auth state changed. User:", currentUser?.uid || "None");
            try {
                setUser(currentUser);
                if (currentUser) {
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        console.log("AuthContext: User data found in Firestore");
                        setUserData(userDoc.data());
                    } else {
                        console.log("AuthContext: No user data found in Firestore");
                        setUserData(null);
                    }
                } else {
                    setUserData(null);
                }
            } catch (error) {
                console.error("AuthContext: Error fetching user data:", error);
                setUserData(null);
            } finally {
                setLoading(false);
                clearTimeout(timeoutId);
                console.log("AuthContext: Loading set to false");
            }
        });

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
