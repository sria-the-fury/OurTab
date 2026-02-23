'use client';

import { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EuroIcon from '@mui/icons-material/Euro';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import GroupIcon from '@mui/icons-material/Group';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import IconButton from '@mui/material/IconButton';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import { useHouseData } from '@/hooks/useHouseData';
import { useToast } from '@/components/ToastContext';
import Loader from '@/components/Loader';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PaymentsIcon from '@mui/icons-material/Payments';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';

interface House {
    id: string;
    name: string;
    createdBy: string;
    members?: { email: string; name?: string; photoUrl?: string }[];
}

interface Expense {
    id: string;
    amount: number;
    description: string;
    userId: string;
    houseId: string;
    date: string;
    contributors?: Array<{ email: string; amount: number }>;
    isSettlementPayment?: boolean;
    settlementBetween?: string[];
}

export default function Dashboard() {
    const { user, loading: authLoading, currency } = useAuth();
    const router = useRouter();

    // Use the custom hook for data fetching
    const { house, expenses, todos, loading: dataLoading, mutateHouse, mutateExpenses } = useHouseData();

    // Derived state for pending todos
    const pendingTodos = useMemo(() => {
        return todos?.filter(todo => !todo.isCompleted) || [];
    }, [todos]);

    // Combine loading states
    const loading = authLoading || (!!user && dataLoading && !house && expenses.length === 0);

    const [totalExpenses, setTotalExpenses] = useState(0);
    const [myExpenses, setMyExpenses] = useState(0);

    const currencySymbols: { [key: string]: string } = {
        'USD': '$',
        'EUR': '€',
        'BDT': '৳'
    };

    const [selectedDate, setSelectedDate] = useState(new Date());

    const currencyIcons: { [key: string]: any } = {
        'USD': AttachMoneyIcon,
        'EUR': EuroIcon,
        'BDT': CurrencyExchangeIcon // Using generic exchange icon for Taka as specific might not exist or use text
    };

    const CurrencyIcon = currencyIcons[currency] || AttachMoneyIcon;
    const displayCurrency = currencySymbols[currency] || '$';

    const { showToast } = useToast();
    const [openAddMember, setOpenAddMember] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');

    const [openEditExpense, setOpenEditExpense] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [showAllExpenses, setShowAllExpenses] = useState(false);

    // Settle Money state
    const [openPayDialog, setOpenPayDialog] = useState(false);
    const [paySettlement, setPaySettlement] = useState<{ from: string; to: string; amount: number } | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState<'cash' | 'bank'>('bank');

    // Calculate totals when expenses change
    useEffect(() => {
        if (expenses) {
            const regularExpenses = expenses.filter((e: Expense) => !e.isSettlementPayment);
            const total = regularExpenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
            const myTotal = regularExpenses
                .filter((exp: Expense) => exp.userId === user?.email)
                .reduce((sum: number, exp: Expense) => sum + exp.amount, 0);

            setTotalExpenses(total);
            setMyExpenses(myTotal);
        }
    }, [expenses, user]);


    const handleOpenEdit = (expense: Expense) => {
        setEditingExpenseId(expense.id);
        setEditAmount(expense.amount.toString());
        setEditDescription(expense.description);
        setOpenEditExpense(true);
    };

    const handleSaveEdit = async () => {
        if (!editingExpenseId || !user) return;

        try {
            const res = await fetch('/api/expenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingExpenseId,
                    userId: user.email,
                    amount: editAmount,
                    description: editDescription
                })
            });

            if (res.ok) {
                // Update local state by revalidating SWR
                mutateExpenses();
                setOpenEditExpense(false);
                showToast('Expense updated successfully!', 'success');
            } else {
                showToast('Failed to update expense. It might be older than 48 hours.', 'error');
            }
        } catch (error) {
            console.error('Failed to update expense', error);
            showToast('Error updating expense', 'error');
        }
    };

    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

    const handleDeleteExpense = (id: string) => {
        console.log('handleDeleteExpense called with ID:', id);
        setExpenseToDelete(id);
        setOpenDeleteConfirm(true);
        console.log('Set openDeleteConfirm to true');
    };

    const confirmDeleteExpense = async () => {
        if (!expenseToDelete || !user) return;

        try {
            const res = await fetch(`/api/expenses?id=${expenseToDelete}&userId=${user.email}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                mutateExpenses();
                showToast('Expense deleted successfully!', 'success');
            } else {
                showToast('Failed to delete expense. It might be older than 48 hours.', 'error');
            }
        } catch (error) {
            console.error('Failed to delete expense', error);
            showToast('Error deleting expense', 'error');
        } finally {
            setOpenDeleteConfirm(false);
            setExpenseToDelete(null);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberEmail || !house) return;

        try {
            const res = await fetch('/api/houses/add-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newMemberEmail, houseId: house.id })
            });

            const data = await res.json();

            if (res.ok) {
                showToast('Member added successfully!', 'success');
                setNewMemberEmail('');
                mutateHouse();
                setOpenAddMember(false);
            } else {
                showToast(data.error || 'Failed to add member', 'error');
            }
        } catch (error) {
            showToast('Error adding member', 'error');
        }
    };


    const handlePreviousMonth = () => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setSelectedDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setSelectedDate(newDate);
    };

    // Filter expenses for selected month
    const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === selectedDate.getMonth() &&
            expenseDate.getFullYear() === selectedDate.getFullYear();
    });

    // Calculate totals based on filtered expenses
    const totalFilteredExpenses = filteredExpenses
        .filter(exp => !exp.isSettlementPayment)
        .reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate my actual expenses accounting for contributors
    const myFilteredExpenses = (() => {
        if (!house?.members || !user?.email) return 0;

        const numMembers = house.members.length;
        let myTotal = 0;

        const regularFilteredExpenses = filteredExpenses.filter((e: Expense) => !e.isSettlementPayment);

        regularFilteredExpenses.forEach((exp: Expense) => {
            // Calculate my share of this expense
            const myShare = exp.amount / numMembers;
            myTotal += myShare;
        });

        return myTotal;
    })();

    // Memoize settlement calculation to prevent re-render issues
    const settlements = useMemo(() => {
        if (!house || !house.members || house.members.length < 2) return [];

        const memberBalances: { [key: string]: number } = {};
        const members = house.members;

        // Initialize 0 balance for all members
        members.forEach(m => memberBalances[m.email] = 0);

        // Process all expenses so payments and debts cancel out accurately over time
        expenses.forEach((exp: Expense) => {
            if (exp.isSettlementPayment && exp.settlementBetween && exp.settlementBetween.length === 2) {
                // Settlement payment — only affects the two members involved
                const [payer, receiver] = [exp.userId, exp.settlementBetween.find(e => e !== exp.userId)!];
                if (memberBalances[payer] !== undefined) memberBalances[payer] += exp.amount;
                else memberBalances[payer] = exp.amount;
                if (memberBalances[receiver] !== undefined) memberBalances[receiver] -= exp.amount;
                else memberBalances[receiver] = -exp.amount;
                return;
            }
            if (exp.contributors && exp.contributors.length > 0) {
                // Expense has contributors - track who paid what
                let contributorTotal = 0;
                exp.contributors.forEach(contributor => {
                    if (memberBalances[contributor.email] !== undefined) {
                        memberBalances[contributor.email] += contributor.amount;
                    } else {
                        memberBalances[contributor.email] = contributor.amount;
                    }
                    contributorTotal += contributor.amount;
                });

                // If contributors don't cover the full amount,
                // attribute the remainder to the creator (handles legacy data)
                const remainder = exp.amount - contributorTotal;
                if (remainder > 0.01) {
                    if (memberBalances[exp.userId] !== undefined) {
                        memberBalances[exp.userId] += remainder;
                    } else {
                        memberBalances[exp.userId] = remainder;
                    }
                }

                // Split the expense equally among all members
                const sharePerPerson = exp.amount / members.length;
                members.forEach(m => {
                    memberBalances[m.email] -= sharePerPerson;
                });
            } else {
                // No contributors specified - assume creator paid all, split equally
                if (memberBalances[exp.userId] !== undefined) {
                    memberBalances[exp.userId] += exp.amount;
                } else {
                    memberBalances[exp.userId] = exp.amount;
                }

                // Split equally among all members
                const sharePerPerson = exp.amount / members.length;
                members.forEach(m => {
                    memberBalances[m.email] -= sharePerPerson;
                });
            }
        });

        // Calculate net balances (Positive = is owed money, Negative = owes money)
        const netBalances: { id: string, amount: number }[] = [];
        Object.keys(memberBalances).forEach(email => {
            netBalances.push({
                id: email,
                amount: memberBalances[email]
            });
        });

        // Separate into receivers (+) and payers (-)
        const receivers = netBalances.filter(b => b.amount > 0.01).sort((a, b) => b.amount - a.amount);
        const payers = netBalances.filter(b => b.amount < -0.01).sort((a, b) => a.amount - b.amount);

        const calculatedSettlements = [];

        let r = 0;
        let p = 0;

        while (r < receivers.length && p < payers.length) {
            const receiver = receivers[r];
            const payer = payers[p];

            // The amount to settle is the minimum of what payer owes and receiver is owed
            const amount = Math.min(Math.abs(payer.amount), receiver.amount);

            if (amount > 0.01) {
                calculatedSettlements.push({
                    from: payer.id,
                    to: receiver.id,
                    amount: amount
                });
            }

            // Adjust balances
            receiver.amount -= amount;
            payer.amount += amount;

            if (receiver.amount < 0.01) r++;
            if (payer.amount > -0.01) p++;
        }

        return calculatedSettlements;
    }, [house, expenses]);

    const myDebt = useMemo(() => {
        if (!user?.email || !settlements) return 0;
        return settlements.filter((s: any) => s.from === user.email).reduce((sum: number, s: any) => sum + s.amount, 0);
    }, [settlements, user]);

    const myCredit = useMemo(() => {
        if (!user?.email || !settlements) return 0;
        return settlements.filter((s: any) => s.to === user.email).reduce((sum: number, s: any) => sum + s.amount, 0);
    }, [settlements, user]);

    if (loading) {
        return <Loader />;
    }

    return (
        <AuthGuard>
            <main>
                <Navbar />
                <Container maxWidth="lg" sx={{ mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                        <Typography variant="h4" component="h1">
                            Dashboard
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} href="/shopping">
                            Add Expense
                        </Button>
                    </Box>

                    {/* Month Navigation */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                        <IconButton onClick={handlePreviousMonth}>
                            <ArrowBackIosIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ mx: 2, minWidth: 150, textAlign: 'center' }}>
                            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </Typography>
                        <IconButton onClick={handleNextMonth} disabled={selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()}>
                            <ArrowForwardIosIcon />
                        </IconButton>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Total Cost Widget */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper className="glass" sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden',
                                bgcolor: 'rgba(108, 99, 255, 0.08)',
                                border: '1px solid rgba(108, 99, 255, 0.2)'
                            }}>
                                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.15, color: 'primary.main' }}>
                                    <CurrencyIcon sx={{ fontSize: 100 }} />
                                </Box>
                                <Typography component="h2" variant="h6" color="primary" gutterBottom>
                                    Total Expenses
                                </Typography>
                                <Typography component="p" variant="h3" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
                                    {displayCurrency}{totalFilteredExpenses.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {selectedDate.toLocaleString('default', { month: 'long' })}
                                </Typography>
                                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed rgba(108, 99, 255, 0.3)' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        My Expenses
                                    </Typography>
                                    <Typography component="p" variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                        {displayCurrency}{myFilteredExpenses.toFixed(2)}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                        {/* My Settlements Widget */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper className="glass" sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden',
                                bgcolor: 'rgba(0, 191, 165, 0.08)',
                                border: '1px solid rgba(0, 191, 165, 0.2)'
                            }}>
                                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.15, color: 'secondary.main' }}>
                                    <AccountBalanceWalletIcon sx={{ fontSize: 100 }} />
                                </Box>
                                <Typography component="h2" variant="h6" color="secondary" gutterBottom>
                                    My Settlements
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                            <ArrowUpwardIcon color="error" sx={{ fontSize: 16, mr: 0.5 }} /> To Pay
                                        </Typography>
                                        <Typography component="p" variant="h5" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                            {displayCurrency}{myDebt.toFixed(2)}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                            <ArrowDownwardIcon color="success" sx={{ fontSize: 16, mr: 0.5 }} /> To Receive
                                        </Typography>
                                        <Typography component="p" variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                            {displayCurrency}{myCredit.toFixed(2)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                        {/* Group Name Widget */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper className="glass" sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden',
                                bgcolor: 'rgba(2, 136, 209, 0.08)',
                                border: '1px solid rgba(2, 136, 209, 0.2)'
                            }}>
                                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.15, color: 'info.main' }}>
                                    <GroupIcon sx={{ fontSize: 100 }} />
                                </Box>
                                {house ? (
                                    <Box>
                                        <Typography component="h2" variant="h4" sx={{
                                            fontWeight: 'bold',
                                            fontFamily: 'var(--font-abril)',
                                            color: 'primary.main',
                                            mb: 3,
                                            pt: 1
                                        }}>
                                            <Box component="span" sx={{ fontSize: '1.5em', color: 'rgba(108, 99, 255, 0.4)', lineHeight: 0, verticalAlign: 'bottom' }}>&ldquo;</Box>
                                            {house.name}
                                            <Box component="span" sx={{ fontSize: '1.5em', color: 'rgba(108, 99, 255, 0.4)', lineHeight: 0, verticalAlign: 'top' }}>&rdquo;</Box>
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 3 }}>
                                            {house.members?.map((member) => (
                                                <Chip
                                                    key={member.email}
                                                    avatar={<Avatar alt={member.name} src={member.photoUrl} />}
                                                    label={member.name || member.email.split('@')[0]}
                                                    variant="filled"
                                                    color="default"
                                                    sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}
                                                />
                                            ))}
                                        </Box>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            size="small"
                                            startIcon={<PersonAddIcon />}
                                            onClick={() => setOpenAddMember(true)}
                                            sx={{ mt: 'auto', alignSelf: 'flex-start' }}
                                        >
                                            Add Member
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', justifyContent: 'center', flex: 1 }}>
                                        <Typography component="h2" variant="h6" color="info.main" gutterBottom>
                                            My House
                                        </Typography>
                                        <Typography color="text.secondary" paragraph>
                                            You are not in a house yet.
                                        </Typography>
                                        <Button variant="contained" color="secondary" href="/profile">Create House</Button>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* Buy List Widget */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                bgcolor: 'rgba(237, 108, 2, 0.08)',
                                border: '1px solid rgba(237, 108, 2, 0.2)',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                                },
                            }}
                                onClick={() => router.push('/buy-list')}
                            >
                                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.15, color: 'warning.main' }}>
                                    <FormatListBulletedIcon sx={{ fontSize: 100 }} />
                                </Box>
                                <Typography component="h2" variant="h6" color="warning.main" gutterBottom>
                                    Buy List ({pendingTodos.length})
                                </Typography>

                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {pendingTodos.length === 0 ? (
                                        <Typography color="text.secondary" variant="body2" sx={{ my: 'auto', textAlign: 'center' }}>
                                            No pending items. You're all caught up! ✨
                                        </Typography>
                                    ) : (
                                        pendingTodos.slice(0, 3).map(todo => (
                                            <Box key={todo.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />
                                                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                                    {todo.itemName}
                                                </Typography>
                                            </Box>
                                        ))
                                    )}
                                    {pendingTodos.length > 3 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                            + {pendingTodos.length - 3} more items
                                        </Typography>
                                    )}
                                </Box>
                                <Typography variant="caption" sx={{ mt: 'auto', pt: 2, color: 'text.secondary', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {pendingTodos.length === 0 ? 'Click to add item' : 'Click to open full list'} <ArrowForwardIosIcon sx={{ fontSize: 10 }} />
                                </Typography>
                            </Paper>
                        </Grid>

                    </Grid>

                    {/* Pending Payment Requests (Receiver View) */}
                    {house && (() => {
                        const myPending = (house.pendingPayments || []).filter(
                            p => p.to === user?.email && p.status === 'pending'
                        );
                        if (myPending.length === 0) return null;
                        const houseMembers = house.members || [];
                        return (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>Incoming Payment Requests</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {myPending.map(payment => {
                                        const fromMember = houseMembers.find(m => m.email === payment.from);
                                        const fromName = fromMember?.name || payment.from.split('@')[0];
                                        return (
                                            <Alert
                                                key={payment.id}
                                                severity="info"
                                                action={
                                                    <Button
                                                        color="inherit"
                                                        size="small"
                                                        startIcon={<HowToVoteIcon />}
                                                        onClick={async () => {
                                                            try {
                                                                const res = await fetch('/api/houses/approve-payment', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        houseId: house.id,
                                                                        paymentId: payment.id,
                                                                        approverEmail: user?.email,
                                                                    }),
                                                                });
                                                                if (res.ok) {
                                                                    showToast('Payment approved! Settlement updated.', 'success');
                                                                    mutateHouse();
                                                                    mutateExpenses();
                                                                } else {
                                                                    const d = await res.json();
                                                                    showToast(d.error || 'Failed to approve', 'error');
                                                                }
                                                            } catch {
                                                                showToast('Error approving payment', 'error');
                                                            }
                                                        }}
                                                    >
                                                        Approve
                                                    </Button>
                                                }
                                            >
                                                <strong>{fromName}</strong> says he paid you{' '}
                                                <strong>{displayCurrency}{payment.amount.toFixed(2)}</strong>
                                                {payment.method && (
                                                    <Chip
                                                        label={payment.method === 'cash' ? '💵 Cash' : '🏦 Bank'}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ ml: 1, verticalAlign: 'middle', fontSize: '0.7rem' }}
                                                    />
                                                )}.{' '}
                                                Approve to update the settlement.
                                            </Alert>
                                        );
                                    })}
                                </Box>
                            </Box>
                        );
                    })()}

                    {/* Settlements Widget */}
                    {house && expenses.length > 0 && house.members && house.members.length > 1 && (
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="h6" gutterBottom>Settlements (Who owes whom)</Typography>
                            <Grid container spacing={2}>
                                {settlements.length === 0 ? (
                                    <Grid size={{ xs: 12 }}>
                                        <Paper className="glass" sx={{ p: 2, background: 'transparent' }}>
                                            <Typography color="text.secondary">All settled up! No payments needed.</Typography>
                                        </Paper>
                                    </Grid>
                                ) : (
                                    settlements.map((settlement, index) => {
                                        const members = house?.members || [];
                                        const fromMember = members.find(m => m.email === settlement.from);
                                        const toMember = members.find(m => m.email === settlement.to);
                                        const fromName = fromMember?.name || settlement.from.split('@')[0];
                                        const toName = toMember?.name || settlement.to.split('@')[0];
                                        const isCurrentUserPayer = settlement.from === user?.email;
                                        const isCurrentUserReceiver = settlement.to === user?.email;

                                        // Check if current user has a pending payment request for this pair
                                        const hasPendingRequest = (house.pendingPayments || []).some(
                                            p => p.from === settlement.from && p.to === settlement.to && p.status === 'pending'
                                        );

                                        // IBAN of receiver (available from member data fetched via my-house API)
                                        const toUserIban = (toMember as any)?.iban;

                                        let message;
                                        if (isCurrentUserPayer) {
                                            message = (
                                                <Typography variant="body1">
                                                    <strong>You</strong> owe <strong>{toName}</strong>
                                                </Typography>
                                            );
                                        } else if (isCurrentUserReceiver) {
                                            message = (
                                                <Typography variant="body1">
                                                    <strong>{fromName}</strong> owes <strong>you</strong>
                                                </Typography>
                                            );
                                        } else {
                                            message = (
                                                <Typography variant="body1">
                                                    <strong>{fromName}</strong> owes <strong>{toName}</strong>
                                                </Typography>
                                            );
                                        }

                                        return (
                                            <Grid size={{ xs: 12, md: 6 }} key={`${settlement.from}-${settlement.to}-${settlement.amount}-${index}`}>
                                                <Paper className="glass" sx={{ p: 2, background: 'transparent', borderLeft: `4px solid ${isCurrentUserPayer ? '#ff9800' : isCurrentUserReceiver ? '#4caf50' : '#6C63FF'}` }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                                        <Box>
                                                            {message}
                                                            {isCurrentUserPayer && toUserIban && (
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
                                                                    IBAN: {toUserIban}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                                                                {displayCurrency}{settlement.amount.toFixed(2)}
                                                            </Typography>
                                                            {isCurrentUserPayer && (
                                                                hasPendingRequest ? (
                                                                    <Chip label="Pending approval" size="small" color="warning" variant="outlined" />
                                                                ) : (
                                                                    <Button
                                                                        variant="contained"
                                                                        size="small"
                                                                        startIcon={<PaymentsIcon />}
                                                                        color="success"
                                                                        onClick={() => {
                                                                            setPaySettlement(settlement);
                                                                            setPayAmount(settlement.amount.toFixed(2));
                                                                            setPayMethod('bank');
                                                                            setOpenPayDialog(true);
                                                                        }}
                                                                    >
                                                                        Pay Now
                                                                    </Button>
                                                                )
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </Paper>
                                            </Grid>
                                        );
                                    })
                                )}
                            </Grid>
                        </Box>
                    )}


                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h6" gutterBottom>Expenses for {selectedDate.toLocaleString('default', { month: 'long' })}</Typography>
                        {filteredExpenses.length === 0 ? (
                            <Typography color="text.secondary">No expenses found.</Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {(() => {
                                    const sortedExpenses = [...filteredExpenses]
                                        .filter((e: any) => !e.isSettlementPayment)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                    const displayedExpenses = showAllExpenses ? sortedExpenses : sortedExpenses.slice(0, 5);

                                    return displayedExpenses.map((expense) => {
                                        const member = house?.members?.find(m => m.email === expense.userId);
                                        const memberName = member?.name || expense.userId.split('@')[0];
                                        const expenseDate = new Date(expense.date);
                                        const expenseDateStr = expenseDate.toLocaleString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        });

                                        // Check if current user is owner and within 48 hours
                                        const isOwner = user?.email === expense.userId;
                                        const now = new Date();
                                        const diffInHours = (now.getTime() - expenseDate.getTime()) / (1000 * 60 * 60);
                                        const canEdit = isOwner && diffInHours <= 48;

                                        return (
                                            <Paper key={expense.id} className="glass" sx={{ p: 2, background: 'transparent' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            Groceries: {expense.description}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {memberName} • {expenseDateStr}
                                                        </Typography>
                                                        {expense.contributors && expense.contributors.length > 0 && (
                                                            <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                                                                Paid by: {expense.contributors.map(c => {
                                                                    const contributorMember = house?.members?.find(m => m.email === c.email);
                                                                    const contributorName = contributorMember?.name || c.email.split('@')[0];
                                                                    return `${contributorName} (${displayCurrency}${c.amount.toFixed(2)})`;
                                                                }).join(', ')}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mr: 2 }}>
                                                            {displayCurrency}{expense.amount.toFixed(2)}
                                                        </Typography>
                                                        {canEdit && (
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteExpense(expense.id)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Paper>
                                        );
                                    });
                                })()}
                                {filteredExpenses.length > 5 && (
                                    <Button
                                        onClick={() => setShowAllExpenses(!showAllExpenses)}
                                        sx={{ mt: 1, alignSelf: 'center' }}
                                    >
                                        {showAllExpenses ? 'Show Less' : `Show ${filteredExpenses.length - 5} More`}
                                    </Button>
                                )}
                            </Box>
                        )}
                    </Box>
                </Container>

                <Box sx={{ pb: 7 }}> {/* Padding for BottomNav */}
                    <BottomNav />
                </Box>

                {/* Delete Confirmation Dialog */}
                <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
                    <DialogTitle>Delete Expense</DialogTitle>
                    <DialogContent>
                        <Typography>
                            Are you sure you want to delete this expense? This action cannot be undone.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteConfirm(false)}>Cancel</Button>
                        <Button onClick={confirmDeleteExpense} color="error" variant="contained" autoFocus>
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Add Member Dialog */}
                <Dialog open={openAddMember} onClose={() => setOpenAddMember(false)}>
                    <DialogTitle>Add New Member</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="email"
                            label="Email Address"
                            type="email"
                            fullWidth
                            variant="outlined"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAddMember(false)}>Cancel</Button>
                        <Button onClick={handleAddMember} disabled={!newMemberEmail}>Add</Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Expense Dialog */}
                <Dialog open={openEditExpense} onClose={() => setOpenEditExpense(false)}>
                    <DialogTitle>Edit Expense</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="description"
                            label="Description"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            margin="dense"
                            id="amount"
                            label="Amount"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenEditExpense(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} variant="contained" color="primary">Save</Button>
                    </DialogActions>
                </Dialog>

                {/* Pay Now Confirmation Dialog */}
                <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} fullWidth maxWidth="xs">
                    <DialogTitle>Confirm Payment</DialogTitle>
                    <DialogContent>
                        {paySettlement && (() => {
                            const toMember = house?.members?.find(m => m.email === paySettlement.to);
                            const toName = toMember?.name || paySettlement.to.split('@')[0];
                            return (
                                <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Typography>
                                        Paying <strong>{toName}</strong>
                                    </Typography>

                                    {/* Manual amount input */}
                                    <TextField
                                        label="Amount"
                                        type="number"
                                        fullWidth
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        inputProps={{ min: 0, step: '0.01' }}
                                        InputProps={{
                                            startAdornment: (
                                                <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>{displayCurrency}</Box>
                                            ),
                                        }}
                                    />

                                    {/* Payment method tags */}
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Payment method</Typography>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Chip
                                                label="🏦 Bank"
                                                clickable
                                                color={payMethod === 'bank' ? 'primary' : 'default'}
                                                variant={payMethod === 'bank' ? 'filled' : 'outlined'}
                                                onClick={() => setPayMethod('bank')}
                                                sx={{ fontWeight: payMethod === 'bank' ? 'bold' : 'normal' }}
                                            />
                                            <Chip
                                                label="💵 Cash"
                                                clickable
                                                color={payMethod === 'cash' ? 'success' : 'default'}
                                                variant={payMethod === 'cash' ? 'filled' : 'outlined'}
                                                onClick={() => setPayMethod('cash')}
                                                sx={{ fontWeight: payMethod === 'cash' ? 'bold' : 'normal' }}
                                            />
                                        </Box>
                                    </Box>

                                    <Typography variant="body2" color="text.secondary">
                                        {toName} will receive a notification to approve. Once approved, the settlement will update automatically.
                                    </Typography>
                                </Box>
                            );
                        })()}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<PaymentsIcon />}
                            disabled={!payAmount || Number(payAmount) <= 0}
                            onClick={async () => {
                                if (!paySettlement || !house || !user?.email) return;
                                try {
                                    const res = await fetch('/api/houses/request-payment', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            houseId: house.id,
                                            fromEmail: user.email,
                                            toEmail: paySettlement.to,
                                            amount: Number(payAmount),
                                            method: payMethod,
                                        }),
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                        showToast('Payment request sent! Waiting for approval.', 'success');
                                        mutateHouse();
                                        setOpenPayDialog(false);
                                        setPaySettlement(null);
                                    } else {
                                        showToast(data.error || 'Failed to send payment request', 'error');
                                    }
                                } catch {
                                    showToast('Error sending payment request', 'error');
                                }
                            }}
                        >
                            Confirm Payment
                        </Button>
                    </DialogActions>
                </Dialog>
            </main>
        </AuthGuard>
    );
}
