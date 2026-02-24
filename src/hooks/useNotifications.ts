import useSWR from 'swr';
import { useAuth } from '@/components/AuthContext';
import { AppNotification } from '@/types/notification';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'An error occurred while fetching the data.');
    }
    return res.json();
};

export function useNotifications() {
    const { user } = useAuth();

    const { data: notifications, error, mutate } = useSWR<AppNotification[]>(
        user?.email ? `/api/notifications?userId=${encodeURIComponent(user.email)}` : null,
        fetcher,
        {
            refreshInterval: 10000, // Poll every 10 seconds
            revalidateOnFocus: true
        }
    );

    const rawNotifications = Array.isArray(notifications) ? notifications : [];

    // Deduplicate notifications on the frontend (just in case they got duplicated in the DB)
    const seenMap = new Map();
    const safeNotifications = rawNotifications.filter(n => {
        // Create a unique key based on message and a ~1 minute timeframe window
        const timeWindow = n.createdAt ? Math.floor(new Date(n.createdAt).getTime() / 60000) : 0;
        const dupKey = `${n.message}_${timeWindow}`;
        if (seenMap.has(dupKey)) return false;
        seenMap.set(dupKey, true);
        return true;
    });

    const unreadCount = safeNotifications.filter(n => !n.read).length || 0;
    const markAsRead = async (notificationIds: string[]) => {
        if (!user?.email || notificationIds.length === 0) return;

        // Optimistic update
        if (safeNotifications.length > 0) {
            mutate(
                safeNotifications.map(n =>
                    notificationIds.includes(n.id!) ? { ...n, read: true } : n
                ),
                false
            );
        }

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds })
            });
            mutate();
        } catch (err) {
            console.error('Error marking as read', err);
            mutate(); // Revert on failure
        }
    };

    const markAllAsRead = async () => {
        if (!user?.email) return;

        if (safeNotifications.length > 0) {
            mutate(safeNotifications.map(n => ({ ...n, read: true })), false);
        }

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true, userId: user.email })
            });
            mutate();
        } catch (err) {
            console.error('Error marking all as read', err);
            mutate();
        }
    };

    return {
        notifications: safeNotifications,
        unreadCount,
        isLoading: !error && !notifications,
        isError: error,
        markAsRead,
        markAllAsRead,
        mutate
    };
}
