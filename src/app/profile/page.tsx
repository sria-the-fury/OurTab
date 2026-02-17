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

interface Group {
    id: string;
    name: string;
    currency?: string;
    createdBy: string;
}

export default function Profile() {
    const { user, logout, currency, updateCurrency, loading: authLoading, dbUser, group, mutateUser, mutateGroup } = useAuth();
    const router = useRouter();
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);

    // Derived state from cached data
    const hasGroup = !!dbUser?.groupId;
    const groupDetails = group;

    const { showToast } = useToast();
    const handleCurrencyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCurrency = e.target.value;
        await updateCurrency(newCurrency);
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: groupName,
                    createdBy: user?.email, // Using email as identifier for now
                    currency: currency // Send current currency pref as group currency
                })
            });

            if (res.ok) {
                showToast('Group created successfully!', 'success');
                // Revalidate cache to show new group instantly
                mutateUser();
                mutateGroup();
            } else {
                showToast('Failed to create group', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error creating group', 'error');
        }
        setLoading(false);
    };

    const handleDeleteGroup = async () => {
        if (!user || !user.email) return;
        if (!confirm('Are you sure you want to delete this group? All members will be removed.')) return;
        setLoading(true);
        try {
            // Need groupId. Assuming we have it in groupDetails
            if (groupDetails && groupDetails.id) {
                const res = await fetch('/api/groups', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupId: groupDetails.id, userEmail: user.email })
                });

                if (res.ok) {
                    showToast('Group deleted successfully', 'success');
                    updateCurrency('USD'); // Reset to default or keep user pref? Let's keep it safe.
                    // Revalidate cache
                    mutateUser();
                    mutateGroup();
                } else {
                    showToast('Failed to delete group', 'error');
                }
            }
        } catch (error) {
            console.error("Delete failed", error);
            showToast('Error deleting group', 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    if (authLoading) return <Loader />;
    if (!user) return null;

    return (
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
                    <Typography variant="h6" gutterBottom>My Group</Typography>

                    {hasGroup && groupDetails ? (
                        <Paper className="glass" sx={{ p: 3, background: 'transparent', boxShadow: 'none' }}>
                            <Typography variant="h6" color="primary" gutterBottom>
                                {groupDetails.name}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                <strong>Currency:</strong> {groupDetails.currency || 'Not set'}
                            </Typography>
                            <Button
                                variant="text"
                                color="error"
                                size="small"
                                onClick={handleDeleteGroup}
                                sx={{ mt: 2 }}
                            >
                                Delete Group
                            </Button>
                        </Paper>
                    ) : (
                        <Paper className="glass" sx={{ p: 3, background: 'transparent', boxShadow: 'none' }}>
                            <Typography gutterBottom>You are not in a group yet.</Typography>
                            <form onSubmit={handleCreateGroup}>
                                <TextField
                                    label="Group Name"
                                    fullWidth
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
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
                                    Create Group
                                </Button>
                            </form>
                        </Paper>
                    )}
                </Box>
            </Container>
            <Box sx={{ pb: 7 }}>
                <BottomNav />
            </Box>
        </main >
    );
}


