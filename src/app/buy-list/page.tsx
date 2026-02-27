'use client';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import { useShoppingTodos } from '@/hooks/useShoppingTodos';
import Loader from '@/components/Loader';

export default function Todos() {
    const { user, house } = useAuth();
    const { todos, loading: todosLoading, addTodosBatch, toggleTodo, deleteTodo } = useShoppingTodos();
    const [todoInput, setTodoInput] = useState('');
    const [pendingItems, setPendingItems] = useState<string[]>([]);

    const handleAddPendingItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (todoInput.trim()) {
            setPendingItems([...pendingItems, todoInput.trim()]);
            setTodoInput('');
        }
    };

    const handleRemovePendingItem = (indexToRemove: number) => {
        setPendingItems(pendingItems.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmitBatch = async () => {
        if (pendingItems.length > 0 && user?.email) {
            await addTodosBatch(pendingItems, user.email);
            setPendingItems([]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length === 1) {
            setTodoInput(val.toUpperCase());
        } else {
            setTodoInput(val);
        }
    };

    const getMemberInfo = (email: string) => {
        const member = house?.members?.find(m => m.email === email);
        if (!member) return { name: email.split('@')[0], photoUrl: '' };

        const names = (member.name || '').split(' ');
        const displayName = names.length >= 2 ? `${names[0]} ${names[1]}` : names[0] || email.split('@')[0];

        return { name: displayName, photoUrl: member.photoUrl };
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        if (isToday) return `Today at ${timeStr}`;
        const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${dateStr}, ${timeStr}`;
    };

    const [now, setNow] = useState(0);
    useEffect(() => {
        const timerId = setTimeout(() => setNow(Date.now()), 0);
        return () => clearTimeout(timerId);
    }, []);

    const canDeleteCompleted = (todo: { isCompleted?: boolean; completedBy?: string; completedAt?: string; createdAt?: string }) => {
        // Show delete only for manually-marked items within 10 minutes
        if (!todo.isCompleted || todo.completedBy === 'auto') return false;
        const completedAt = new Date(todo.completedAt || todo.createdAt || 0);
        return now > 0 && (now - completedAt.getTime()) < 10 * 60 * 1000;
    };

    const activeTodos = todos.filter(t => !t.isCompleted);
    const completedTodos = todos.filter(t => t.isCompleted);

    return (
        <AuthGuard>
            <main style={{
                minHeight: '100vh',
                position: 'relative',
                overflowX: 'hidden'
            }}>

                <Container maxWidth="sm" sx={{ mt: 3, mb: 20, position: 'relative', zIndex: 1 }}>
                    {/* --- Header Section --- */}
                    <Box className="glass-nav" sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1100,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 2,
                        mb: 0.1,
                        mx: { xs: -2, sm: -3 },
                        px: { xs: 2, sm: 3 },
                        animation: 'fadeInDown 0.8s ease-out',
                        backgroundColor: 'transparent !important', // Let glass-nav handle it
                    }}>

                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 900,
                                background: 'linear-gradient(45deg, #6C63FF 30%, #FF6584 90%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                mb: 1,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            <Box sx={{
                                p: 1,
                                borderRadius: '12px',
                                background: 'rgba(108, 99, 255, 0.1)',
                                border: '1px solid rgba(108, 99, 255, 0.2)',
                                display: 'flex'
                            }}>
                                <ShoppingCartIcon sx={{ fontSize: 28, color: '#6C63FF' }} />
                            </Box>
                            Buy List
                        </Typography>

                    </Box>

                    {/* --- Shopping List Items --- */}
                    {todosLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <Loader />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

                            {/* Batch List (Pending Items) */}
                            {pendingItems.length > 0 && (
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: '28px',
                                        background: 'rgba(108, 99, 255, 0.05)',
                                        border: '1px solid rgba(108, 99, 255, 0.1)',
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.5)',
                                        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                >
                                    <Typography variant="overline" sx={{ display: 'block', mb: 2, fontWeight: 900, textAlign: 'center', letterSpacing: 3, fontSize: '0.75rem', color: '#6C63FF' }}>
                                        Staging Area ({pendingItems.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, justifyContent: 'center' }}>
                                        {pendingItems.map((item, index) => (
                                            <Paper
                                                key={`pending-${index}`}
                                                sx={{
                                                    py: 0.75,
                                                    pl: 2,
                                                    pr: 0.75,
                                                    borderRadius: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    background: 'background.paper',
                                                    border: '1px solid rgba(0,0,0,0.05)',
                                                    transition: 'all 0.2s',
                                                    '&:hover': { background: 'rgba(108, 99, 255, 0.05)', borderColor: 'rgba(108, 99, 255, 0.2)' }
                                                }}
                                            >
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item}</Typography>
                                                <IconButton size="small" onClick={() => handleRemovePendingItem(index)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Paper>
                                        ))}
                                    </Box>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={handleSubmitBatch}
                                        startIcon={<DoneAllIcon />}
                                        sx={{
                                            borderRadius: '18px',
                                            py: 1.5,
                                            textTransform: 'none',
                                            fontWeight: 800,
                                            fontSize: '0.95rem',
                                            background: 'linear-gradient(135deg, #6C63FF 0%, #4f46e5 100%)',
                                            boxShadow: '0 10px 20px rgba(108, 99, 255, 0.2)',
                                            '&:hover': { background: 'linear-gradient(135deg, #7C73FF 0%, #5f56e5 100%)' }
                                        }}
                                    >
                                        Push to Live List
                                    </Button>
                                </Box>
                            )}

                            {/* Active Items */}
                            {activeTodos.length > 0 && (
                                <Box>
                                    <Typography variant="overline" sx={{ px: 2, mb: 2, display: 'block', fontWeight: 900, letterSpacing: 2, fontSize: '0.7rem', color: '#6C63FF' }}>
                                        Required Items
                                    </Typography>
                                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 0 }}>
                                        {activeTodos.map((todo, idx) => {
                                            const { name, photoUrl } = getMemberInfo(todo.addedBy);
                                            return (
                                                <Paper
                                                    key={todo.id}
                                                    sx={{
                                                        borderRadius: '24px',
                                                        p: 1,
                                                        background: 'background.paper',
                                                        border: '1px solid rgba(0,0,0,0.05)',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        position: 'relative',
                                                        animation: `itemAppear 0.5s ease-out forwards ${idx * 0.05}s`,
                                                        opacity: 0,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                                        '&:hover': {
                                                            borderColor: 'rgba(108, 99, 255, 0.2)',
                                                            transform: 'scale(1.02)',
                                                            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                                                            '& .delete-btn': { opacity: 1 }
                                                        }
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Box
                                                            onClick={() => toggleTodo(todo.id, true, user?.email || '')}
                                                            sx={{
                                                                cursor: 'pointer',
                                                                width: 48,
                                                                height: 48,
                                                                borderRadius: '18px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                background: 'rgba(108, 99, 255, 0.05)',
                                                                border: '1px solid rgba(108, 99, 255, 0.1)',
                                                                transition: 'all 0.2s',
                                                                '&:hover': { background: 'rgba(108, 99, 255, 0.1)', border: '1px solid rgba(108, 99, 255, 0.2)' }
                                                            }}
                                                        >
                                                            <RadioButtonUncheckedIcon sx={{ fontSize: 24, color: '#6C63FF' }} />
                                                        </Box>

                                                        <Box sx={{ flex: 1, py: 1 }}>
                                                            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 0.25, letterSpacing: '-0.01em', color: 'text.primary' }}>
                                                                {todo.itemName}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar src={photoUrl || ''} sx={{ width: 16, height: 16, fontSize: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                                    {name.charAt(0)}
                                                                </Avatar>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, opacity: 0.7 }}>
                                                                    {name} • {formatTime(todo.createdAt)}
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        <IconButton
                                                            edge="end"
                                                            size="small"
                                                            className="delete-btn"
                                                            onClick={() => deleteTodo(todo.id)}
                                                            sx={{ opacity: { xs: 1, sm: 0 }, mr: 1, transition: 'opacity 0.2s', color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Paper>
                                            );
                                        })}
                                    </List>
                                </Box>
                            )}

                            {/* Completed Items */}
                            {completedTodos.length > 0 && (
                                <Box sx={{ animation: 'fadeIn 1s ease-out' }}>
                                    <Typography
                                        variant="overline"
                                        sx={{ px: 2, mb: 2, display: 'block', fontWeight: 900, letterSpacing: 2, opacity: 0.5, fontSize: '0.7rem', color: 'text.secondary' }}
                                    >
                                        Items need to buy
                                    </Typography>
                                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 0 }}>
                                        {completedTodos.map((todo) => {
                                            const { name: completedByName } = getMemberInfo(todo.completedBy || '');
                                            return (
                                                <Paper
                                                    key={todo.id}
                                                    sx={{
                                                        borderRadius: '20px',
                                                        p: 1.5,
                                                        background: 'rgba(0,0,0,0.02)',
                                                        border: '1px solid rgba(0,0,0,0.03)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                        opacity: 0.7
                                                    }}
                                                >
                                                    <Box sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'rgba(16, 185, 129, 0.05)',
                                                        border: '1px solid rgba(16, 185, 129, 0.1)'
                                                    }}>
                                                        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" sx={{ textDecoration: 'line-through', fontWeight: 600, color: 'text.secondary' }}>
                                                            {todo.itemName}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            {todo.completedBy === 'auto' ? '⚡ Auto-verified' : `By ${completedByName}`}
                                                        </Typography>
                                                    </Box>
                                                    {canDeleteCompleted(todo) && (
                                                        <IconButton size="small" onClick={() => deleteTodo(todo.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    )}
                                                </Paper>
                                            );
                                        })}
                                    </List>
                                </Box>
                            )}

                            {todos.length === 0 && !todosLoading && (
                                <Box sx={{ textAlign: 'center', py: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, animation: 'fadeIn 1s' }}>
                                    <Box
                                        sx={{
                                            width: 100,
                                            height: 100,
                                            borderRadius: '35%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(0,0,0,0.02)',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            transform: 'rotate(10deg)',
                                        }}
                                    >
                                        <ShoppingCartIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.5 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>The list is clear</Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 220, opacity: 0.6 }}>
                                            Add something below to begin your shopping journey
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </Container>

                {/* --- Floating Action Dock --- */}
                <Box sx={{
                    position: 'fixed',
                    bottom: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'calc(100% - 32px)',
                    maxWidth: 500,
                    zIndex: 100,
                    animation: 'slideUpInput 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '24px',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                            display: 'flex',
                            gap: 1.5,
                            alignItems: 'center'
                        }}
                    >
                        <TextField
                            fullWidth
                            placeholder="Add item..."
                            value={todoInput}
                            onChange={handleInputChange}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddPendingItem(e as any)}
                            variant="standard"
                            autoComplete="off"
                            sx={{
                                ml: 2,
                                '& .MuiInput-root': {
                                    color: 'text.primary',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    '&:before, &:after': { display: 'none' }
                                },
                                '& input::placeholder': { color: 'text.disabled', opacity: 0.6 }
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleAddPendingItem}
                            disabled={!todoInput.trim()}
                            sx={{
                                minWidth: 48,
                                width: 48,
                                height: 48,
                                borderRadius: '16px',
                                p: 0,
                                background: 'linear-gradient(135deg, #6C63FF 0%, #4f46e5 100%)',
                                boxShadow: '0 8px 16px rgba(108, 99, 255, 0.2)',
                                '&:hover': { background: 'linear-gradient(135deg, #7C73FF 0%, #6C63FF 100%)' }
                            }}
                        >
                            <ShoppingCartIcon sx={{ fontSize: 20, color: 'white' }} />
                        </Button>
                    </Paper>
                </Box>

                <Box sx={{ pb: 7 }}>
                    <BottomNav />
                </Box>

                <style jsx global>{`
                    @keyframes float {
                        from { transform: translate(0, 0) scale(1); }
                        to { transform: translate(10%, 10%) scale(1.1); }
                    }
                    @keyframes fadeInDown {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes slideUpInput {
                        from { opacity: 0; transform: translate(-50%, 50px); }
                        to { opacity: 1; transform: translate(-50%, 0); }
                    }
                    @keyframes itemAppear {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
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
