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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
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
    // const { showToast } = useToast();

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
                : itemsBreakdown;

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

    const [openHistory, setOpenHistory] = useState(false);
    const [monthlyExpenses, setMonthlyExpenses] = useState<{ [key: string]: GroceryItem[] }>({});
    const [groupData, setGroupData] = useState<any>(null);

    // Helper to load image for PDF
    const loadImage = (url: string): Promise<string | null> => {
        return new Promise((resolve) => {
            if (!url) {
                resolve(null);
                return;
            }
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => {
                console.warn('Failed to load image:', url);
                resolve(null);
            };
            img.src = url;
        });
    };

    // Helper to load local asset
    const loadLocalAsset = async (path: string): Promise<string | null> => {
        try {
            const res = await fetch(path);
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn('Failed to load local asset:', path);
            return null;
        }
    };

    // Fetch expenses and group details for history
    const handleOpenHistory = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Group Details (Name, Members with Photos)
            const groupRes = await fetch(`/api/groups/my-group?email=${user.email}`);
            let currentGroup = null;
            if (groupRes.ok) {
                currentGroup = await groupRes.json();
                setGroupData(currentGroup);
            }

            if (currentGroup?.id) {
                const expensesRes = await fetch(`/api/expenses?groupId=${currentGroup.id}`);
                const expensesData = await expensesRes.json();

                // Group by month
                const grouped: { [key: string]: any[] } = {};
                expensesData.forEach((exp: any) => {
                    const date = new Date(exp.date);
                    const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    if (!grouped[monthKey]) grouped[monthKey] = [];
                    grouped[monthKey].push(exp);
                });
                setMonthlyExpenses(grouped);
                setOpenHistory(true);
            } else {
                setMessage({ type: 'error', text: 'Group not found' });
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
            setMessage({ type: 'error', text: 'Failed to load history' });
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async (month: string) => {
        try {
            console.log('Starting PDF generation for:', month);
            setMessage({ type: '', text: 'Generating PDF...' });

            const expenses = monthlyExpenses[month];
            if (!expenses) {
                console.error('No expenses found for month:', month);
                return;
            }

            // --- SETTLEMENT LOGIC ---
            const memberBalances: { [email: string]: number } = {};
            if (groupData?.members) {
                groupData.members.forEach((m: any) => memberBalances[m.email] = 0);
            }

            let totalGroupExpense = 0;
            expenses.forEach((exp: any) => {
                const amount = (exp as any).amount;
                const payer = (exp as any).userId;
                if (memberBalances[payer] !== undefined) {
                    memberBalances[payer] += amount;
                } else {
                    memberBalances[payer] = amount;
                }
                totalGroupExpense += amount;
            });

            const activeMemberCount = groupData?.members?.length || 0;
            const sharePerPerson = totalGroupExpense / (activeMemberCount || 1);

            const debtors: { email: string, amount: number }[] = [];
            const creditors: { email: string, amount: number }[] = [];

            Object.keys(memberBalances).forEach(email => {
                const net = memberBalances[email] - sharePerPerson;
                if (net < -0.01) debtors.push({ email, amount: -net });
                else if (net > 0.01) creditors.push({ email, amount: net });
            });

            const settlements: string[] = [];
            let i = 0;
            let j = 0;

            while (i < debtors.length && j < creditors.length) {
                const debtor = debtors[i];
                const creditor = creditors[j];
                const amount = Math.min(debtor.amount, creditor.amount);

                const debtorName = groupData?.members?.find((m: any) => m.email === debtor.email)?.name || debtor.email.split('@')[0];
                const creditorName = groupData?.members?.find((m: any) => m.email === creditor.email)?.name || creditor.email.split('@')[0];

                settlements.push(`${debtorName} pays ${creditorName}: ${getCurrencySymbol()}${amount.toFixed(2)}`);

                debtor.amount -= amount;
                creditor.amount -= amount;

                if (debtor.amount < 0.01) i++;
                if (creditor.amount < 0.01) j++;
            }

            if (activeMemberCount === 0) settlements.push("No members to split expenses.");
            else if (settlements.length === 0 && totalGroupExpense > 0) settlements.push("All settled! Everyone paid their share.");


            // Pre-load assets
            // Use SVG icon if PNG is missing or problematic, but ideally convert to PNG
            // Since we have a helper that converts images to PNG data URLs via canvas, we can use that on the SVG.
            const logoDataUrl = await loadImage('/icon.svg');

            // Mapping email to loaded photo URL
            const memberPhotos: { [email: string]: string | null } = {};

            if (groupData?.members) {
                await Promise.all(groupData.members.map(async (m: any) => {
                    if (m.photoUrl) {
                        const loaded = await loadImage(m.photoUrl);
                        if (loaded) { // Only store if successfully loaded
                            memberPhotos[m.email] = loaded;
                        }
                    }
                }));
            }

            // Import jsPDF
            const { jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            // --- HEADER ---
            // Group Name (Centered with stylish font)
            doc.setFontSize(20);
            doc.setFont('times', 'bold');
            doc.text(groupData?.name || 'My Group', pageWidth / 2, 20, { align: 'center' });

            // Generation Info
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated by: ${user?.displayName || user?.email}`, 14, 28);

            const today = new Date();
            const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
            doc.text(`Date: ${todayStr}`, 14, 34);

            // Right: Group Members
            if (groupData?.members) {
                doc.setFontSize(8);
                const memberX = pageWidth - 14;
                let rightY = 15;
                groupData.members.forEach((m: any) => {
                    const mName = m.name || m.email.split('@')[0];
                    doc.text(mName, memberX, rightY, { align: 'right' });
                    rightY += 4;
                });
            }

            // Report Month Title (Optional, fits context)
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Expense Report: ${month}`, 14, 45);

            let memberY = 45;

            // --- TABLE ---
            const tableData = expenses.map(exp => {
                const dateObj = new Date((exp as any).date);
                const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

                const member = groupData?.members?.find((m: any) => m.email === (exp as any).userId);
                // Last name only logic (fallback to full name or email part if simple split fails)
                const fullName = member?.name || (exp as any).userId.split('@')[0];
                const names = fullName.split(' ');
                const lastName = names.length > 1 ? names[names.length - 1] : names[0];

                return [
                    dateStr,
                    (exp as any).description,
                    {
                        content: lastName,
                        styles: { valign: 'middle', halign: 'left' },
                        userId: (exp as any).userId // Passing ID for drawCell hook
                    },
                    `${getCurrencySymbol()}${(exp as any).amount.toFixed(2)}`
                ];
            });

            // Calculate Total
            const total = expenses.reduce((sum, exp) => sum + (exp as any).amount, 0);
            tableData.push(['', '', 'Total', `${getCurrencySymbol()}${total.toFixed(2)}`]);

            autoTable(doc, {
                head: [['Date', 'Description', 'User', 'Amount']],
                body: tableData,
                startY: memberY + 15,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
                headStyles: { fillColor: [50, 50, 50] },
                columnStyles: {
                    0: { cellWidth: 25 }, // Date
                    1: { cellWidth: 'auto' }, // Desc
                    2: { cellWidth: 40 }, // User
                    3: { cellWidth: 25, halign: 'right' } // Amount
                }
            });

            // --- SETTLEMENT SECTION ---
            const finalY = (doc as any).lastAutoTable.finalY + 10;

            // Check if we need a new page
            if (finalY > doc.internal.pageSize.height - 40) {
                doc.addPage();
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Settlement Plan", 14, 20);
                let currentY = 30;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                settlements.forEach(line => {
                    doc.text(line, 14, currentY);
                    currentY += 6;
                });
            } else {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Settlement Plan", 14, finalY);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                let currentY = finalY + 8;
                settlements.forEach(line => {
                    doc.text(line, 14, currentY);
                    currentY += 6;
                });
            }

            // --- FOOTER ---
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                const footerY = doc.internal.pageSize.height - 10;

                // Draw Brand Logo (Centered)
                // Assuming logo is square-ish.
                const logoDim = 6;
                const centerX = pageWidth / 2;

                if (logoDataUrl) {
                    try {
                        doc.addImage(logoDataUrl, 'PNG', centerX - 15, footerY - 5, logoDim, logoDim);
                    } catch (e) {
                        console.warn('Failed to add logo to PDF', e);
                    }
                }

                // Brand Name (on same line as logo)
                doc.setFontSize(10);
                doc.setFont('times', 'bold');
                doc.text('OurTab', centerX - 6, footerY);
            }

            console.log('Saving PDF...');
            doc.save(`expenses_${month.replace(/ /g, '_')}.pdf`);

            setMessage({ type: 'success', text: 'PDF downloaded successfully!' });
        } catch (error) {
            console.error("PDF generation failed:", error);
            setMessage({ type: 'error', text: 'Failed to generate PDF. Check console for details.' });
        }
    };

    return (
        <main>
            <Navbar actions={
                <IconButton onClick={handleOpenHistory} sx={{ color: 'black' }}>
                    <HistoryIcon />
                </IconButton>
            } />
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

            {/* History Dialog */}
            <Dialog open={openHistory} onClose={() => setOpenHistory(false)} fullWidth>
                <DialogTitle>Monthly History</DialogTitle>
                <DialogContent>
                    <List>
                        {Object.keys(monthlyExpenses).map(month => (
                            <ListItem key={month} secondaryAction={
                                <IconButton edge="end" onClick={() => downloadPDF(month)}>
                                    <DownloadIcon />
                                </IconButton>
                            }>
                                <ListItemText
                                    primary={month}
                                    secondary={`Total: ${getCurrencySymbol()}${monthlyExpenses[month].reduce((sum, e: any) => sum + e.amount, 0).toFixed(2)}`}
                                />
                            </ListItem>
                        ))}
                        {Object.keys(monthlyExpenses).length === 0 && (
                            <Typography sx={{ p: 2, textAlign: 'center' }}>No history available</Typography>
                        )}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenHistory(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}

