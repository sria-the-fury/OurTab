'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    currency: string;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    updateCurrency: (newCurrency: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    currency: 'USD',
    signInWithGoogle: async () => { },
    logout: async () => { },
    updateCurrency: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState('USD');

    const router = useRouter();



    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const res = await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: user.email,
                            name: user.displayName,
                            photoUrl: user.photoURL,
                        }),
                    });

                    if (res.ok) {
                        const userData = await res.json();

                        // If user has a group, fetch the group's currency
                        if (userData.groupId) {
                            const groupRes = await fetch(`/api/groups/my-group?email=${user.email}`);
                            if (groupRes.ok) {
                                const groupData = await groupRes.json();
                                // Prioritize group currency
                                if (groupData.currency) {
                                    setCurrency(groupData.currency);
                                }
                            }
                        } else if (userData.currency) {
                            setCurrency(userData.currency);
                        }
                    }
                } catch (error) {
                    console.error("Error syncing user with DB:", error);
                }
            } else {
                setCurrency('USD'); // Reset on logout
            }
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const updateCurrency = async (newCurrency: string) => {
        setCurrency(newCurrency);
        if (user?.email) {
            try {
                // Fetch latest user data to check for groupId
                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email })
                });
                if (!res.ok) return;

                const userData = await res.json();

                if (userData.groupId) {
                    await fetch('/api/groups/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ groupId: userData.groupId, currency: newCurrency, userEmail: user.email })
                    });
                } else {
                    await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email, currency: newCurrency })
                    });
                }
            } catch (error) {
                console.error("Failed to sync currency preference", error);
            }
        }
    };



    return (
        <AuthContext.Provider value={{ user, loading, currency, signInWithGoogle, logout, updateCurrency }}>
            {children}
        </AuthContext.Provider>
    );
};
