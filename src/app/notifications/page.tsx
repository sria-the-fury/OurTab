'use client';

import Navbar from '@/components/Navbar';
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
            <main>
                <Navbar />
                <Container maxWidth="md" sx={{ mt: 4, mb: 10 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <NotificationsIcon color="primary" fontSize="large" />
                            Notifications
                        </Typography>
                        {notifications.length > 0 && notifications.some(n => !n.read) && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DoneAllIcon />}
                                onClick={() => markAllAsRead()}
                            >
                                Mark All Read
                            </Button>
                        )}
                    </Box>

                    <Paper className="glass" sx={{ p: 0, overflow: 'hidden', background: 'transparent' }}>
                        {isLoading ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>
                        ) : notifications.length === 0 ? (
                            <Box sx={{ p: 6, textAlign: 'center', opacity: 0.5 }}>
                                <NotificationsIcon sx={{ fontSize: 48, mb: 2 }} />
                                <Typography>No new notifications</Typography>
                            </Box>
                        ) : (
                            <List disablePadding>
                                {notifications.map((notification, index) => (
                                    <ListItem
                                        key={notification.id}
                                        divider={index < notifications.length - 1}
                                        onClick={() => handleNotificationClick(notification)}
                                        sx={{
                                            p: 3,
                                            cursor: 'pointer',
                                            bgcolor: !notification.read ? 'rgba(108, 99, 255, 0.05)' : 'transparent',
                                            transition: 'background-color 0.2s',
                                            '&:hover': {
                                                bgcolor: !notification.read ? 'rgba(108, 99, 255, 0.1)' : 'rgba(0,0,0,0.02)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                                            <Avatar src={notification.senderPhotoUrl} sx={{ bgcolor: getBgColorForType(notification.type), color: 'text.primary' }}>
                                                {!notification.senderPhotoUrl && getIconForType(notification.type)}
                                            </Avatar>
                                            <ListItemText
                                                primary={
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: !notification.read ? 600 : 400, fontSize: '0.82rem' }}
                                                    >
                                                        {(() => {
                                                            let displayMessage = notification.message;
                                                            if (notification.senderName) {
                                                                if (displayMessage.startsWith(notification.senderName)) {
                                                                    displayMessage = displayMessage.substring(notification.senderName.length).trim();
                                                                    // Sometimes it might start with " has" or something if the space isn't perfectly matched, 
                                                                    // but trim() handles the leading space nicely.
                                                                }
                                                                return (
                                                                    <>
                                                                        <Box component="span" sx={{ fontWeight: 'bold' }}>{notification.senderName} </Box>
                                                                        {displayMessage}
                                                                    </>
                                                                );
                                                            }
                                                            return displayMessage;
                                                        })()}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                                        {formatTime(notification.createdAt)}
                                                    </Typography>
                                                }
                                            />
                                            {!notification.read && (
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
                                            )}
                                        </Box>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Container>
                <Box sx={{ pb: 7 }}>
                    <BottomNav />
                </Box>
            </main>
        </AuthGuard>
    );
}
