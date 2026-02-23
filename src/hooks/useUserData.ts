import useSWR from 'swr';
import { useAuth } from '@/components/AuthContext';

export interface UserData {
    email: string;
    name?: string;
    photoUrl?: string;
    currency?: string;
    groupId?: string; // Stored as groupId in Firestore, but conceptually houseId
    iban?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
});

export function useUserData() {
    const { user } = useAuth();

    const { data: userData, error, isLoading, mutate } = useSWR<UserData>(
        user?.email ? `/api/users?email=${user.email}` : null,
        fetcher
    );

    return {
        userData,
        loading: isLoading,
        error,
        mutate
    };
}
