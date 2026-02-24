'use client';

import { useEffect, useState, useRef } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { playNotificationSound } from '@/utils/notificationSound';

export default function NotificationBell() {
    const router = useRouter();
    const { unreadCount, notifications } = useNotifications();
    const prevCountRef = useRef(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && unreadCount > prevCountRef.current) {
            // New notification arrived
            playNotificationSound();
        }
        prevCountRef.current = unreadCount;
    }, [unreadCount, mounted]);

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
