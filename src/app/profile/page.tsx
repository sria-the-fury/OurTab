'use client';

import Navbar from '@/components/Navbar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/components/ToastContext';
import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import Loader from '@/components/Loader';
import Paper from '@mui/material/Paper';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

interface House {
    id: string;
    name: string;
    currency?: string;
    createdBy: string;
}

export default function Profile() {
    const { user, logout, currency, updateCurrency, loading: authLoading, dbUser, house, mutateUser, mutateHouse } = useAuth();
    const router = useRouter();
    const [houseName, setHouseName] = useState('');
    const [loading, setLoading] = useState(false);

    // Derived state from cached data
    const hasHouse = !!dbUser?.groupId;
    const houseDetails = house;

    const { showToast } = useToast();
    const handleCurrencyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCurrency = e.target.value;
        await updateCurrency(newCurrency);
    };

    const handleCreateHouse = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/houses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: houseName,
                    createdBy: user?.email, // Using email as identifier for now
                    currency: currency // Send current currency pref as house currency
                })
            });

            if (res.ok) {
                showToast('House created successfully!', 'success');
                // Revalidate cache to show new house instantly
                mutateUser();
                mutateHouse();
            } else {
                showToast('Failed to create house', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error creating house', 'error');
        }
        setLoading(false);
    };

    const handleDeleteHouse = async () => {
        if (!user || !user.email) return;
        if (!confirm('Are you sure you want to delete this house? All members will be removed.')) return;
        setLoading(true);
        try {
            // Need houseId. Assuming we have it in houseDetails
            if (houseDetails && houseDetails.id) {
                const res = await fetch('/api/houses', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ houseId: houseDetails.id, userEmail: user.email })
                });

                if (res.ok) {
                    showToast('House deleted successfully', 'success');
                    updateCurrency('USD'); // Reset to default or keep user pref? Let's keep it safe.
                    // Revalidate cache
                    mutateUser();
                    mutateHouse();
                } else {
                    showToast('Failed to delete house', 'error');
                }
            }
        } catch (error) {
            console.error("Delete failed", error);
            showToast('Error deleting house', 'error');
        }
        setLoading(false);
    };


    if (authLoading) return <Loader />;
    if (!user) return null;

    return (
        <AuthGuard>
            <main>
                <Navbar />
                <Container maxWidth="sm" sx={{ mt: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar src={user.photoURL || ''} sx={{ width: 100, height: 100, mb: 2 }} />
                        <Typography variant="h5">{user.displayName}</Typography>
                        <Typography color="text.secondary" gutterBottom>{user.email}</Typography>

                        <Button variant="outlined" color="error" onClick={logout} sx={{ mt: 2 }}>
                            Logout
                        </Button>
                    </Box>

                    <Box sx={{ mt: 6 }}>
                        <Typography variant="h6" gutterBottom>My House</Typography>

                        {hasHouse && houseDetails ? (
                            <Paper className="glass" sx={{ p: 3, background: 'transparent', boxShadow: 'none' }}>
                                <Typography variant="h6" color="primary" gutterBottom>
                                    {houseDetails.name}
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    <strong>Currency:</strong> {houseDetails.currency || 'Not set'}
                                </Typography>
                                {/* <Button
                                variant="text"
                                color="error"
                                size="small"
                                onClick={handleDeleteHouse}
                                sx={{ mt: 2 }}
                            >
                                Delete House
                            </Button> */}
                            </Paper>
                        ) : (
                            <Paper className="glass" sx={{ p: 3, background: 'transparent', boxShadow: 'none' }}>
                                <Typography gutterBottom>You are not in a house yet.</Typography>
                                <form onSubmit={handleCreateHouse}>
                                    <TextField
                                        label="House Name"
                                        fullWidth
                                        value={houseName}
                                        onChange={(e) => setHouseName(e.target.value)}
                                        required
                                        sx={{ mb: 2 }}
                                    />
                                    <TextField
                                        select
                                        label="Default Currency"
                                        value={currency}
                                        onChange={handleCurrencyChange}
                                        fullWidth
                                        variant="outlined"
                                        sx={{ mb: 2 }}
                                    >
                                        <MenuItem value="USD">Dollar ($)</MenuItem>
                                        <MenuItem value="EUR">Euro (€)</MenuItem>
                                        <MenuItem value="BDT">Bangladeshi Taka (৳)</MenuItem>
                                    </TextField>
                                    <Button type="submit" variant="contained" disabled={loading}>
                                        Create House
                                    </Button>
                                </form>
                            </Paper>
                        )}
                    </Box>
                </Container>
                <Box sx={{ pb: 7 }}>
                    <BottomNav />
                </Box>
            </main>
        </AuthGuard>
    );
}


