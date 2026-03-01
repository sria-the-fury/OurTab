'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { House } from '@/hooks/useHouseData';

interface AuthContextType {
    user: User | null;
    house: House | null;
    currency?: string;
    dbUser: any;
    loading: boolean;
    signIn: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logOut: () => Promise<void>;
    logout: () => Promise<void>;
    updateCurrency: (newCurrency: string) => Promise<void>;
    mutateUser: () => void;
    mutateHouse: () => void;
    notificationPermission: NotificationPermission;
    isNotificationSupported: boolean;
    requestNotificationPermission: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    house: null,
    currency: undefined,
    dbUser: null,
    loading: true,
    signIn: async () => { },
    signInWithGoogle: async () => { },
    logOut: async () => { },
    logout: async () => { },
    updateCurrency: async () => { },
    mutateUser: () => { },
    mutateHouse: () => { },
    notificationPermission: 'default',
    isNotificationSupported: false,
    requestNotificationPermission: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Use SWR to keep house data accessible globally in context
    const { data: userData, mutate: mutateUser } = useSWR(
        user?.email ? `/api/users?email=${user.email}` : null,
        url => fetch(url).then(res => res.json())
    );

    // Use SWR to keep house details accessible
    const { data: house, mutate: mutateHouse } = useSWR(
        user?.email ? `/api/houses/my-house?email=${user.email}` : null,
        url => fetch(url).then(res => res.json()),
        { refreshInterval: 5000 }
    );

    const updateCurrency = async (newCurrency: string) => {
        if (!house?.id) return;
        try {
            const res = await fetch('/api/houses/update-currency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ houseId: house.id, currency: newCurrency }),
            });
            if (res.ok) {
                mutateHouse();
            }
        } catch (error) {
            console.error("Error updating currency:", error);
        }
    };

    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [isNotificationSupported, setIsNotificationSupported] = useState(false);

    // Initial check for support and existing permission
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsNotificationSupported('Notification' in window && 'serviceWorker' in navigator && !!messaging);
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const requestNotificationPermission = async () => {
        if (!user || !isNotificationSupported || !messaging) return false;

        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);

            if (permission === 'granted') {
                // Register service worker with config as query params
                const configParams = new URLSearchParams({
                    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
                    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
                    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
                    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
                    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
                }).toString();

                const swRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${configParams}`);

                const currentToken = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: swRegistration
                });

                if (currentToken) {
                    console.log('FCM Token received:', currentToken);
                    await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: user.email,
                            fcmToken: currentToken
                        }),
                    });
                    mutateUser();
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.error('Error requesting notification permission:', err);
            return false;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Sync user to DB
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
                            mutateUser();
                        }
                    });

                    // If permission is already granted, try to refresh token silently
                    if ('Notification' in window && Notification.permission === 'granted' && messaging) {
                        // We don't block login on this
                        requestNotificationPermission().catch(() => { });
                    }
                } catch (error) {
                    console.error("Error syncing user with DB:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [mutateUser, isNotificationSupported]);

    const signIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in:", error);
        }
    };

    const logOut = async () => {
        try {
            await signOut(auth);
            setUser(null);
            router.push('/');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            house: house || null,
            currency: house?.currency,
            dbUser: userData,
            loading,
            signIn,
            signInWithGoogle: signIn,
            logOut,
            logout: logOut,
            updateCurrency,
            mutateUser,
            mutateHouse,
            notificationPermission,
            isNotificationSupported,
            requestNotificationPermission
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
