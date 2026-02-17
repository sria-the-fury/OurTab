import useSWR from 'swr';
import { useAuth } from '@/components/AuthContext';

export interface Group {
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
    groupId: string;
    date: string;
    contributors?: Array<{ email: string; amount: number }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGroupData() {
    const { user } = useAuth();

    // 1. Fetch group details
    const { data: group, error: groupError, isLoading: groupLoading, mutate: mutateGroup } = useSWR<Group>(
        user?.email ? `/api/groups/my-group?email=${user.email}` : null,
        fetcher
    );

    // 2. Fetch expenses (dependent on group ID)
    const { data: expenses, error: expensesError, isLoading: expensesLoading, mutate: mutateExpenses } = useSWR<Expense[]>(
        group?.id ? `/api/expenses?groupId=${group.id}` : null,
        fetcher
    );

    return {
        group,
        expenses: expenses || [],
        loading: groupLoading || (!!group?.id && expensesLoading),
        error: groupError || expensesError,
        mutateGroup,
        mutateExpenses
    };
}
