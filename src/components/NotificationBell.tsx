'use client';

import { useEffect, useState, useRef } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { playNotificationSound } from '@/utils/notificationSound';

async function requestBrowserPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

function showBrowserNotification(senderName?: string, message?: string, icon?: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return; // Only alert when tab is in background

    const title = senderName ? `${senderName} — OurTab` : 'OurTab';
    const body = message || 'You have a new notification.';
    const n = new Notification(title, { body, icon: icon || '/favicon.ico', silent: true });
    setTimeout(() => n.close(), 6000);
}

export default function NotificationBell() {
    const router = useRouter();
    const { unreadCount, notifications } = useNotifications();
    const prevCountRef = useRef<number | null>(null); // null = not yet initialized
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        requestBrowserPermission();
    }, []);

    useEffect(() => {
        if (!mounted || unreadCount === undefined) return;

        // First time we get data: just record the baseline, no sound
        if (prevCountRef.current === null) {
            prevCountRef.current = unreadCount;
            return;
        }

        // Only play sound if count genuinely increased
        if (unreadCount > prevCountRef.current) {
            playNotificationSound();
            const latest = notifications.find(n => !n.read);
            showBrowserNotification(latest?.senderName, latest?.message, latest?.senderPhotoUrl);
        }
        prevCountRef.current = unreadCount;
    }, [unreadCount, mounted, notifications]);

    if (!mounted) return null;

    return (
        <IconButton
            color="primary"
            onClick={() => router.push('/notifications')}
            sx={{
                bgcolor: 'background.paper',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.1)' }
            }}
        >
            <Badge badgeContent={unreadCount} color="error" overlap="circular">
                <NotificationsIcon />
            </Badge>
        </IconButton>
    );
}
