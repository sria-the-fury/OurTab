'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { House } from '@/hooks/useHouseData';
import { UserData } from '@/hooks/useUserData';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    currency: string;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    updateCurrency: (newCurrency: string) => Promise<void>;
    // Expose cached data
    dbUser: UserData | null;
    house: House | null;
    mutateUser: () => Promise<unknown>;
    mutateHouse: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    currency: 'USD',
    signInWithGoogle: async () => { },
    logout: async () => { },
    updateCurrency: async () => { },
    dbUser: null,
    house: null,
    mutateUser: async () => undefined,
    mutateHouse: async () => undefined,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const router = useRouter();

    // Define fetcher
    const fetcher = (url: string) => fetch(url).then(res => res.json());

    // 1. Fetch User Data
    const { data: userData, mutate: mutateUser } = useSWR<UserData>(
        user?.email ? `/api/users?email=${user.email}` : null,
        fetcher
    );

    // 2. Fetch House Data (fetches via email; server handles no-house case)
    const { data: houseData, mutate: mutateHouse } = useSWR<House>(
        user?.email ? `/api/houses/my-house?email=${user.email}` : null,
        fetcher
    );

    // Derived state
    // Currency always comes from the house; default to USD before joining one
    const currency = houseData?.currency || 'USD';

    // Overall loading state: Auth is initial load, but we might want to wait for data?
    // Usually only wait for Auth (user presence). Data can pop in.
    const loading = authLoading;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Sync user to DB (fire and forget / optimistic)
                // We do this to ensure Google Auth users exist in our DB
                try {
                    fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: firebaseUser.email,
                            name: firebaseUser.displayName,
                            photoUrl: firebaseUser.photoURL,
                        }),
                    }).then(res => {
                        if (res.ok) {
                            mutateUser(); // Revalidate user data after sync
                        }
                    });
                } catch (error) {
                    console.error("Error syncing user with DB:", error);
                }
            }
            setUser(firebaseUser);
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, [mutateUser]);

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
        if (user?.email && houseData?.id) {
            try {
                await fetch('/api/houses/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ houseId: houseData.id, currency: newCurrency, userEmail: user.email })
                });
                mutateHouse();
            } catch (error) {
                console.error('Failed to update house currency', error);
            }
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            currency,
            signInWithGoogle,
            logout,
            updateCurrency,
            dbUser: userData || null,
            house: houseData || null,
            mutateUser,
            mutateHouse
        }}>
            {children}
        </AuthContext.Provider>
    );
};
