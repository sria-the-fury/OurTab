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

interface Group {
    id: string;
    name: string;
    currency?: string;
    createdBy: string;
}

export default function Profile() {
    const { user, logout, currency, updateCurrency, loading: authLoading } = useAuth();
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasGroup, setHasGroup] = useState(false);
    const [groupDetails, setGroupDetails] = useState<Group | null>(null);

    useEffect(() => {
        async function fetchUserData() {
            if (user?.email) {
                try {
                    console.log('Fetching user data for:', user.email);
                    const res = await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email })
                    });
                    if (res.ok) {
                        const userData = await res.json();
                        console.log('User data:', userData);
                        if (userData.groupId) {
                            console.log('User has groupId:', userData.groupId);
                            setHasGroup(true);
                            // Fetch full group details
                            const groupRes = await fetch(`/api/groups/my-group?email=${user.email}`);
                            if (groupRes.ok) {
                                const groupData = await groupRes.json();
                                console.log('Group data:', groupData);
                                setGroupDetails(groupData);
                            } else {
                                console.error('Failed to fetch group details:', groupRes.status);
                            }
                        } else {
                            console.log('User has no groupId');
                            setHasGroup(false);
                        }
                    } else {
                        console.error('Failed to fetch user data:', res.status);
                    }
                } catch (e) {
                    console.error('Error fetching user data:', e);
                }
            }
        }
        fetchUserData();
    }, [user]);

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
                setHasGroup(true);
                // Also ensure our global currency state matches what we just set
                updateCurrency(currency);
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
                    setHasGroup(false);
                    setGroupDetails(null);
                    updateCurrency('USD'); // Reset to default or keep user pref? Let's keep it safe.
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

    if (authLoading) return <Loader />;
    if (!user) return <Typography>Please login</Typography>;

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


