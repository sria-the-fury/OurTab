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
import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import Loader from '@/components/Loader';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import HomeIcon from '@mui/icons-material/Home';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CancelIcon from '@mui/icons-material/Cancel';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function Profile() {
    const { user, currency, updateCurrency, loading: authLoading, dbUser, house, mutateUser, mutateHouse } = useAuth();
    const router = useRouter();
    const [houseName, setHouseName] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    // Derived state
    const hasHouse = !!dbUser?.groupId;
    const houseDetails = house as any;
    const isCreator = houseDetails?.createdBy === user?.email;
    const deletionRequest = houseDetails?.deletionRequest;
    const memberCount = (houseDetails?.members || []).length;
    const hasApproved = deletionRequest?.approvals?.includes(user?.email);

    const handleCurrencyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await updateCurrency(e.target.value);
    };

    const handleCreateHouse = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/houses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: houseName, createdBy: user?.email, currency })
            });
            if (res.ok) {
                showToast('House created successfully!', 'success');
                mutateUser();
                mutateHouse();
            } else {
                showToast('Failed to create house', 'error');
            }
        } catch (err) {
            showToast('Error creating house', 'error');
        }
        setLoading(false);
    };

    const handleInitiateDelete = async () => {
        if (!user?.email || !houseDetails?.id) return;
        if (!confirm(memberCount > 1
            ? 'All members must approve before the house is deleted. Continue?'
            : 'Are you sure you want to delete this house? All data will be permanently removed.'
        )) return;

        setLoading(true);
        try {
            const res = await fetch('/api/houses', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ houseId: houseDetails.id, userEmail: user.email })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.deleted) {
                    showToast('House and all data deleted successfully', 'success');
                    mutateUser();
                    mutateHouse();
                } else {
                    showToast('Deletion request sent to all members for approval', 'info');
                    mutateHouse();
                }
            } else {
                showToast(data.error || 'Failed to delete house', 'error');
            }
        } catch (error) {
            showToast('Error deleting house', 'error');
        }
        setLoading(false);
    };

    const handleApproveDeletion = async () => {
        if (!user?.email || !houseDetails?.id) return;
        setLoading(true);
        try {
            const res = await fetch('/api/houses/approve-deletion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ houseId: houseDetails.id, userEmail: user.email })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.deleted) {
                    showToast('House deleted. All data has been removed.', 'success');
                } else {
                    showToast('Your approval has been recorded.', 'success');
                }
                mutateUser();
                mutateHouse();
            } else {
                showToast(data.error || 'Failed to approve', 'error');
            }
        } catch (error) {
            showToast('Error approving deletion', 'error');
        }
        setLoading(false);
    };

    const handleCancelDeletion = async () => {
        if (!user?.email || !houseDetails?.id) return;
        setLoading(true);
        try {
            const res = await fetch('/api/houses/cancel-deletion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ houseId: houseDetails.id, userEmail: user.email })
            });
            if (res.ok) {
                showToast('Deletion request cancelled', 'success');
                mutateHouse();
            } else {
                showToast('Failed to cancel deletion', 'error');
            }
        } catch (error) {
            showToast('Error cancelling deletion', 'error');
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
                        <Typography color="text.secondary">{user.email}</Typography>
                        {hasHouse && houseDetails && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                <HomeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2" color="text.secondary">
                                    Member of{' '}
                                    <Box component="span" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-abril)', color: 'primary.main', fontSize: '0.9rem' }}>
                                        {houseDetails.name}
                                    </Box>
                                    {' '}[{houseDetails.currency === 'EUR' ? '€' : houseDetails.currency === 'BDT' ? '৳' : '$'}]
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ mt: 6 }}>

                        {hasHouse && houseDetails ? (
                            <Paper className="glass" sx={{ p: 3, background: 'transparent', boxShadow: 'none' }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    House Management
                                </Typography>

                                {/* Deletion logic */}
                                {!deletionRequest && isCreator && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<DeleteForeverIcon />}
                                        onClick={handleInitiateDelete}
                                        disabled={loading}
                                    >
                                        {memberCount > 1 ? 'Request House Deletion' : 'Delete House'}
                                    </Button>
                                )}

                                {!deletionRequest && !isCreator && (
                                    <Typography variant="body2" color="text.secondary">
                                        Only the house creator can initiate deletion.
                                    </Typography>
                                )}

                                {deletionRequest && isCreator && (
                                    <Alert
                                        severity="warning"
                                        sx={{ mb: 2 }}
                                        action={
                                            <Button
                                                color="inherit"
                                                size="small"
                                                startIcon={<CancelIcon />}
                                                onClick={handleCancelDeletion}
                                                disabled={loading}
                                            >
                                                Cancel
                                            </Button>
                                        }
                                    >
                                        <strong>Deletion pending approval.</strong><br />
                                        Approved by {deletionRequest.approvals?.length || 0} of {memberCount - 1} members.
                                    </Alert>
                                )}

                                {deletionRequest && !isCreator && !hasApproved && (
                                    <Alert
                                        severity="error"
                                        sx={{ mb: 2 }}
                                        action={
                                            <Button
                                                color="inherit"
                                                size="small"
                                                startIcon={<HowToVoteIcon />}
                                                onClick={handleApproveDeletion}
                                                disabled={loading}
                                            >
                                                Approve
                                            </Button>
                                        }
                                    >
                                        <strong>{deletionRequest.initiatedBy}</strong> has requested to delete this house and all its data.
                                    </Alert>
                                )}

                                {deletionRequest && !isCreator && hasApproved && (
                                    <Alert severity="info">
                                        You have approved the deletion. Waiting for other members.
                                    </Alert>
                                )}
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
