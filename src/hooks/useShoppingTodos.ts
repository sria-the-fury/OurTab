import useSWR from 'swr';
import { useAuth } from '@/components/AuthContext';

export interface ShoppingTodo {
    id: string;
    itemName: string;
    houseId: string;
    addedBy: string;
    isCompleted: boolean;
    createdAt: string;
    completedAt?: string;
    completedBy?: string;  // user email, or 'auto' for auto-marked
    expenseId?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useShoppingTodos() {
    const { house } = useAuth();

    const { data: todos, error, isLoading, mutate } = useSWR<ShoppingTodo[]>(
        house?.id ? `/api/shopping-todos?houseId=${house.id}` : null,
        fetcher
    );

    const addTodo = async (itemName: string, addedBy: string) => {
        if (!house?.id) return;

        try {
            const res = await fetch('/api/shopping-todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemName, houseId: house.id, addedBy })
            });
            if (res.ok) {
                mutate();
                return await res.json();
            }
        } catch (err) {
            console.error('Failed to add todo:', err);
        }
    };

    const toggleTodo = async (id: string, isCompleted: boolean, completedBy?: string) => {
        try {
            const res = await fetch('/api/shopping-todos', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isCompleted, completedBy })
            });
            if (res.ok) {
                mutate();
            }
        } catch (err) {
            console.error('Failed to toggle todo:', err);
        }
    };

    const deleteTodo = async (id: string) => {
        try {
            const res = await fetch(`/api/shopping-todos?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                mutate();
            }
        } catch (err) {
            console.error('Failed to delete todo:', err);
        }
    };

    return {
        todos: todos || [],
        loading: isLoading,
        error,
        addTodo,
        toggleTodo,
        deleteTodo,
        mutate
    };
}
