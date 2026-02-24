import useSWR from 'swr';
import { useAuth } from '@/components/AuthContext';

export interface House {
    id: string;
    name: string;
    createdBy: string;
    currency?: string;
    members?: { email: string; name?: string; photoUrl?: string }[];
    pendingPayments?: {
        id: string;
        from: string;
        to: string;
        amount: number;
        method?: 'cash' | 'bank';
        status: 'pending' | 'approved';
        createdAt: string;
    }[];
}

export interface Expense {
    id: string;
    amount: number;
    description: string;
    userId: string;
    houseId: string;
    date: string;
    contributors?: Array<{ email: string; amount: number }>;
    isSettlementPayment?: boolean;
    method?: 'bank' | 'cash';
    createdAt?: string;
    approvedAt?: string;
    settlementBetween?: string[];
}

export interface Todo {
    id: string;
    itemName: string;
    isCompleted: boolean;
    addedBy: string;
    houseId: string;
    createdAt: string;
    completedAt?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useHouseData() {
    const { user } = useAuth();

    // 1. Fetch house details (poll every 5s for real-time payment request updates)
    const { data: house, error: houseError, isLoading: houseLoading, mutate: mutateHouse } = useSWR<House>(
        user?.email ? `/api/houses/my-house?email=${user.email}` : null,
        fetcher,
        { refreshInterval: 5000, revalidateOnFocus: true }
    );

    // 2. Fetch expenses (poll every 5s for real-time approval updates)
    const { data: expenses, error: expensesError, isLoading: expensesLoading, mutate: mutateExpenses } = useSWR<Expense[]>(
        house?.id ? `/api/expenses?houseId=${house.id}` : null,
        fetcher,
        { refreshInterval: 5000, revalidateOnFocus: true }
    );

    // 3. Fetch Buy List (todos)
    const { data: todos, error: todosError, isLoading: todosLoading, mutate: mutateTodos } = useSWR<Todo[]>(
        house?.id ? `/api/shopping-todos?houseId=${house.id}` : null,
        fetcher
    );

    return {
        house,
        expenses: expenses || [],
        todos: todos || [],
        loading: houseLoading || (!!house?.id && (expensesLoading || todosLoading)),
        error: houseError || expensesError || todosError,
        mutateHouse,
        mutateExpenses,
        mutateTodos
    };
}
