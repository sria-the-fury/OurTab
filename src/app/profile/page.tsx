'use client';

import React, { useState } from 'react';
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
import { useUserData, UserData } from '@/hooks/useUserData';
import { useToast } from '@/components/ToastContext';
import BottomNav from '@/components/BottomNav';
import Loader from '@/components/Loader';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import HomeIcon from '@mui/icons-material/Home';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CakeIcon from '@mui/icons-material/Cake';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CancelIcon from '@mui/icons-material/Cancel';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import FeedbackIcon from '@mui/icons-material/Feedback';
import SendIcon from '@mui/icons-material/Send';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FacebookIcon from '@mui/icons-material/Facebook';
import WorkIcon from '@mui/icons-material/Work';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import AuthGuard from '@/components/AuthGuard';

export default function Profile() {
    const { user, currency, updateCurrency, loading: authLoading, dbUser, house, mutateUser, mutateHouse, logout } = useAuth();
    const [newHouseCurrency, setNewHouseCurrency] = useState('USD'); // local picker for Create House form
    const [typeOfHouse, setTypeOfHouse] = useState<'expenses' | 'meals_and_expenses'>('expenses');
    const [mealsPerDay, setMealsPerDay] = useState<2 | 3>(3);
    const [houseName, setHouseName] = useState('');
    const [loading, setLoading] = useState(false);
    const [ibanValue, setIbanValue] = useState('');
    const [editingIban, setEditingIban] = useState(false);
    const [savingIban, setSavingIban] = useState(false);

    // New Fields State
    const [professionValue, setProfessionValue] = useState('');
    const [whatsappValue, setWhatsappValue] = useState('');
    const [messengerValue, setMessengerValue] = useState('');
    const [walletValue, setWalletValue] = useState('');
    const [birthdayValue, setBirthdayValue] = useState(''); // Format: MM-DD

    const [editingProfession, setEditingProfession] = useState(false);
    const [editingSocial, setEditingSocial] = useState(false);
    const [editingPayment, setEditingPayment] = useState(false);
    const [editingBirthday, setEditingBirthday] = useState(false);
    const [savingFields, setSavingFields] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
    const [feedbackSubject, setFeedbackSubject] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);

    // Member Settings Edit State
    const [editingMember, setEditingMember] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<'manager' | 'member'>('member');
    const [editRent, setEditRent] = useState<number | string>(0);

    // Meal window settings
    const [mealWindowStart, setMealWindowStart] = useState('20:00');
    const [mealWindowEnd, setMealWindowEnd] = useState('05:00');
    const [savingMealWindow, setSavingMealWindow] = useState(false);

    // Sync meal window state with house data
    React.useEffect(() => {
        if (house?.mealUpdateWindowStart) setMealWindowStart(house.mealUpdateWindowStart);
        if (house?.mealUpdateWindowEnd) setMealWindowEnd(house.mealUpdateWindowEnd);
    }, [house?.mealUpdateWindowStart, house?.mealUpdateWindowEnd]);

    // Sync user data with state
    React.useEffect(() => {
        if (dbUser) {
            setProfessionValue(dbUser.profession || '');
            setWhatsappValue(dbUser.whatsapp || '');
            setMessengerValue(dbUser.messenger || '');
            setWalletValue(dbUser.wallet || '');
            setBirthdayValue(dbUser.birthday || '');
            setIbanValue(dbUser.iban || '');
        }
    }, [dbUser]);

    const { showToast } = useToast();

    // Derived state
    interface HouseDetails {
        id?: string;
        name?: string;
        currency?: string;
        createdBy?: string;
        typeOfHouse?: 'expenses' | 'meals_and_expenses';
        members?: {
            email: string;
            name?: string;
            photoUrl?: string;
            role?: 'manager' | 'member';
            rentAmount?: number;
        }[];
        deletionRequest?: {
            initiatedBy?: string;
            approvals?: string[];
        };
        leaveRequests?: Record<string, {
            approvals?: string[];
        }>;
        pendingPayments?: unknown[];
        mealUpdateWindowStart?: string;
        mealUpdateWindowEnd?: string;
    }
    const hasHouse = !!dbUser?.houseId;
    const houseDetails = house as HouseDetails | null;
    const effectiveCreator = houseDetails?.createdBy || (houseDetails?.members && houseDetails.members[0]?.email);
    const isCreator = effectiveCreator === user?.email;
    const isManager = isCreator || (houseDetails?.members?.find(m => m.email === user?.email)?.role === 'manager');
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
            const bodyData: any = {
                name: houseName,
                createdBy: user?.email,
                currency: newHouseCurrency,
                typeOfHouse
            };
            if (typeOfHouse === 'meals_and_expenses') {
                bodyData.mealsPerDay = mealsPerDay;
            }

            const res = await fetch('/api/houses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
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

    const handleUpdateMemberSettings = async (targetEmail: string) => {
        if (!houseDetails?.id || !user?.email) return;
        setLoading(true);
        try {
            const res = await fetch('/api/houses/update-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    houseId: houseDetails.id,
                    userEmail: user.email,
                    targetEmail,
                    role: editRole,
                    rentAmount: editRent === '' ? 0 : Number(editRent)
                })
            });
            if (res.ok) {
                showToast('Member settings updated', 'success');
                mutateHouse();
                setEditingMember(null);
            } else {
                showToast('Failed to update member settings', 'error');
            }
        } catch {
            showToast('Error updating member', 'error');
        }
        setLoading(false);
    };

    const handleSaveFields = async (fields: Partial<UserData>) => {
        if (!user?.email) return;
        setSavingFields(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, ...fields }),
            });
            if (res.ok) {
                showToast('Profile updated', 'success');
                mutateUser();
                return true;
            } else {
                showToast('Failed to update profile', 'error');
                return false;
            }
        } catch {
            showToast('Error saving profile', 'error');
            return false;
        } finally {
            setSavingFields(false);
        }
    };

    if (authLoading) return <Loader />;
    if (!user) return null;

    return (
        <AuthGuard>
            <main>
                <Navbar />

                {/* ── Premium Background Elements ── */}
                <Box sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: -1,
                    overflow: 'hidden',
                    pointerEvents: 'none'
                }}>
                    <Box className="animate-blob" sx={{
                        position: 'absolute',
                        top: '-10%',
                        left: '-10%',
                        width: '40vw',
                        height: '40vw',
                        background: 'radial-gradient(circle, rgba(124, 77, 255, 0.15) 0%, transparent 70%)',
                        filter: 'blur(50px)'
                    }} />
                    <Box className="animate-blob" sx={{
                        position: 'absolute',
                        bottom: '10%',
                        right: '-5%',
                        width: '35vw',
                        height: '35vw',
                        background: 'radial-gradient(circle, rgba(0, 184, 212, 0.15) 0%, transparent 70%)',
                        filter: 'blur(50px)',
                        animationDelay: '2s'
                    }} />
                </Box>

                <Container maxWidth="sm" sx={{ mt: 3, mb: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* ── Card 1: User Info (Premium Header) ── */}
                    <Paper className="glass animate-stagger" sx={{ p: 0, overflow: 'hidden', background: 'transparent', transitionDelay: '0.1s' }}>
                        <Box sx={{
                            p: 3,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                            position: 'relative'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <Avatar
                                        src={user.photoURL || ''}
                                        sx={{
                                            width: 86,
                                            height: 86,
                                            border: '3px solid rgba(255,255,255,0.2)',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                                        }}
                                    />
                                    <Box className="shimmer" sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        borderRadius: '50%',
                                        zIndex: 1,
                                        pointerEvents: 'none'
                                    }} />
                                </Box>
                                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                    <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, letterSpacing: '-0.02em', color: 'text.primary' }}>
                                        {user.displayName}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.6, mb: 2, fontWeight: 500 }}>
                                        {user.email}
                                    </Typography>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {/* Profession Badge */}
                                        {editingProfession ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TextField
                                                    size="small"
                                                    placeholder="e.g. Student @ University"
                                                    value={professionValue}
                                                    onChange={(e) => setProfessionValue(e.target.value)}
                                                    sx={{ flex: 1, '& .MuiInputBase-root': { borderRadius: '20px', background: 'rgba(255,255,255,0.05)' } }}
                                                    autoFocus
                                                />
                                                <IconButton size="small" color="success" disabled={savingFields} onClick={async () => {
                                                    if (await handleSaveFields({ profession: professionValue.trim() })) {
                                                        setEditingProfession(false);
                                                    }
                                                }}>
                                                    <CheckIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => { setEditingProfession(false); setProfessionValue(dbUser?.profession || ''); }}>
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <Box
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    px: 1.5,
                                                    py: 0.5,
                                                    borderRadius: '20px',
                                                    background: 'rgba(124, 77, 255, 0.1)',
                                                    border: '1px solid rgba(124, 77, 255, 0.2)',
                                                    width: 'fit-content',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': { background: 'rgba(124, 77, 255, 0.15)', transform: 'scale(1.02)' }
                                                }}
                                                onClick={() => { setProfessionValue(dbUser?.profession || ''); setEditingProfession(true); }}
                                            >
                                                <WorkIcon sx={{ fontSize: 14, color: '#7c4dff' }} />
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#7c4dff', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    {dbUser?.profession || 'Set Profession'}
                                                </Typography>
                                                <EditIcon sx={{ fontSize: 10, opacity: 0.5 }} />
                                            </Box>
                                        )}

                                        {/* Birthday Badge */}
                                        {editingBirthday ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        value={birthdayValue?.split('-')[0] || '01'}
                                                        onChange={(e) => {
                                                            const month = e.target.value;
                                                            const day = birthdayValue?.split('-')[1] || '01';
                                                            setBirthdayValue(`${month}-${day}`);
                                                        }}
                                                        sx={{ flex: 1, '& .MuiInputBase-root': { borderRadius: '20px 0 0 20px', background: 'rgba(255,255,255,0.05)' } }}
                                                        SelectProps={{ native: true }}
                                                    >
                                                        {Array.from({ length: 12 }).map((_, i) => (
                                                            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                                {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                                                            </option>
                                                        ))}
                                                    </TextField>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        value={birthdayValue?.split('-')[1] || '01'}
                                                        onChange={(e) => {
                                                            const day = e.target.value;
                                                            const month = birthdayValue?.split('-')[0] || '01';
                                                            setBirthdayValue(`${month}-${day}`);
                                                        }}
                                                        sx={{ flex: 1, '& .MuiInputBase-root': { borderRadius: '0 20px 20px 0', background: 'rgba(255,255,255,0.05)' } }}
                                                        SelectProps={{ native: true }}
                                                    >
                                                        {Array.from({ length: 31 }).map((_, i) => (
                                                            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                                {i + 1}
                                                            </option>
                                                        ))}
                                                    </TextField>
                                                </Box>
                                                <IconButton size="small" color="success" disabled={savingFields} onClick={async () => {
                                                    if (await handleSaveFields({ birthday: birthdayValue })) {
                                                        setEditingBirthday(false);
                                                    }
                                                }}>
                                                    <CheckIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => { setEditingBirthday(false); setBirthdayValue(dbUser?.birthday || ''); }}>
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <Box
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    px: 1.5,
                                                    py: 0.5,
                                                    borderRadius: '20px',
                                                    background: 'rgba(255, 105, 180, 0.1)',
                                                    border: '1px solid rgba(255, 105, 180, 0.2)',
                                                    width: 'fit-content',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': { background: 'rgba(255, 105, 180, 0.15)', transform: 'scale(1.02)' }
                                                }}
                                                onClick={() => { setBirthdayValue(dbUser?.birthday || '01-01'); setEditingBirthday(true); }}
                                            >
                                                <CakeIcon sx={{ fontSize: 14, color: '#ff69b4' }} />
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#ff69b4', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    {dbUser?.birthday ? (() => {
                                                        const [m, d] = dbUser.birthday.split('-');
                                                        const date = new Date(2000, parseInt(m) - 1, parseInt(d));
                                                        const dayNum = parseInt(d);
                                                        const suffix = (n: number) => {
                                                            if (n > 3 && n < 21) return 'th';
                                                            switch (n % 10) {
                                                                case 1: return "st";
                                                                case 2: return "nd";
                                                                case 3: return "rd";
                                                                default: return "th";
                                                            }
                                                        };
                                                        return `${dayNum}${suffix(dayNum)} ${date.toLocaleString('default', { month: 'long' })}`;
                                                    })() : 'Set Birthday'}
                                                </Typography>
                                                <EditIcon sx={{ fontSize: 10, opacity: 0.5 }} />
                                            </Box>
                                        )}

                                        {/* House Info */}
                                        {hasHouse && houseDetails && (
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mt: 1,
                                                opacity: 0.8
                                            }}>
                                                <HomeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    <Box component="span" sx={{ color: 'primary.main', fontFamily: 'var(--font-abril)', letterSpacing: '0.05em' }}>
                                                        {houseDetails.name}
                                                    </Box>
                                                    {' '}<Box component="span" sx={{ opacity: 0.5 }}>[{houseDetails.currency === 'EUR' ? '€' : houseDetails.currency === 'BDT' ? '৳' : '$'}]</Box>
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </Paper>

                    {/* ── Card 2: Social Records (Premium Grid) ── */}
                    <Paper className="glass animate-stagger" sx={{ p: 3, background: 'transparent', transitionDelay: '0.2s' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
                                Social Network
                            </Typography>
                            {!editingSocial && (
                                <IconButton size="small" onClick={() => setEditingSocial(true)} sx={{ background: 'rgba(255,255,255,0.05)', '&:hover': { background: 'rgba(255,255,255,0.1)' } }}>
                                    <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            )}
                        </Box>

                        {editingSocial ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <TextField
                                    label="WhatsApp Number"
                                    size="small"
                                    placeholder="+8801..."
                                    value={whatsappValue}
                                    onChange={(e) => setWhatsappValue(e.target.value)}
                                    fullWidth
                                    sx={{ '& .MuiInputBase-root': { borderRadius: '12px' } }}
                                />
                                <TextField
                                    label="Messenger Username/Link"
                                    size="small"
                                    placeholder="fb.com/username"
                                    value={messengerValue}
                                    onChange={(e) => setMessengerValue(e.target.value)}
                                    fullWidth
                                    sx={{ '& .MuiInputBase-root': { borderRadius: '12px' } }}
                                />
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <Button size="small" sx={{ borderRadius: '20px' }} onClick={() => {
                                        setEditingSocial(false);
                                        setWhatsappValue(dbUser?.whatsapp || '');
                                        setMessengerValue(dbUser?.messenger || '');
                                    }}>Cancel</Button>
                                    <Button size="small" variant="contained" sx={{ borderRadius: '20px', px: 3 }} disabled={savingFields} onClick={async () => {
                                        if (await handleSaveFields({ whatsapp: whatsappValue.trim(), messenger: messengerValue.trim() })) {
                                            setEditingSocial(false);
                                        }
                                    }}>Save Links</Button>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <Box sx={{
                                    p: 2,
                                    borderRadius: '16px',
                                    background: 'rgba(37, 211, 102, 0.05)',
                                    border: '1px solid rgba(37, 211, 102, 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                    transition: 'all 0.3s ease',
                                    '&:hover': { transform: 'scale(1.05)', background: 'rgba(37, 211, 102, 0.08)' }
                                }}>
                                    <WhatsAppIcon sx={{ color: '#25D366', fontSize: 24 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.5 }}>WhatsApp</Typography>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                                        {dbUser?.whatsapp ? (
                                            <a href={`https://wa.me/${dbUser.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                                {dbUser.whatsapp}
                                            </a>
                                        ) : 'Not linked'}
                                    </Typography>
                                </Box>

                                <Box sx={{
                                    p: 2,
                                    borderRadius: '16px',
                                    background: 'rgba(0, 132, 255, 0.05)',
                                    border: '1px solid rgba(0, 132, 255, 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                    transition: 'all 0.3s ease',
                                    '&:hover': { transform: 'scale(1.05)', background: 'rgba(0, 132, 255, 0.08)' }
                                }}>
                                    <FacebookIcon sx={{ color: '#0084FF', fontSize: 24 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.5 }}>Messenger</Typography>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                                        {dbUser?.messenger ? (
                                            <a href={dbUser.messenger.startsWith('http') ? dbUser.messenger : `https://${dbUser.messenger}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                                Open Chat
                                            </a>
                                        ) : 'Not linked'}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Paper>

                    {/* ── Card 3: Banking Details (Conditional Premium) ── */}
                    {hasHouse && houseDetails?.typeOfHouse === 'expenses' && (
                        <Paper className="glass animate-stagger" sx={{ p: 3, background: 'transparent', transitionDelay: '0.3s' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ p: 1, borderRadius: '10px', background: 'rgba(var(--primary-rgb), 0.1)' }}>
                                        <AccountBalanceIcon color="primary" sx={{ fontSize: 20 }} />
                                    </Box>
                                    <Typography variant="subtitle1" fontWeight={900} sx={{ letterSpacing: '-0.01em' }}>Banking Details</Typography>
                                </Box>
                                {!editingIban && (
                                    <IconButton size="small" onClick={() => setEditingIban(true)} sx={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                )}
                            </Box>

                            {editingIban ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField
                                        label="IBAN"
                                        size="small"
                                        placeholder="DE89..."
                                        value={ibanValue}
                                        onChange={(e) => setIbanValue(e.target.value)}
                                        fullWidth
                                        autoFocus
                                        sx={{ '& .MuiInputBase-root': { borderRadius: '12px' } }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        <Button size="small" onClick={() => {
                                            setEditingIban(false);
                                            setIbanValue(dbUser?.iban || '');
                                        }}>Cancel</Button>
                                        <Button size="small" variant="contained" sx={{ borderRadius: '20px', px: 3 }} disabled={savingFields} onClick={async () => {
                                            if (await handleSaveFields({ iban: ibanValue.trim() })) {
                                                setEditingIban(false);
                                            }
                                        }}>Save IBAN</Button>
                                    </Box>
                                </Box>
                            ) : (
                                <Box sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5
                                }}>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem' }}>IBAN</Typography>
                                    <Typography variant="body2" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.95rem', letterSpacing: '0.05em', fontWeight: 600 }} color={dbUser?.iban ? 'text.primary' : 'text.disabled'}>
                                        {dbUser?.iban || 'Not configured'}
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    )}

                    {/* ── Card 4: House Management ── */}
                    <Paper className="glass animate-stagger" sx={{ p: 3, background: 'transparent', transitionDelay: '0.4s' }}>

                        {hasHouse && houseDetails ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

                                {/* Manager Settings (Only for meals_and_expenses) */}
                                {houseDetails.typeOfHouse === 'meals_and_expenses' && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>Member Settings</Typography>
                                        {houseDetails.members?.map((member) => (
                                            <Paper key={member.email} variant="outlined" sx={{ p: 1.5, mb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar src={member.photoUrl} sx={{ width: 24, height: 24 }} />
                                                        <Typography variant="body2"><strong>{member.name || member.email.split('@')[0]}</strong></Typography>
                                                    </Box>
                                                    {isManager && editingMember !== member.email && (
                                                        <IconButton size="small" onClick={() => {
                                                            setEditingMember(member.email);
                                                            setEditRole(member.role || 'member');
                                                            setEditRent(member.rentAmount || 0);
                                                        }}>
                                                            <EditIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    )}
                                                </Box>

                                                {editingMember === member.email ? (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                                                        <TextField
                                                            select label="Role" size="small"
                                                            value={editRole} onChange={(e) => setEditRole(e.target.value as 'manager' | 'member')}
                                                            disabled={member.email === houseDetails.createdBy} // Creator is always manager
                                                        >
                                                            <MenuItem value="manager">Manager</MenuItem>
                                                            <MenuItem value="member">Member</MenuItem>
                                                        </TextField>
                                                        <TextField
                                                            type="number" label="Monthly Rent" size="small"
                                                            value={editRent} onChange={(e) => setEditRent(e.target.value === '' ? '' : Number(e.target.value))}
                                                        />
                                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                            <Button size="small" onClick={() => setEditingMember(null)}>Cancel</Button>
                                                            <Button size="small" variant="contained" onClick={() => handleUpdateMemberSettings(member.email)} disabled={loading}>Save</Button>
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', gap: 2, typography: 'caption', color: 'text.secondary' }}>
                                                        <span>Role: <Box component="span" sx={{ color: member.role === 'manager' || member.email === houseDetails.createdBy ? 'primary.main' : 'inherit', fontWeight: member.role === 'manager' || member.email === houseDetails.createdBy ? 'bold' : 'normal' }}>{member.email === houseDetails.createdBy ? 'Creator (Manager)' : member.role || 'Member'}</Box></span>
                                                        <span>Rent: <strong>{member.rentAmount || 0}</strong> {houseDetails.currency}</span>
                                                    </Box>
                                                )}
                                            </Paper>
                                        ))}
                                    </Box>
                                )}

                                {/* Meal Update Window Settings (Manager only, meals_and_expenses) */}
                                {houseDetails.typeOfHouse === 'meals_and_expenses' && isManager && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>Meal Update Window</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                            Members can opt out of next day&apos;s meals during this time window.
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <TextField
                                                label="Window Opens (Today)"
                                                type="time"
                                                size="small"
                                                value={mealWindowStart}
                                                onChange={(e) => setMealWindowStart(e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ width: 180 }}
                                            />
                                            <TextField
                                                label="Window Closes (Next Morning)"
                                                type="time"
                                                size="small"
                                                value={mealWindowEnd}
                                                onChange={(e) => setMealWindowEnd(e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ width: 180 }}
                                            />
                                            <Button
                                                variant="contained"
                                                size="small"
                                                disabled={savingMealWindow || (mealWindowStart === (houseDetails?.mealUpdateWindowStart || '20:00') && mealWindowEnd === (houseDetails?.mealUpdateWindowEnd || '05:00'))}
                                                onClick={async () => {
                                                    setSavingMealWindow(true);
                                                    try {
                                                        const res = await fetch('/api/houses', {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                houseId: houseDetails.id,
                                                                mealUpdateWindowStart: mealWindowStart,
                                                                mealUpdateWindowEnd: mealWindowEnd,
                                                                updatedBy: user.email
                                                            })
                                                        });
                                                        if (res.ok) {
                                                            showToast('Meal window saved!', 'success');
                                                            mutateHouse();
                                                        } else {
                                                            showToast('Failed to save', 'error');
                                                        }
                                                    } catch {
                                                        showToast('Error saving meal window', 'error');
                                                    } finally {
                                                        setSavingMealWindow(false);
                                                    }
                                                }}
                                            >
                                                Save Window
                                            </Button>
                                        </Box>
                                    </Box>
                                )}

                                {/* Action buttons moved to bottom */}
                                {!deletionRequest && otherLeaveRequests.length === 0 && (
                                    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                                            House Management
                                        </Typography>
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
                                        <TextField select label="House Type" value={typeOfHouse} onChange={(e) => setTypeOfHouse(e.target.value as 'expenses' | 'meals_and_expenses')} fullWidth size="small">
                                            <MenuItem value="expenses">Expenses Tracking Only</MenuItem>
                                            <MenuItem value="meals_and_expenses">Meal and Expenses Tracking</MenuItem>
                                        </TextField>
                                        {typeOfHouse === 'meals_and_expenses' && (
                                            <TextField select label="Meals Per Day" value={mealsPerDay} onChange={(e) => setMealsPerDay(e.target.value as any)} fullWidth size="small">
                                                <MenuItem value={2}>Two Meals (Lunch, Dinner)</MenuItem>
                                                <MenuItem value={3}>Three Meals (Breakfast, Lunch, Dinner)</MenuItem>
                                            </TextField>
                                        )}
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

                    {/* ── Card 5: Logout ── */}
                    <Box className="animate-stagger" sx={{ transitionDelay: '0.45s' }}>
                        <Button
                            fullWidth
                            variant="contained"
                            color="error"
                            startIcon={<LogoutIcon />}
                            onClick={logout}
                            sx={{
                                py: 2,
                                borderRadius: '24px',
                                background: 'rgba(211, 47, 47, 0.05)',
                                color: '#d32f2f',
                                border: '1px solid rgba(211, 47, 47, 0.2)',
                                boxShadow: 'none',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                '&:hover': {
                                    background: 'rgba(211, 47, 47, 0.1)',
                                    border: '1px solid rgba(211, 47, 47, 0.4)',
                                    boxShadow: '0 8px 24px rgba(211, 47, 47, 0.1)'
                                },
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                        >
                            Sign Out
                        </Button>
                    </Box>

                    {/* ── Footer: Feedback link ── */}
                    <Box className="animate-stagger" sx={{ textAlign: 'center', pt: 1, transitionDelay: '0.5s' }}>
                        <Typography
                            variant="body2"
                            color="text.disabled"
                            sx={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.8,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                '&:hover': { color: 'primary.main', transform: 'translateY(-1px)' },
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            onClick={() => setOpenFeedbackDialog(true)}
                        >
                            <FeedbackIcon sx={{ fontSize: 16 }} />
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
        </AuthGuard >
    );
}
