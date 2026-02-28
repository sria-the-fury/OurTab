import useSWR from 'swr';
import { useAuth } from '@/components/AuthContext';

export interface House {
    id: string;
    name: string;
    createdBy: string;
    createdAt?: string;
    currency?: string;
    typeOfHouse?: 'expenses' | 'meals_and_expenses';
    mealsPerDay?: 2 | 3;
    mealUpdateWindowStart?: string; // e.g. "20:00" — when members can start updating next day meals
    mealUpdateWindowEnd?: string;   // e.g. "05:00" — when the update window closes (next morning)
    mealOffRequests?: Record<string, {
        requestedAt: string;
        status: 'pending' | 'approved';
    }>;
    members?: {
        email: string;
        name?: string;
        photoUrl?: string;
        role?: 'manager' | 'member';
        rentAmount?: number;
        profession?: string;
        birthday?: string;
        whatsapp?: string;
        messenger?: string;
        iban?: string;
        wallet?: string;
        mealsEnabled?: boolean;
        offFromDate?: string; // YYYY-MM-DD
    }[];
    memberDetails?: Record<string, {
        role: 'manager' | 'member',
        rentAmount: number,
        mealsEnabled?: boolean,
        offFromDate?: string
    }>;
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
    category?: string;
    contributors?: Array<{ email: string; amount: number }>;
    isSettlementPayment?: boolean;
    method?: 'bank' | 'cash';
    createdAt?: string;
    approvedAt?: string;
    settlementBetween?: string[];
}

export interface ExpenseTodo {
    id: string;
    itemName: string;
    isCompleted: boolean;
    addedBy: string;
    houseId: string;
    createdAt: string;
    completedAt?: string;
}

export interface Settlement {
    id?: string;
    houseId: string;
    month: number; // 0-11
    year: number;
    settlements: {
        from: string; // email
        to: string; // email
        amount: number;
        paid: boolean;
    }[];
    createdAt: string;
    updatedAt: string;
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
    const { data: todos, error: todosError, isLoading: todosLoading, mutate: mutateTodos } = useSWR<ExpenseTodo[]>(
        house?.id ? `/api/expense-todos?houseId=${house.id}` : null,
        fetcher
    );

    // 4. Fetch Fund Deposits
    const { data: fundDeposits, error: fundDepositsError, isLoading: fundDepositsLoading, mutate: mutateFundDeposits } = useSWR<any[]>(
        house?.id ? `/api/fund-deposits?houseId=${house.id}` : null,
        fetcher
    );

    // 5. Fetch Meal Statuses
    const { data: meals, error: mealsError, isLoading: mealsLoading, mutate: mutateMeals } = useSWR<any[]>(
        house?.typeOfHouse === 'meals_and_expenses' ? `/api/meals?houseId=${house.id}` : null,
        fetcher
    );

    // 6. Fetch Settlements
    const { data: settlements, error: settlementsError, isLoading: settlementsLoading, mutate: mutateSettlements } = useSWR<Settlement[]>(
        house?.id ? `/api/settlements?houseId=${house.id}` : null,
        fetcher
    );

    return {
        house,
        expenses: Array.isArray(expenses) ? expenses : [],
        todos: Array.isArray(todos) ? todos : [],
        fundDeposits: Array.isArray(fundDeposits) ? fundDeposits : [],
        meals: Array.isArray(meals) ? meals : [],
        settlements: Array.isArray(settlements) ? settlements : [],
        loading: houseLoading || (!!house?.id && (expensesLoading || todosLoading || fundDepositsLoading || mealsLoading || settlementsLoading)),
        error: houseError || expensesError || todosError || fundDepositsError || mealsError || settlementsError,
        mutateHouse,
        mutateExpenses,
        mutateTodos,
        mutateFundDeposits,
        mutateMeals,
        mutateSettlements
    };
}
