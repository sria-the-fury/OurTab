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
import FeedbackIcon from '@mui/icons-material/Feedback';
import SendIcon from '@mui/icons-material/Send';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import AuthGuard from '@/components/AuthGuard';

export default function Profile() {
    const { user, currency, updateCurrency, loading: authLoading, dbUser, house, mutateUser, mutateHouse } = useAuth();
    const [houseName, setHouseName] = useState('');
    const [newHouseCurrency, setNewHouseCurrency] = useState('USD'); // local picker for Create House form
    const [loading, setLoading] = useState(false);
    const [ibanValue, setIbanValue] = useState('');
    const [editingIban, setEditingIban] = useState(false);
    const [savingIban, setSavingIban] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
    const [feedbackSubject, setFeedbackSubject] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);
    const { showToast } = useToast();

    // Derived state
    const hasHouse = !!dbUser?.houseId;
    interface HouseDetails {
        id?: string;
        name?: string;
        currency?: string;
        createdBy?: string;
        members?: { email: string; name?: string; photoUrl?: string; }[];
        deletionRequest?: {
            initiatedBy?: string;
            approvals?: string[];
        };
        leaveRequests?: Record<string, {
            approvals?: string[];
        }>;
        pendingPayments?: unknown[];
    }
    const houseDetails = house as HouseDetails | null;
    const effectiveCreator = houseDetails?.createdBy || (houseDetails?.members && houseDetails.members[0]?.email);
    const isCreator = effectiveCreator === user?.email;
    const creatorLeft = Boolean(houseDetails?.createdBy && houseDetails?.members && !houseDetails.members.some(m => m.email === houseDetails.createdBy));
    const canDeleteHouse = isCreator || creatorLeft;
    const deletionRequest = houseDetails?.deletionRequest;
    const memberCount = (houseDetails?.members || []).length;
    const hasApproved = deletionRequest?.approvals?.includes(user?.email ?? '');
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
                body: JSON.stringify({ name: houseName, createdBy: user?.email, currency: newHouseCurrency })
            });
            if (res.ok) {
                showToast('House created successfully!', 'success');
                mutateUser();
                mutateHouse();
            } else {
                showToast('Failed to create house', 'error');
            }
        } catch {
            showToast('Error creating house', 'error');
        }
        setLoading(false);
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
        } catch {
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
        } catch {
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
                showToast(data.fullyApproved ? `${userToApprove} has left the house.` : 'Approval recorded', 'success');
                mutateHouse();
            } else {
                showToast('Failed to approve leave', 'error');
            }
        } catch {
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
        } catch {
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
                showToast(data.deleted ? 'House deleted.' : 'Your approval has been recorded.', 'success');
                mutateUser();
                mutateHouse();
            } else {
                showToast(data.error || 'Failed to approve', 'error');
            }
        } catch {
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
        } catch {
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
                <Container maxWidth="sm" sx={{ mt: 3, mb: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>

                    {/* ── Card 1: User Info ── */}
                    <Paper className="glass" sx={{ p: 3, background: 'transparent' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar src={user.photoURL || ''} sx={{ width: 72, height: 72 }} />
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Typography variant="h6" fontWeight={700} noWrap>{user.displayName}</Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
                                {hasHouse && houseDetails && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                        <HomeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                        <Typography variant="caption" color="text.secondary">
                                            <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'var(--font-abril)' }}>
                                                {houseDetails.name}
                                            </Box>
                                            {' '}[{houseDetails.currency === 'EUR' ? '€' : houseDetails.currency === 'BDT' ? '৳' : '$'}]
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* IBAN row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountBalanceIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mr: 0.5 }}>IBAN</Typography>
                            {editingIban ? (
                                <>
                                    <TextField
                                        size="small"
                                        placeholder="e.g. DE89 3704 0044 0532 0130 00"
                                        value={ibanValue}
                                        onChange={(e) => setIbanValue(e.target.value)}
                                        sx={{ flex: 1 }}
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
                                    }}>
                                        <CheckIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => { setEditingIban(false); setIbanValue(dbUser?.iban || ''); }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </>
                            ) : (
                                <>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', flex: 1 }}>
                                        {dbUser?.iban ? dbUser.iban : <em style={{ opacity: 0.5 }}>Not set</em>}
                                    </Typography>
                                    <IconButton size="small" onClick={() => { setIbanValue(dbUser?.iban || ''); setEditingIban(true); }}>
                                        <EditIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </>
                            )}
                        </Box>
                    </Paper>

                    {/* ── Card 3: House Management ── */}
                    <Paper className="glass" sx={{ p: 3, background: 'transparent' }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                            House Management
                        </Typography>

                        {hasHouse && houseDetails ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {/* Action buttons */}
                                {!deletionRequest && otherLeaveRequests.length === 0 && (
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                        {memberCount > 1 && !myLeaveRequest && (
                                            <Button variant="outlined" color="warning" size="small" startIcon={<DirectionsRunIcon />} onClick={() => setOpenLeaveDialog(true)} disabled={loading}>
                                                Leave House
                                            </Button>
                                        )}
                                        {canDeleteHouse && !myLeaveRequest && (
                                            <Button variant="outlined" color="error" size="small" startIcon={<DeleteForeverIcon />} onClick={() => setOpenDeleteDialog(true)} disabled={loading}>
                                                {memberCount > 1 ? 'Request House Deletion' : 'Delete House'}
                                            </Button>
                                        )}
                                    </Box>
                                )}

                                {myLeaveRequest && (
                                    <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<CancelIcon />} onClick={handleCancelLeave} disabled={loading}>Cancel</Button>}>
                                        <strong>Your leave request is pending.</strong><br />
                                        Approved by {myLeaveRequest.approvals?.length || 0} of {memberCount - 1} members.
                                    </Alert>
                                )}

                                {otherLeaveRequests.map(([email, req]: [string, { approvals?: string[] }]) => {
                                    const hasApprovedLeave = req.approvals?.includes(user?.email ?? '');
                                    const requesterObj = houseDetails?.members?.find(m => m.email === email);
                                    const requesterName = requesterObj?.name || email.split('@')[0];
                                    const requesterPhotoUrl = requesterObj?.photoUrl || '';
                                    return (
                                        <Alert key={email} severity="info" action={!hasApprovedLeave ? (
                                            <Button color="inherit" size="small" startIcon={<HowToVoteIcon />} onClick={() => handleApproveLeave(email)} disabled={loading}>Approve</Button>
                                        ) : undefined}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar src={requesterPhotoUrl} sx={{ width: 24, height: 24 }} />
                                                <Box>
                                                    {hasApprovedLeave
                                                        ? <span>You approved <strong>{requesterName}</strong>&apos;s request. Waiting for others.</span>
                                                        : <span><strong>{requesterName}</strong> has requested to leave the house.</span>}
                                                </Box>
                                            </Box>
                                        </Alert>
                                    );
                                })}

                                {deletionRequest && deletionRequest.initiatedBy === user?.email && (
                                    <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<CancelIcon />} onClick={handleCancelDeletion} disabled={loading}>Cancel</Button>}>
                                        <strong>Deletion pending approval.</strong><br />
                                        Approved by {deletionRequest.approvals?.length || 0} of {memberCount - 1} members.
                                    </Alert>
                                )}

                                {deletionRequest && deletionRequest.initiatedBy !== user?.email && !hasApproved && (() => {
                                    const initiatorObj = houseDetails?.members?.find(m => m.email === deletionRequest.initiatedBy);
                                    const initiatorName = initiatorObj?.name || deletionRequest.initiatedBy?.split('@')[0] || 'A member';
                                    const initiatorPhotoUrl = initiatorObj?.photoUrl || '';
                                    return (
                                        <Alert severity="error" action={<Button color="inherit" size="small" startIcon={<HowToVoteIcon />} onClick={handleApproveDeletion} disabled={loading}>Approve</Button>}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar src={initiatorPhotoUrl} sx={{ width: 24, height: 24 }} />
                                                <Box>
                                                    <strong>{initiatorName}</strong> has requested to delete this house and all its data.
                                                </Box>
                                            </Box>
                                        </Alert>
                                    );
                                })()}

                                {deletionRequest && deletionRequest.initiatedBy !== user?.email && hasApproved && (
                                    <Alert severity="info">You have approved the deletion. Waiting for other members.</Alert>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    You&apos;re not in a house yet. Create one below, or share your email — <strong>{user?.email}</strong> — so a housemate can add you.
                                </Typography>
                                <form onSubmit={handleCreateHouse}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <TextField label="House Name" fullWidth size="small" value={houseName} onChange={(e) => setHouseName(e.target.value)} required />
                                        <TextField select label="Default Currency" value={newHouseCurrency} onChange={(e) => setNewHouseCurrency(e.target.value)} fullWidth size="small">
                                            <MenuItem value="USD">Dollar ($)</MenuItem>
                                            <MenuItem value="EUR">Euro (€)</MenuItem>
                                            <MenuItem value="BDT">Bangladeshi Taka (৳)</MenuItem>
                                        </TextField>
                                        <Button type="submit" variant="contained" disabled={loading} sx={{ alignSelf: 'flex-start' }}>Create House</Button>
                                    </Box>
                                </form>
                            </Box>
                        )}
                    </Paper>

                    {/* ── Footer: Feedback link ── */}
                    <Box sx={{ textAlign: 'center', pt: 1 }}>
                        <Typography
                            variant="body2"
                            color="text.disabled"
                            sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.5, '&:hover': { color: 'primary.main' }, transition: 'color 0.2s' }}
                            onClick={() => setOpenFeedbackDialog(true)}
                        >
                            <FeedbackIcon sx={{ fontSize: 14 }} />
                            Send Feedback & Suggestions
                        </Typography>
                    </Box>

                </Container>

                {/* Delete House Dialog */}
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

                {/* Leave House Dialog */}
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
                        <Button onClick={confirmLeaveHouse} color="warning" variant="contained">Leave House</Button>
                    </DialogActions>
                </Dialog>

                {/* Feedback Modal */}
                <Dialog open={openFeedbackDialog} onClose={() => setOpenFeedbackDialog(false)} fullWidth maxWidth="xs">
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FeedbackIcon color="primary" fontSize="small" /> Feedback & Suggestions
                    </DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Have an idea or found a bug? We read every email.
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField label="Subject" size="small" fullWidth value={feedbackSubject} onChange={(e) => setFeedbackSubject(e.target.value)} placeholder="e.g. Feature request: dark mode" />
                            <TextField label="Message" size="small" fullWidth multiline rows={4} value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} placeholder="Tell us what you think..." />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenFeedbackDialog(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            disabled={!feedbackSubject.trim() || !feedbackMessage.trim()}
                            onClick={() => {
                                const subject = encodeURIComponent(feedbackSubject.trim());
                                const body = encodeURIComponent(`${feedbackMessage.trim()}\n\n— Sent by ${user?.displayName || user?.email}`);
                                window.open(`mailto:jakariamsria@gmail.com?subject=${subject}&body=${body}`, '_blank');
                                setFeedbackSubject('');
                                setFeedbackMessage('');
                                setOpenFeedbackDialog(false);
                                showToast('Opening your email client…', 'success');
                            }}
                        >
                            Send
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
