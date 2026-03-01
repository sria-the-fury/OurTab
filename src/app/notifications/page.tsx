'use client';

import { useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HomeIcon from '@mui/icons-material/Home';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNotifications } from '@/hooks/useNotifications';
import { useHouseData } from '@/hooks/useHouseData';
import { useAuth } from '@/components/AuthContext';
import { getCurrencySymbol } from '@/utils/currency';
import { formatTimeLocale, formatTimeStr } from '@/utils/date';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import { useRouter } from 'next/navigation';
import { AppNotification, NotificationActionType } from '@/types/notification';

export default function NotificationsPage() {
    const router = useRouter();
    const { notifications, markAsRead, markAllAsRead, isLoading, mutate } = useNotifications();
    const { house, mutateHouse, mutateFundDeposits } = useHouseData();
    const { user } = useAuth();

    // Track loading state per notification id
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const currencySymbol = getCurrencySymbol(house?.currency);

    const processMessage = (message: string) => {
        let processed = message.replaceAll('$', currencySymbol);
        processed = processed.replace(/\b([01]\d|2[0-3]):[0-5]\d\b/g, (match) => {
            return formatTimeStr(match);
        });
        processed = processed.replace(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*([AaPp][Mm])\b/g, (match, h, m, p) => {
            let hours = parseInt(h);
            const minutes = parseInt(m);
            const ampm = p.toLowerCase();
            if (ampm === 'pm' && hours < 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;
            return formatTimeStr(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        });
        return processed;
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'expense': return <ReceiptIcon fontSize="small" />;
            case 'settlement': return <PaymentsIcon fontSize="small" />;
            case 'shopping':
            case 'expense_todo':
                return <ShoppingCartIcon fontSize="small" />;
            case 'house': return <HomeIcon fontSize="small" />;
            default: return <NotificationsIcon fontSize="small" />;
        }
    };

    const getBgColorForType = (type: string) => {
        switch (type) {
            case 'expense': return 'rgba(108, 99, 255, 0.1)';
            case 'settlement': return 'rgba(0, 191, 165, 0.1)';
            case 'shopping':
            case 'expense_todo':
                return 'rgba(237, 108, 2, 0.1)';
            case 'house': return 'rgba(2, 136, 209, 0.1)';
            default: return 'rgba(0,0,0,0.05)';
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const timeStr = formatTimeLocale(date);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `${dateStr}, ${timeStr}`;
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.read && notification.id) {
            markAsRead([notification.id]);
        }
        switch (notification.type) {
            case 'expense':
            case 'settlement':
                router.push('/dashboard');
                break;
            case 'shopping':
            case 'expense_todo':
                router.push('/buy-list');
                break;
            case 'house':
                router.push('/profile');
                break;
            default:
                break;
        }
    };

    const handleAction = async (
        e: React.MouseEvent,
        notification: AppNotification,
        action: 'approve' | 'reject'
    ) => {
        e.stopPropagation();
        const id = notification.id!;
        if (!user?.email || !notification.actionType) return;

        setActionLoading(prev => ({ ...prev, [id]: true }));

        try {
            const meta = notification.metadata || {};
            let res: Response | null = null;

            switch (notification.actionType as NotificationActionType) {
                case 'approve_payment':
                    if (action === 'approve') {
                        res = await fetch('/api/houses/approve-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                houseId: meta.houseId,
                                paymentId: notification.relatedId,
                                approverEmail: user.email
                            })
                        });
                    } else {
                        res = await fetch('/api/houses/cancel-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                houseId: meta.houseId,
                                paymentId: notification.relatedId,
                                cancellerEmail: user.email
                            })
                        });
                    }
                    break;

                case 'approve_leave':
                    res = await fetch('/api/houses/approve-leave', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            houseId: meta.houseId,
                            userEmail: user.email,
                            userToApprove: meta.senderEmail
                        })
                    });
                    break;

                case 'approve_deletion':
                    res = await fetch('/api/houses/approve-deletion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            houseId: meta.houseId,
                            userEmail: user.email
                        })
                    });
                    break;

                case 'approve_fund_deposit':
                    res = await fetch('/api/fund-deposits/approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            depositId: meta.depositId,
                            action: action === 'approve' ? 'approve' : 'reject',
                            managerEmail: user.email
                        })
                    });
                    break;

                case 'approve_meal_off':
                    res = await fetch('/api/meals/approve-off', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            houseId: meta.houseId,
                            email: meta.senderEmail,
                            managerEmail: user.email
                        })
                    });
                    break;
            }

            if (res && res.ok) {
                // 1. Optimistically remove from local list immediately so buttons vanish
                mutate(notifications.filter(n => n.id !== id), false);
                // 2. Delete from Firestore so it doesn't reappear on next poll
                fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => { });
                // 3. Refresh house data
                mutateHouse();
                mutateFundDeposits();
            }
        } catch (err) {
            console.error('Action error', err);
        } finally {
            setActionLoading(prev => ({ ...prev, [id]: false }));
        }
    };

    const getActionButtons = (notification: AppNotification) => {
        if (!notification.actionType || !notification.id) return null;
        const id = notification.id;
        const loading = actionLoading[id];

        const showReject =
            notification.actionType === 'approve_payment' ||
            notification.actionType === 'approve_fund_deposit';

        return (
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                <Button
                    size="small"
                    variant="contained"
                    disabled={loading}
                    onClick={(e) => handleAction(e, notification, 'approve')}
                    startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <CheckCircleIcon />}
                    sx={{
                        borderRadius: '20px',
                        px: 2,
                        py: 0.4,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        minHeight: 0,
                        textTransform: 'none',
                        bgcolor: 'rgba(76, 175, 80, 0.15)',
                        color: '#4caf50',
                        border: '1px solid rgba(76,175,80,0.3)',
                        boxShadow: 'none',
                        '&:hover': {
                            bgcolor: 'rgba(76, 175, 80, 0.25)',
                            boxShadow: '0 4px 12px rgba(76,175,80,0.2)',
                        },
                        '&:disabled': { opacity: 0.5 }
                    }}
                >
                    {loading ? 'Processing…' : 'Approve'}
                </Button>

                {showReject && (
                    <Button
                        size="small"
                        variant="contained"
                        disabled={loading}
                        onClick={(e) => handleAction(e, notification, 'reject')}
                        startIcon={<CancelIcon />}
                        sx={{
                            borderRadius: '20px',
                            px: 2,
                            py: 0.4,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            minHeight: 0,
                            textTransform: 'none',
                            bgcolor: 'rgba(244, 67, 54, 0.1)',
                            color: '#f44336',
                            border: '1px solid rgba(244,67,54,0.25)',
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: 'rgba(244, 67, 54, 0.2)',
                                boxShadow: '0 4px 12px rgba(244,67,54,0.15)',
                            },
                            '&:disabled': { opacity: 0.5 }
                        }}
                    >
                        Reject
                    </Button>
                )}
            </Box>
        );
    };

    return (
        <AuthGuard>
            <main style={{ minHeight: '100vh', position: 'relative' }}>
                <Container maxWidth="sm" sx={{ mt: 3, mb: 20, position: 'relative', zIndex: 1 }}>
                    {/* --- Header Section --- */}
                    <Box className="glass-nav" sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1100,
                        py: 2,
                        mb: 2,
                        mx: { xs: -2, sm: -3 },
                        px: { xs: 2, sm: 3 },
                        animation: 'fadeInDown 0.8s ease-out',
                        backgroundColor: 'transparent !important',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                    }}>
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Typography variant="h4" component="h1" sx={{
                                fontWeight: 800,
                                borderRadius: '12px',
                                padding: '4px',
                                backdropFilter: 'blur(20px)',
                                background: 'linear-gradient(45deg, #6C63FF 30%, #FF6584 90%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                lineHeight: 1.2,
                                letterSpacing: '-0.02em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                <NotificationsIcon sx={{ fontSize: 32, color: '#6C63FF' }} />
                                Alerts
                            </Typography>

                            {notifications.length > 0 && notifications.some(n => !n.read) && (
                                <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<DoneAllIcon />}
                                    onClick={() => markAllAsRead()}
                                    sx={{
                                        borderRadius: '12px',
                                        fontWeight: 700,
                                        backdropFilter: 'blur(20px)',
                                        textTransform: 'none',
                                        color: 'primary.main',
                                        '&:hover': { background: 'rgba(108, 99, 255, 0.05)' }
                                    }}
                                >
                                    Mark all as read
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Typography variant="body2" sx={{ color: 'text.secondary', marginBottom: 2, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.7 }}>
                        Stay updated with your house
                    </Typography>

                    {/* --- Notifications Content --- */}
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                            <Box className="loader-glow" sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                border: '3px solid rgba(108, 99, 255, 0.1)',
                                borderTopColor: '#6C63FF',
                                animation: 'spin 1s linear infinite'
                            }} />
                        </Box>
                    ) : notifications.length === 0 ? (
                        <Box sx={{
                            textAlign: 'center',
                            py: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 3,
                            animation: 'fadeIn 1s'
                        }}>
                            <Box sx={{
                                width: 100,
                                height: 100,
                                borderRadius: '35%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.02)',
                                border: '1px solid rgba(0,0,0,0.05)',
                                transform: 'rotate(-10deg)',
                                position: 'relative'
                            }}>
                                <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.3 }} />
                                <Box sx={{
                                    position: 'absolute',
                                    top: -5,
                                    right: -5,
                                    width: 20,
                                    height: 20,
                                    bgcolor: 'background.paper',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                }}>
                                    <DoneAllIcon sx={{ fontSize: 12, color: 'success.main' }} />
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>All caught up!</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 220, opacity: 0.6 }}>
                                    No new notifications for you right now. Check back later.
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <List sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 0 }}>
                            {notifications.map((notification, idx) => {
                                const actionButtons = getActionButtons(notification);
                                const isActionable = !!notification.actionType;

                                return (
                                    <Paper
                                        key={notification.id}
                                        onClick={() => !isActionable && handleNotificationClick(notification)}
                                        sx={{
                                            borderRadius: '24px',
                                            p: 2,
                                            cursor: isActionable ? 'default' : 'pointer',
                                            background: notification.read ? 'background.paper' : 'rgba(108, 99, 255, 0.03)',
                                            border: '1px solid',
                                            borderColor: notification.read ? 'rgba(0,0,0,0.05)' : 'rgba(108, 99, 255, 0.15)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            animation: `itemAppear 0.5s ease-out forwards ${idx * 0.05}s`,
                                            opacity: 0,
                                            boxShadow: notification.read ? '0 4px 12px rgba(0,0,0,0.02)' : '0 10px 25px rgba(108, 99, 255, 0.08)',
                                            '&:hover': isActionable ? {} : {
                                                borderColor: '#6C63FF',
                                                transform: 'translateY(-2px) scale(1.01)',
                                                boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                                                background: notification.read ? 'rgba(108, 99, 255, 0.01)' : 'rgba(108, 99, 255, 0.05)',
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                                <Avatar
                                                    src={notification.senderPhotoUrl}
                                                    sx={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '16px',
                                                        bgcolor: getBgColorForType(notification.type),
                                                        color: 'primary.main',
                                                        border: '1px solid rgba(0,0,0,0.05)',
                                                        boxShadow: '0 8px 16px rgba(0,0,0,0.05)'
                                                    }}
                                                >
                                                    {!notification.senderPhotoUrl && getIconForType(notification.type)}
                                                </Avatar>
                                                {!notification.read && (
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        top: -4,
                                                        right: -4,
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: '50%',
                                                        bgcolor: '#6C63FF',
                                                        border: '2px solid white',
                                                        boxShadow: '0 0 10px rgba(108, 99, 255, 0.5)',
                                                        animation: 'pulse 2s infinite'
                                                    }} />
                                                )}
                                            </Box>

                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: !notification.read ? 700 : 500,
                                                        color: !notification.read ? 'text.primary' : 'text.secondary',
                                                        fontSize: '0.9rem',
                                                        mb: 0.5,
                                                        lineHeight: 1.4
                                                    }}
                                                >
                                                    {(() => {
                                                        let displayMessage = processMessage(notification.message);
                                                        if (notification.senderName) {
                                                            if (displayMessage.startsWith(notification.senderName)) {
                                                                displayMessage = displayMessage.substring(notification.senderName.length).trim();
                                                            }
                                                            return (
                                                                <>
                                                                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>{notification.senderName} </Box>
                                                                    {displayMessage}
                                                                </>
                                                            );
                                                        }
                                                        return displayMessage;
                                                    })()}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {formatTime(notification.createdAt)}
                                                </Typography>

                                                {/* Inline action buttons */}
                                                {actionButtons}
                                            </Box>
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </List>
                    )}
                </Container>

                <Box sx={{ pb: 7 }}>
                    <BottomNav />
                </Box>

                <style jsx global>{`
                    @keyframes fadeInDown {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes itemAppear {
                        from { opacity: 0; transform: translateY(15px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.3); opacity: 0.7; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}</style>
            </main>
        </AuthGuard>
    );
}
