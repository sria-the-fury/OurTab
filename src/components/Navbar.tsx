'use client';

import { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { useAuth } from '@/components/AuthContext';

interface Notification {
    id: string;
    message: string;
    read: boolean;
    createdAt: string;
    type: string;
}

export default function Navbar() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/notifications?userId=${user.email}`);
            if (res.ok) {
                const data: Notification[] = await res.json();

                setNotifications(prev => {
                    const newUnread = data.filter(n => !n.read && !prev.some(p => p.id === n.id));

                    newUnread.forEach(n => {
                        // Check if Notification API is supported and permission granted
                        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                            try {
                                new Notification('New Expense Alert', {
                                    body: n.message,
                                    icon: '/icon.png'
                                });
                            } catch (e) {
                                console.error('Notification error:', e);
                            }
                        }
                    });

                    return data;
                });
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        // Removed auto-request for permission to prevent issues on iOS/Chrome
        // and ensure user gesture compliance.

        fetchNotifications(); // Initial fetch
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);

        // Request permission on user interaction if supported
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(err => console.error('Permission request failed', err));
        }

        // Refresh on open
        fetchNotifications();
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [id] })
            });
            // Update local state
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <Box sx={{ flexGrow: 1, position: 'sticky', top: 0, zIndex: 1100 }}>
            <AppBar position="static" className="glass-nav" sx={{ background: 'transparent', boxShadow: 'none', backdropFilter: 'blur(10px)' }}>
                <Toolbar>
                    <Link href={user ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', textDecoration: 'none', flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <img src="/icon.png" alt="OurTab Icon" style={{ width: 32, height: 32, marginRight: 8, borderRadius: 8 }} />
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                                OurTab
                            </Typography>
                        </Box>
                    </Link>

                    {user && (
                        <Box>
                            <IconButton
                                size="large"
                                aria-label={`show ${unreadCount} new notifications`}
                                onClick={handleClick}
                                sx={{ color: 'black' }}
                            >
                                <Badge badgeContent={unreadCount} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                id="account-menu"
                                open={open}
                                onClose={handleClose}
                                onClick={handleClose}
                                PaperProps={{
                                    elevation: 0,
                                    sx: {
                                        overflow: 'visible',
                                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                        mt: 1.5,
                                        maxHeight: 400,
                                        width: 320,
                                        '& .MuiAvatar-root': {
                                            width: 32,
                                            height: 32,
                                            ml: -0.5,
                                            mr: 1,
                                        },
                                        '&:before': {
                                            content: '""',
                                            display: 'block',
                                            position: 'absolute',
                                            top: 0,
                                            right: 14,
                                            width: 10,
                                            height: 10,
                                            bgcolor: 'background.paper',
                                            transform: 'translateY(-50%) rotate(45deg)',
                                            zIndex: 0,
                                        },
                                    },
                                }}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <Box sx={{ p: 2, pb: 1 }}>
                                    <Typography variant="h6" component="div">Notifications</Typography>
                                </Box>
                                <Divider />
                                <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
                                    {notifications.length === 0 ? (
                                        <ListItem>
                                            <ListItemText primary="No notifications" />
                                        </ListItem>
                                    ) : (
                                        notifications.map((notification) => (
                                            <div key={notification.id}>
                                                <ListItem
                                                    alignItems="flex-start"
                                                    secondaryAction={
                                                        !notification.read && (
                                                            <Box
                                                                component="span"
                                                                sx={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    borderRadius: '50%',
                                                                    bgcolor: 'primary.main',
                                                                    display: 'inline-block'
                                                                }}
                                                            />
                                                        )
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent menu close if needed, but usually we want to close or keep open. 
                                                        // Let's mark read and NOT close immediately to allow reading others? 
                                                        // Actually, 'onClick={handleClose}' on Menu closes it. 
                                                        // Let's handle click manually.
                                                        if (!notification.read) handleMarkAsRead(notification.id);
                                                    }}
                                                    sx={{
                                                        bgcolor: notification.read ? 'inherit' : 'action.hover',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <ListItemText
                                                        primary={notification.message}
                                                        secondary={
                                                            <Typography
                                                                sx={{ display: 'inline' }}
                                                                component="span"
                                                                variant="caption"
                                                                color="text.primary"
                                                            >
                                                                {new Date(notification.createdAt).toLocaleString()}
                                                            </Typography>
                                                        }
                                                    />
                                                </ListItem>
                                                <Divider component="li" />
                                            </div>
                                        ))
                                    )}
                                </List>
                            </Menu>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>
        </Box>
    );
}
