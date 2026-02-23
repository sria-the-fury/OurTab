'use client';

import Navbar from '@/components/Navbar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
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
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CancelIcon from '@mui/icons-material/Cancel';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { useRouter } from 'next/navigation';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import AuthGuard from '@/components/AuthGuard';

export default function Profile() {
    const { user, currency, updateCurrency, loading: authLoading, dbUser, house, mutateUser, mutateHouse } = useAuth();
    const router = useRouter();
    const [houseName, setHouseName] = useState('');
    const [loading, setLoading] = useState(false);
    const [ibanValue, setIbanValue] = useState('');
    const [editingIban, setEditingIban] = useState(false);
    const [savingIban, setSavingIban] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
    const { showToast } = useToast();
    // Derived state
    const hasHouse = !!dbUser?.groupId;
    const houseDetails = house as any;

    // Handle older groups that might not have a createdBy field
    const effectiveCreator = houseDetails?.createdBy || (houseDetails?.members && houseDetails.members[0]);
    const isCreator = effectiveCreator === user?.email;
    const creatorLeft = Boolean(houseDetails?.createdBy && houseDetails?.members && !houseDetails.members.includes(houseDetails.createdBy));
    const canDeleteHouse = isCreator || creatorLeft;
    const deletionRequest = houseDetails?.deletionRequest;
    const memberCount = (houseDetails?.members || []).length;
    const hasApproved = deletionRequest?.approvals?.includes(user?.email);

    const leaveRequests = houseDetails?.leaveRequests || {};
    const myLeaveRequest = leaveRequests[user?.email || ''];
    const otherLeaveRequests = Object.entries(leaveRequests).filter(([email]) => email !== user?.email);

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

    const handleInitiateDelete = () => {
        setOpenDeleteDialog(true);
    };

    const handleInitiateLeave = () => {
        setOpenLeaveDialog(true);
    };

    const confirmLeaveHouse = async () => {
        setOpenLeaveDialog(false);
        if (!user?.email || !houseDetails?.id) return;
        setLoading(true);
        try {
            const res = await fetch('/api/houses/leave-house', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ houseId: houseDetails.id, userEmail: user.email })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.pendingApproval) {
                    showToast('Leave request sent for approval', 'info');
                } else {
                    showToast('You have successfully left the house', 'success');
                    mutateUser();
                }
                mutateHouse();
            } else {
                showToast('Failed to leave house', 'error');
            }
        } catch (error) {
            showToast('Error leaving house', 'error');
        }
        setLoading(false);
    };

    const handleCancelLeave = async () => {
        if (!user?.email || !houseDetails?.id) return;
        setLoading(true);
        try {
            const res = await fetch('/api/houses/cancel-leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ houseId: houseDetails.id, userEmail: user.email })
            });
            if (res.ok) {
                showToast('Leave request cancelled', 'success');
                mutateHouse();
            } else {
                showToast('Failed to cancel leave', 'error');
            }
        } catch (error) {
            showToast('Error cancelling leave', 'error');
        }
        setLoading(false);
    };

    const handleApproveLeave = async (userToApprove: string) => {
        if (!user?.email || !houseDetails?.id) return;
        setLoading(true);
        try {
            const res = await fetch('/api/houses/approve-leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ houseId: houseDetails.id, userEmail: user.email, userToApprove })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.fullyApproved) {
                    showToast(`${userToApprove} has left the house.`, 'success');
                } else {
                    showToast('Approval recorded', 'success');
                }
                mutateHouse();
            } else {
                showToast('Failed to approve leave', 'error');
            }
        } catch (error) {
            showToast('Error approving leave', 'error');
        }
        setLoading(false);
    };

    const confirmDeleteHouse = async () => {
        setOpenDeleteDialog(false);
        if (!user?.email || !houseDetails?.id) return;

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
                        {/* IBAN Row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <AccountBalanceIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            {editingIban ? (
                                <>
                                    <TextField
                                        size="small"
                                        placeholder="e.g. DE89 3704 0044 0532 0130 00"
                                        value={ibanValue}
                                        onChange={(e) => setIbanValue(e.target.value)}
                                        sx={{ minWidth: 240 }}
                                        autoFocus
                                    />
                                    <IconButton size="small" color="success" disabled={savingIban} onClick={async () => {
                                        setSavingIban(true);
                                        try {
                                            const res = await fetch('/api/users', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ email: user.email, iban: ibanValue.trim() }),
                                            });
                                            if (res.ok) { showToast('IBAN saved', 'success'); mutateUser(); setEditingIban(false); }
                                            else showToast('Failed to save IBAN', 'error');
                                        } catch { showToast('Error saving IBAN', 'error'); }
                                        setSavingIban(false);
                                    }}><CheckIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => { setEditingIban(false); setIbanValue(dbUser?.iban || ''); }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </>
                            ) : (
                                <>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>
                                        {dbUser?.iban ? dbUser.iban : <em style={{ opacity: 0.5 }}>No IBAN set</em>}
                                    </Typography>
                                    <IconButton size="small" onClick={() => { setIbanValue(dbUser?.iban || ''); setEditingIban(true); }}>
                                        <EditIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </>
                            )}
                        </Box>
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

                                {/* House actions */}
                                {!deletionRequest && otherLeaveRequests.length === 0 && (
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                        {memberCount > 1 && !myLeaveRequest && (
                                            <Button
                                                variant="outlined"
                                                color="warning"
                                                size="small"
                                                startIcon={<DirectionsRunIcon />}
                                                onClick={handleInitiateLeave}
                                                disabled={loading}
                                            >
                                                Leave House
                                            </Button>
                                        )}
                                        {canDeleteHouse && !myLeaveRequest && (
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
                                    </Box>
                                )}

                                {/* Leave Request logic */}
                                {myLeaveRequest && (
                                    <Alert
                                        severity="warning"
                                        sx={{ mb: 2 }}
                                        action={
                                            <Button color="inherit" size="small" startIcon={<CancelIcon />} onClick={handleCancelLeave} disabled={loading}>
                                                Cancel
                                            </Button>
                                        }
                                    >
                                        <strong>Your leave request is pending.</strong><br />
                                        Approved by {myLeaveRequest.approvals?.length || 0} of {memberCount - 1} members.
                                    </Alert>
                                )}

                                {otherLeaveRequests.map(([email, req]: [string, any]) => {
                                    const hasApprovedLeave = req.approvals?.includes(user?.email);
                                    return (
                                        <Alert
                                            key={email}
                                            severity="info"
                                            sx={{ mb: 2 }}
                                            action={
                                                !hasApprovedLeave ? (
                                                    <Button color="inherit" size="small" startIcon={<HowToVoteIcon />} onClick={() => handleApproveLeave(email)} disabled={loading}>
                                                        Approve
                                                    </Button>
                                                ) : undefined
                                            }
                                        >
                                            {hasApprovedLeave ? (
                                                <span>You approved <strong>{email}</strong>'s request to leave. Waiting for others.</span>
                                            ) : (
                                                <span><strong>{email}</strong> has requested to leave the house.</span>
                                            )}
                                        </Alert>
                                    );
                                })}

                                {deletionRequest && deletionRequest.initiatedBy === user?.email && (
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

                                {deletionRequest && deletionRequest.initiatedBy !== user?.email && !hasApproved && (
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

                                {deletionRequest && deletionRequest.initiatedBy !== user?.email && hasApproved && (
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        You have approved the deletion. Waiting for other members.
                                    </Alert>
                                )}
                            </Paper>
                        ) : (
                            <Paper className="glass" sx={{ p: 3, background: 'transparent', boxShadow: 'none' }}>
                                <Typography gutterBottom>You are not in a house yet.</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    You can create a new house below, or share your email — <strong>{user?.email}</strong> — so a housemate can add you to theirs.
                                </Typography>
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

                <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                    <DialogTitle>Delete House?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {memberCount > 1
                                ? 'All members must approve before the house is deleted. Continue to initiate the request?'
                                : 'Are you sure you want to delete this house? All data will be permanently removed. This cannot be undone.'}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                        <Button onClick={confirmDeleteHouse} color="error" variant="contained">
                            {memberCount > 1 ? 'Request Deletion' : 'Delete'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={openLeaveDialog} onClose={() => setOpenLeaveDialog(false)}>
                    <DialogTitle>Leave House?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to leave this house? You will no longer be able to see its expenses or buy list. Your past expenses will remain.
                            <br /><br />
                            <strong>Warning:</strong> Please ensure you have settled any outstanding balances before leaving.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenLeaveDialog(false)}>Cancel</Button>
                        <Button onClick={confirmLeaveHouse} color="warning" variant="contained">
                            Leave House
                        </Button>
                    </DialogActions>
                </Dialog>

                <Box sx={{ pb: 7 }}>
                    <BottomNav />
                </Box>
            </main>
        </AuthGuard>
    );
}
