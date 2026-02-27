'use client';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HomeIcon from '@mui/icons-material/Home';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNotifications } from '@/hooks/useNotifications';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import { useRouter } from 'next/navigation';
import { AppNotification } from '@/types/notification';

export default function NotificationsPage() {
    const router = useRouter();
    const { notifications, markAsRead, markAllAsRead, isLoading } = useNotifications();

    const getIconForType = (type: string) => {
        switch (type) {
            case 'expense': return <ReceiptIcon fontSize="small" />;
            case 'settlement': return <PaymentsIcon fontSize="small" />;
            case 'shopping': return <ShoppingCartIcon fontSize="small" />;
            case 'house': return <HomeIcon fontSize="small" />;
            default: return <NotificationsIcon fontSize="small" />;
        }
    };

    const getBgColorForType = (type: string) => {
        switch (type) {
            case 'expense': return 'rgba(108, 99, 255, 0.1)';
            case 'settlement': return 'rgba(0, 191, 165, 0.1)';
            case 'shopping': return 'rgba(237, 108, 2, 0.1)';
            case 'house': return 'rgba(2, 136, 209, 0.1)';
            default: return 'rgba(0,0,0,0.05)';
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.read && notification.id) {
            markAsRead([notification.id]); // Optimistic background update
        }

        switch (notification.type) {
            case 'expense':
            case 'settlement':
                router.push('/dashboard');
                break;
            case 'shopping':
                router.push('/buy-list');
                break;
            case 'house':
                router.push('/profile');
                break;
            default:
                break;
        }
    };

    return (
        <AuthGuard>
            <main style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
                <Container maxWidth="sm" sx={{ mt: 3, mb: 20, position: 'relative', zIndex: 1 }}>
                    {/* --- Header Section --- */}
                    <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', animation: 'fadeInDown 0.8s ease-out' }}>
                        <Box>
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{
                                    fontWeight: 900,
                                    background: 'linear-gradient(45deg, #6C63FF 30%, #FF6584 90%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    mb: 0.5,
                                    letterSpacing: '-0.02em',
                                    fontFamily: 'var(--font-abril)'
                                }}
                            >
                                <NotificationsIcon sx={{ fontSize: 32, color: '#6C63FF' }} />
                                Alerts
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.7 }}>
                                Stay updated with your house
                            </Typography>
                        </Box>
                        {notifications.length > 0 && notifications.some(n => !n.read) && (
                            <Button
                                variant="text"
                                size="small"
                                startIcon={<DoneAllIcon />}
                                onClick={() => markAllAsRead()}
                                sx={{
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: 'primary.main',
                                    '&:hover': { background: 'rgba(108, 99, 255, 0.05)' }
                                }}
                            >
                                Mark all as read
                            </Button>
                        )}
                    </Box>

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
                            {notifications.map((notification, idx) => (
                                <Paper
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    sx={{
                                        borderRadius: '24px',
                                        p: 2,
                                        cursor: 'pointer',
                                        background: notification.read ? 'background.paper' : 'rgba(108, 99, 255, 0.03)',
                                        border: '1px solid',
                                        borderColor: notification.read ? 'rgba(0,0,0,0.05)' : 'rgba(108, 99, 255, 0.15)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative',
                                        animation: `itemAppear 0.5s ease-out forwards ${idx * 0.05}s`,
                                        opacity: 0,
                                        boxShadow: notification.read ? '0 4px 12px rgba(0,0,0,0.02)' : '0 10px 25px rgba(108, 99, 255, 0.08)',
                                        '&:hover': {
                                            borderColor: '#6C63FF',
                                            transform: 'translateY(-2px) scale(1.01)',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                                            background: notification.read ? 'rgba(108, 99, 255, 0.01)' : 'rgba(108, 99, 255, 0.05)',
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Box sx={{ position: 'relative' }}>
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
                                        <Box sx={{ flex: 1 }}>
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
                                                    let displayMessage = notification.message;
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
                                        </Box>
                                    </Box>
                                </Paper>
                            ))}
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
