'use client';

import { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EuroIcon from '@mui/icons-material/Euro';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import GroupIcon from '@mui/icons-material/Group';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import IconButton from '@mui/material/IconButton';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import { useHouseData } from '@/hooks/useHouseData';
import { useToast } from '@/components/ToastContext';
import Loader from '@/components/Loader';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
}

export default function Dashboard() {
    const { user, loading: authLoading, currency } = useAuth();
    const router = useRouter();

    // Use the custom hook for data fetching

    const { house, expenses, loading: dataLoading, mutateHouse, mutateExpenses } = useHouseData();

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

    // Calculate totals when expenses change
    useEffect(() => {
        if (expenses) {
            const total = expenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
            const myTotal = expenses
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
    const totalFilteredExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate my actual expenses accounting for contributors
    const myFilteredExpenses = (() => {
        if (!house?.members || !user?.email) return 0;

        const numMembers = house.members.length;
        let myTotal = 0;

        filteredExpenses.forEach((exp: Expense) => {
            // Calculate my share of this expense
            const myShare = exp.amount / numMembers;
            myTotal += myShare;
        });

        return myTotal;
        return myTotal;
    })();

    // Memoize settlement calculation to prevent re-render issues
    const settlements = useMemo(() => {
        if (!house || !house.members || house.members.length < 2) return [];

        const memberBalances: { [key: string]: number } = {};
        const members = house.members;

        // Initialize 0 balance for all members
        members.forEach(m => memberBalances[m.email] = 0);

        // Process each expense
        filteredExpenses.forEach((exp: Expense) => {
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
    }, [house, filteredExpenses]);



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
                            <Paper sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden',
                                background: 'linear-gradient(135deg, #6C63FF 0%, #5A52E0 100%)',
                                color: 'white'
                            }}>
                                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.2 }}>
                                    <CurrencyIcon sx={{ fontSize: 100 }} />
                                </Box>
                                <Typography component="h2" variant="h6" gutterBottom sx={{ opacity: 0.9 }}>
                                    Total Expenses
                                </Typography>
                                <Typography component="p" variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    {displayCurrency}{totalFilteredExpenses.toFixed(2)}
                                </Typography>
                                <Typography sx={{ opacity: 0.8 }}>
                                    {selectedDate.toLocaleString('default', { month: 'long' })}
                                </Typography>
                            </Paper>
                        </Grid>
                        {/* My Cost Widget */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.05, color: 'primary.main' }}>
                                    <ShoppingCartIcon sx={{ fontSize: 100 }} />
                                </Box>
                                <Typography component="h2" variant="h6" color="primary" gutterBottom>
                                    My Expenses
                                </Typography>
                                <Typography component="p" variant="h3" sx={{ fontWeight: 'bold', color: '#333' }}>
                                    {displayCurrency}{myFilteredExpenses.toFixed(2)}
                                </Typography>
                            </Paper>
                        </Grid>
                        {/* Group Name Widget */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.05, color: 'secondary.main' }}>
                                    <GroupIcon sx={{ fontSize: 100 }} />
                                </Box>
                                <Typography component="h2" variant="h6" color="secondary" gutterBottom>
                                    My House
                                </Typography>
                                {house ? (
                                    <Box>
                                        <Typography component="p" variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                            {house.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
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
                                        <Typography color="text.secondary" paragraph>
                                            You are not in a house yet.
                                        </Typography>
                                        <Button variant="contained" color="secondary" href="/profile">Create House</Button>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Settlements Widget - KEEP AS IS (Usually settles all time, or maybe just this month? 
                    settlements are usually running totals, but for now let's keep it simple and maybe warn user it's all time 
                    OR filter it too? 
                    Actually, settlements should probably be ALL time to be correct mathematically for "owing". 
                    If we filter by month, it just shows who paid what THIS month, not who owes who overall. 
                    Let's use filteredExpenses for settlements to show "Monthly Logic" as requested, 
                    OR keep it global. 
                    User asked for "previous months expenses". 
                    I'll use filteredExpenses so it shows the settlement status FOR THAT MONTH.
                */}
                    {house && filteredExpenses.length > 0 && house.members && house.members.length > 1 && (
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

                                        let message;
                                        if (isCurrentUserPayer) {
                                            message = (
                                                <Typography variant="body1">
                                                    <strong>You</strong> will pay <strong>{toName}</strong>
                                                </Typography>
                                            );
                                        } else if (isCurrentUserReceiver) {
                                            message = (
                                                <Typography variant="body1">
                                                    <strong>You</strong> will get from <strong>{fromName}</strong>
                                                </Typography>
                                            );
                                        } else {
                                            message = (
                                                <Typography variant="body1">
                                                    <strong>{fromName}</strong> will pay <strong>{toName}</strong>
                                                </Typography>
                                            );
                                        }

                                        return (
                                            <Grid size={{ xs: 12, md: 6 }} key={`${settlement.from}-${settlement.to}-${settlement.amount}-${index}`}>
                                                <Paper className="glass" sx={{ p: 2, background: 'transparent', borderLeft: '4px solid #6C63FF' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Box>
                                                            {message}
                                                        </Box>
                                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                                                            {displayCurrency}{settlement.amount.toFixed(2)}
                                                        </Typography>
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
                                    const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                            Groceries - {expense.description}
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
            </main>
        </AuthGuard>
    );
}
