import useSWR from 'swr';
import { useAuth } from '@/components/AuthContext';

export interface House {
    id: string;
    name: string;
    createdBy: string;
    currency?: string;
    members?: { email: string; name?: string; photoUrl?: string }[];
}

export interface Expense {
    id: string;
    amount: number;
    description: string;
    userId: string;
    houseId: string;
    date: string;
    contributors?: Array<{ email: string; amount: number }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useHouseData() {
    const { user } = useAuth();

    // 1. Fetch house details
    const { data: house, error: houseError, isLoading: houseLoading, mutate: mutateHouse } = useSWR<House>(
        user?.email ? `/api/houses/my-house?email=${user.email}` : null,
        fetcher
    );

    // 2. Fetch expenses (dependent on house ID)
    const { data: expenses, error: expensesError, isLoading: expensesLoading, mutate: mutateExpenses } = useSWR<Expense[]>(
        house?.id ? `/api/expenses?houseId=${house.id}` : null,
        fetcher
    );

    return {
        house,
        expenses: expenses || [],
        loading: houseLoading || (!!house?.id && expensesLoading),
        error: houseError || expensesError,
        mutateHouse,
        mutateExpenses
    };
}
