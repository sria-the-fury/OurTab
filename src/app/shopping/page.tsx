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
import Divider from '@mui/material/Divider';
import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

interface GroceryItem {
    id: string;
    name: string;
    price: number;
}

export default function Shopping() {
    const { user, currency } = useAuth();
    const router = useRouter();

    // Item list state
    const [items, setItems] = useState<GroceryItem[]>([]);

    // Current item being added
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');

    // Optional note for the entire shopping trip
    const [note, setNote] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | '', text: string }>({ type: '', text: '' });

    // Add item to list
    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();

        if (!itemName.trim() || !itemPrice) return;

        const newItem: GroceryItem = {
            id: Date.now().toString(),
            name: itemName.trim(),
            price: parseFloat(itemPrice)
        };

        setItems([...items, newItem]);
        setItemName('');
        setItemPrice('');
    };

    // Remove item from list
    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.price, 0);

    // Format currency symbol
    const getCurrencySymbol = () => {
        switch (currency) {
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'BDT': return '৳';
            default: return '$';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (items.length === 0) {
            setMessage({ type: 'error', text: 'Please add at least one item.' });
            return;
        }

        if (!user) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            console.log('Starting expense submission for user:', user.email);

            // 1. Get user from DB to know groupId
            const userRes = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });

            if (!userRes.ok) {
                console.error('Failed to fetch user data, status:', userRes.status);
                throw new Error('Failed to fetch user data');
            }

            const dbUser = await userRes.json();
            console.log('Fetched user data:', dbUser);

            if (!dbUser.groupId) {
                console.log('User has no groupId');
                setMessage({ type: 'error', text: 'You must belong to a group to add expenses.' });
                setLoading(false);
                return;
            }

            // Create description with items breakdown
            const itemsBreakdown = items.map(item => `${item.name} ${getCurrencySymbol()}${item.price.toFixed(2)}`).join(', ');
            const description = note
                ? `${note} (Items: ${itemsBreakdown})`
                : `Groceries: ${itemsBreakdown}`;

            console.log('Creating expense with data:', {
                amount: total,
                description,
                userId: dbUser.id,
                groupId: dbUser.groupId
            });

            const expenseRes = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: total.toString(),
                    description,
                    userId: dbUser.id,
                    groupId: dbUser.groupId
                })
            });

            console.log('Expense API response status:', expenseRes.status);

            if (!expenseRes.ok) {
                const errorData = await expenseRes.json();
                console.error('Failed to create expense:', errorData);
                throw new Error('Failed to create expense');
            }

            const newExpense = await expenseRes.json();
            console.log('Expense created successfully:', newExpense);

            setMessage({ type: 'success', text: 'Shopping list submitted successfully!' });
            setItems([]);
            setNote('');

            // Navigate after a short delay to show success message
            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);
        } catch (err) {
            console.error('Error adding expense:', err);
            setMessage({ type: 'error', text: 'Failed to submit shopping list. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main>
            <Navbar />
            <Container maxWidth="sm" sx={{ mt: 4, mb: 10 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Shopping List
                </Typography>

                {message.text && (
                    <Box sx={{ mb: 2, p: 2, borderRadius: 1, bgcolor: message.type === 'success' ? 'success.light' : 'error.light' }}>
                        <Typography color={message.type === 'success' ? 'success.dark' : 'error.dark'}>
                            {message.text}
                        </Typography>
                    </Box>
                )}

                {/* Add Item Form */}
                <Paper className="glass" sx={{ p: 3, mb: 3, background: 'transparent', boxShadow: 'none' }}>
                    <Typography variant="h6" gutterBottom>Add Item</Typography>
                    <Box component="form" onSubmit={handleAddItem}>
                        <TextField
                            label="Item Name"
                            fullWidth
                            required
                            margin="normal"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            disabled={loading}
                            placeholder="e.g., Milk, Bread, Eggs"
                        />
                        <TextField
                            label={`Price (${getCurrencySymbol()})`}
                            type="number"
                            fullWidth
                            required
                            margin="normal"
                            value={itemPrice}
                            onChange={(e) => setItemPrice(e.target.value)}
                            disabled={loading}
                            inputProps={{ step: '0.01', min: '0' }}
                        />
                        <Button
                            type="submit"
                            variant="outlined"
                            fullWidth
                            sx={{ mt: 2 }}
                            disabled={loading}
                        >
                            Add to List
                        </Button>
                    </Box>
                </Paper>

                {/* Items List */}
                {items.length > 0 && (
                    <Paper className="glass" sx={{ p: 3, mb: 3, background: 'transparent', boxShadow: 'none' }}>
                        <Typography variant="h6" gutterBottom>Items ({items.length})</Typography>
                        <List>
                            {items.map((item, index) => (
                                <div key={item.id}>
                                    <ListItem
                                        secondaryAction={
                                            <IconButton edge="end" onClick={() => handleRemoveItem(item.id)} disabled={loading}>
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemText
                                            primary={item.name}
                                            secondary={`${getCurrencySymbol()}${item.price.toFixed(2)}`}
                                        />
                                    </ListItem>
                                    {index < items.length - 1 && <Divider />}
                                </div>
                            ))}
                        </List>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">Total:</Typography>
                            <Typography variant="h6" color="primary">
                                {getCurrencySymbol()}{total.toFixed(2)}
                            </Typography>
                        </Box>
                    </Paper>
                )}

                {/* Submit Form */}
                {items.length > 0 && (
                    <Paper className="glass" sx={{ p: 3, background: 'transparent', boxShadow: 'none' }}>
                        <Box component="form" onSubmit={handleSubmit}>
                            <TextField
                                label="Note (Optional)"
                                fullWidth
                                margin="normal"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={loading}
                                placeholder="e.g., Weekly groceries"
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                sx={{ mt: 2 }}
                                disabled={loading}
                            >
                                {loading ? 'Submitting...' : 'Submit Shopping List'}
                            </Button>
                        </Box>
                    </Paper>
                )}

                {items.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                            Add items to your shopping list to get started
                        </Typography>
                    </Box>
                )}
            </Container>
            <Box sx={{ pb: 7 }}>
                <BottomNav />
            </Box>
        </main>
    );
}
