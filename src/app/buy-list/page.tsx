'use client';

import Navbar from '@/components/Navbar';
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
import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import { useShoppingTodos } from '@/hooks/useShoppingTodos';

export default function Todos() {
    const { user, house } = useAuth();
    const { todos, loading: todosLoading, addTodo, toggleTodo, deleteTodo } = useShoppingTodos();
    const [todoInput, setTodoInput] = useState('');

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (todoInput.trim() && user?.email) {
            addTodo(todoInput.trim(), user.email);
            setTodoInput('');
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

        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return isToday ? `Today at ${timeStr}` : `${date.toLocaleDateString()} at ${timeStr}`;
    };

    return (
        <AuthGuard>
            <main>
                <Navbar />
                <Container maxWidth="sm" sx={{ mt: 4, mb: 10 }}>
                    <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ShoppingCartIcon fontSize="large" color="primary" />
                        Buy List
                    </Typography>

                    <Paper className="glass" sx={{ p: 3, mb: 3, background: 'transparent', boxShadow: 'none' }}>
                        <Box component="form" onSubmit={handleAddTodo} sx={{ display: 'flex', gap: 1, mb: 3 }}>
                            <TextField
                                fullWidth
                                placeholder="What needs to be bought?"
                                value={todoInput}
                                onChange={handleInputChange}
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                        bgcolor: 'rgba(255, 255, 255, 0.05)'
                                    }
                                }}
                            />
                            <Button
                                variant="contained"
                                type="submit"
                                disabled={!todoInput.trim()}
                                sx={{ borderRadius: '12px', px: 3 }}
                            >
                                Add
                            </Button>
                        </Box>

                        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {todos.map((todo) => {
                                const { name, photoUrl } = getMemberInfo(todo.addedBy);
                                return (
                                    <ListItem
                                        key={todo.id}
                                        className="glass"
                                        sx={{
                                            borderRadius: '12px',
                                            mb: 1,
                                            background: todo.isCompleted ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                                            transition: 'all 0.2s'
                                        }}
                                        secondaryAction={
                                            !todo.isCompleted && (
                                                <IconButton edge="end" onClick={() => deleteTodo(todo.id)}>
                                                    <DeleteIcon color="error" fontSize="small" />
                                                </IconButton>
                                            )
                                        }
                                    >
                                        <IconButton
                                            onClick={() => !todo.isCompleted && toggleTodo(todo.id, !todo.isCompleted, user?.email || '')}
                                            sx={{ mr: 1 }}
                                            disabled={todo.isCompleted}
                                        >
                                            {todo.isCompleted ?
                                                <CheckCircleOutlineIcon color="success" /> :
                                                <RadioButtonUncheckedIcon sx={{ opacity: 0.5 }} />
                                            }
                                        </IconButton>

                                        <ListItemText
                                            secondaryTypographyProps={{ component: 'div' }}
                                            primary={
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        textDecoration: todo.isCompleted ? 'line-through' : 'none',
                                                        fontWeight: 500,
                                                        color: todo.isCompleted ? 'text.secondary' : 'text.primary'
                                                    }}
                                                >
                                                    {todo.itemName}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box sx={{ mt: 0.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <Avatar src={photoUrl || ''} sx={{ width: 18, height: 18, fontSize: '10px' }}>
                                                            {name.charAt(0)}
                                                        </Avatar>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {name}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                                                        {formatTime(todo.createdAt)}
                                                    </Typography>
                                                    {todo.isCompleted && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                            {todo.completedBy === 'auto' ? (
                                                                <Typography variant="caption" sx={{ color: 'success.main', fontStyle: 'italic' }}>
                                                                    ✨ Auto marked
                                                                </Typography>
                                                            ) : todo.completedBy ? (
                                                                (() => {
                                                                    const { name: completedByName, photoUrl: completedByPhoto } = getMemberInfo(todo.completedBy);
                                                                    return (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <DoneAllIcon color="success" sx={{ fontSize: 16 }} />
                                                                            <Avatar src={completedByPhoto || ''} sx={{ width: 14, height: 14, fontSize: '8px' }}>
                                                                                {completedByName.charAt(0)}
                                                                            </Avatar>
                                                                            <Typography variant="caption" color="success.main">
                                                                                {completedByName}
                                                                            </Typography>
                                                                        </Box>
                                                                    );
                                                                })()
                                                            ) : null}
                                                        </Box>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                );
                            })}
                            {todos.length === 0 && !todosLoading && (
                                <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
                                    <ShoppingCartIcon sx={{ fontSize: 48, mb: 2 }} />
                                    <Typography variant="body1">Your list is empty</Typography>
                                    <Typography variant="body2">Add items you need to buy!</Typography>
                                </Box>
                            )}
                        </List>
                    </Paper>
                </Container>

                <Box sx={{ pb: 7 }}>
                    <BottomNav />
                </Box>
            </main>
        </AuthGuard>
    );
}
