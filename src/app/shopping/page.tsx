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
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import { useToast } from '@/components/ToastContext';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
import { Contributor } from '@/types/settlement-types';

interface GroceryItem {
    id: string;
    name: string;
    price: number;
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

interface HouseMember {
    email: string;
    name?: string;
    photoUrl?: string;
}


export default function Shopping() {
    const { user, currency, dbUser, house } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    // Item list state
    const [items, setItems] = useState<GroceryItem[]>([]);

    // Current item being added
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');

    // Optional note for the entire shopping trip
    const [note, setNote] = useState('');

    const [loading, setLoading] = useState(false);

    // Contributor state
    // Use cached house members directly
    const houseMembers = house?.members || [];

    const [contributors, setContributors] = useState<{ [email: string]: string }>({});
    const [selectedContributors, setSelectedContributors] = useState<Set<string>>(new Set());
    const [myContribution, setMyContribution] = useState<string>('');


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

    // Removed useEffect for loading group members - using cached 'group' from useAuth

    // Handle contributor selection
    const handleContributorToggle = (email: string) => {
        const newSelected = new Set(selectedContributors);
        if (newSelected.has(email)) {
            newSelected.delete(email);
            const newContributors = { ...contributors };
            delete newContributors[email];
            setContributors(newContributors);
        } else {
            newSelected.add(email);
        }
        setSelectedContributors(newSelected);
    };

    const handleContributorAmountChange = (email: string, amount: string) => {
        setContributors({
            ...contributors,
            [email]: amount
        });
    };

    const handleSplitEqually = () => {
        if (selectedContributors.size === 0) return;

        const includingMe = selectedContributors.has(user?.email || '');
        const totalPeople = selectedContributors.size + (includingMe ? 0 : 1);
        const equalShare = total / totalPeople;
        const equalShareStr = equalShare.toFixed(2);

        const newContributors: { [email: string]: string } = {};
        selectedContributors.forEach(email => {
            newContributors[email] = equalShareStr;
        });

        setContributors(newContributors);
        setMyContribution(equalShareStr);
    };

    const handleIPayAll = () => {
        setSelectedContributors(new Set());
        setContributors({});
        setMyContribution(total.toFixed(2));
    };

    // Calculate totals
    const totalContributions = Object.values(contributors).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
    const myContributionNum = parseFloat(myContribution) || 0;
    const remaining = total - totalContributions - myContributionNum;


    // Auto-fill "Your contribution" with the remaining amount when others' contributions change
    useEffect(() => {
        if (total > 0 && selectedContributors.size > 0) {
            const autoAmount = total - totalContributions;
            setMyContribution(Math.max(0, autoAmount).toFixed(2));
        }
    }, [totalContributions, total, selectedContributors.size]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (items.length === 0) {
            showToast('Please add at least one item.', 'error');
            return;
        }

        if (!user) return;

        setLoading(true);


        try {
            console.log('Starting expense submission for user:', user.email);

            // Use cached dbUser
            if (!dbUser || !dbUser.houseId) {
                console.log('User has no houseId in cache');
                // Fallback check or just error?
                // If cache is consistent, this should be enough.
                if (!dbUser?.houseId) {
                    showToast('You must belong to a house to add expenses.', 'error');
                    setLoading(false);
                    return;
                }
            }

            // Create description with items breakdown
            const itemsBreakdown = items.map(item => `${item.name} ${getCurrencySymbol()}${item.price.toFixed(2)}`).join(', ');
            const description = note
                ? `${note} (Items: ${itemsBreakdown})`
                : itemsBreakdown;

            // Prepare contributors array
            const contributorsList: Contributor[] = [];

            // Add selected contributors
            selectedContributors.forEach(email => {
                const amountStr = contributors[email] || '0';
                const amount = parseFloat(amountStr) || 0;
                if (amount > 0) {
                    contributorsList.push({ email, amount });
                }
            });

            // Always add the creator's contribution (remaining amount)
            const creatorAmount = myContributionNum > 0 ? myContributionNum : Math.max(0, total - totalContributions);
            if (creatorAmount > 0.01) {
                contributorsList.push({ email: user.email!, amount: parseFloat(creatorAmount.toFixed(2)) });
            }

            const expenseRes = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: total.toString(),
                    description,
                    userId: user.email, // Use email as ID concept
                    houseId: dbUser.houseId,
                    contributors: contributorsList.length > 0 ? contributorsList : undefined
                })
            });

            if (!expenseRes.ok) {
                const errorData = await expenseRes.json();
                console.error('Failed to create expense:', errorData);
                throw new Error('Failed to create expense');
            }

            showToast('Shopping list submitted successfully!', 'success');
            setItems([]);
            setNote('');

            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);
        } catch (err) {
            console.error('Error adding expense:', err);
            showToast('Failed to submit shopping list. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const [openHistory, setOpenHistory] = useState(false);
    const [monthlyExpenses, setMonthlyExpenses] = useState<{ [key: string]: Expense[] }>({});
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

    // Removed local groupData state, use 'group' from useAuth

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


    // Fetch expenses and house details for history
    const handleOpenHistory = async () => {
        if (!user || !house) return;
        setLoading(true);
        try {
            if (house.id) {
                const expensesRes = await fetch(`/api/expenses?houseId=${house.id}`);
                const expensesData = await expensesRes.json();

                const grouped: { [key: string]: Expense[] } = {};
                expensesData.forEach((exp: Expense) => {
                    const date = new Date(exp.date);
                    const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    if (!grouped[monthKey]) grouped[monthKey] = [];
                    grouped[monthKey].push(exp);
                });
                setMonthlyExpenses(grouped);
                setAllExpenses(expensesData);
                setOpenHistory(true);
            } else {
                showToast('House not found', 'error');
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
            showToast('Failed to load history', 'error');
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async (month: string) => {
        try {
            console.log('Starting PDF generation for:', month);
            const currentHouseData = house;

            const monthExpenses = monthlyExpenses[month];
            if (!monthExpenses) {
                console.error('No expenses found for month:', month);
                return;
            }

            // Filter out settlements for table and total
            const expenses = monthExpenses.filter((e: Expense) => !e.isSettlementPayment);

            // --- SETTLEMENT LOGIC --- (Follows Dashboard logic using allExpenses)
            const memberBalances: { [email: string]: number } = {};
            const members = currentHouseData?.members || [];
            members.forEach((m: HouseMember) => { memberBalances[m.email] = 0; });

            const totalGroupExpense = expenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
            void totalGroupExpense;

            allExpenses.forEach((exp: Expense) => {
                const amount = exp.amount;
                const payer = exp.userId;

                if (exp.isSettlementPayment && exp.settlementBetween && exp.settlementBetween.length === 2) {
                    const [p, r] = [exp.userId, exp.settlementBetween.find((e: string) => e !== exp.userId)!];
                    if (memberBalances[p] !== undefined) memberBalances[p] += amount;
                    else memberBalances[p] = amount;
                    if (memberBalances[r] !== undefined) memberBalances[r] -= amount;
                    else memberBalances[r] = -amount;
                    return;
                }

                if (exp.contributors && exp.contributors.length > 0) {
                    let contributorTotal = 0;
                    exp.contributors.forEach((c: { email: string; amount: number }) => {
                        if (memberBalances[c.email] !== undefined) {
                            memberBalances[c.email] += c.amount;
                        } else {
                            memberBalances[c.email] = c.amount;
                        }
                        contributorTotal += c.amount;
                    });
                    const remainder = amount - contributorTotal;
                    if (remainder > 0.01) {
                        if (memberBalances[payer] !== undefined) {
                            memberBalances[payer] += remainder;
                        } else {
                            memberBalances[payer] = remainder;
                        }
                    }
                    const sharePerPerson = amount / members.length;
                    members.forEach((m: HouseMember) => { memberBalances[m.email] -= sharePerPerson; });
                } else {
                    if (memberBalances[payer] !== undefined) {
                        memberBalances[payer] += amount;
                    } else {
                        memberBalances[payer] = amount;
                    }
                    const sharePerPerson = amount / members.length;
                    members.forEach((m: HouseMember) => { memberBalances[m.email] -= sharePerPerson; });
                }
            });

            const netBalances: { id: string, amount: number }[] = [];
            Object.keys(memberBalances).forEach(email => {
                netBalances.push({
                    id: email,
                    amount: memberBalances[email]
                });
            });

            const receivers = netBalances.filter(b => b.amount > 0.01).sort((a, b) => b.amount - a.amount);
            const payers = netBalances.filter(b => b.amount < -0.01).sort((a, b) => a.amount - b.amount);

            const settlements: { debtorName: string, creditorName: string, amountStr: string }[] = [];
            let r = 0;
            let p = 0;

            while (r < receivers.length && p < payers.length) {
                const receiver = receivers[r];
                const payer = payers[p];
                const amount = Math.min(Math.abs(payer.amount), receiver.amount);

                if (amount > 0.01) {
                    const debtorName = members.find((m: HouseMember) => m.email === payer.id)?.name || payer.id.split('@')[0];
                    const creditorName = members.find((m: HouseMember) => m.email === receiver.id)?.name || receiver.id.split('@')[0];

                    settlements.push({
                        debtorName,
                        creditorName,
                        amountStr: `${getCurrencySymbol()}${amount.toFixed(2)}`
                    });
                }

                receiver.amount -= amount;
                payer.amount += amount;

                if (receiver.amount < 0.01) r++;
                if (payer.amount > -0.01) p++;
            }

            const activeMemberCount = members.length;
            if (activeMemberCount === 0) {
                // ...
            } else if (settlements.length === 0) {
                // ...
            }


            // Pre-load assets
            // Use SVG icon if PNG is missing or problematic, but ideally convert to PNG
            // Since we have a helper that converts images to PNG data URLs via canvas, we can use that on the SVG.
            const logoDataUrl = await loadImage('/icon.svg');

            // We no longer fetch member photos for the PDF to prevent 429 rate limit errors 

            // Import jsPDF
            const { jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            // --- HEADER ---
            // House Name (Centered with stylish font)
            doc.setFontSize(20);
            doc.setFont('abril', 'bold');
            doc.text(currentHouseData?.name || 'My House', pageWidth / 2, 20, { align: 'center' });

            // Left: House Members
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            let leftY = 30;
            if (currentHouseData?.members) {
                currentHouseData.members.forEach((m: HouseMember) => {
                    const mName = m.name || m.email.split('@')[0];
                    doc.text(mName, 14, leftY);
                    leftY += 4;
                });
            }

            // Right: Generation Info
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const rightX = pageWidth - 14;
            doc.text(`Generated by: ${user?.displayName || user?.email}`, rightX, 30, { align: 'right' });

            const today = new Date();
            const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
            doc.text(`Date: ${todayStr}`, rightX, 36, { align: 'right' });

            // Report Month Title (Optional, fits context)
            const titleY = Math.max(leftY, 45) + 5;
            doc.setFontSize(14);
            doc.setFont('abril', 'bold');
            doc.text(`Expense Report: ${month}`, pageWidth / 2, titleY, { align: 'center' });

            // --- TABLE ---
            // Sort expenses by date (latest first)
            const sortedExpenses = [...expenses].sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

            const tableData = sortedExpenses.map(exp => {
                const dateObj = new Date(exp.date);
                const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

                const member = currentHouseData?.members?.find((m: HouseMember) => m.email === exp.userId);
                const fullName = member?.name || exp.userId.split('@')[0];
                const names = fullName.split(' ');
                const displayName = names.length >= 2 ? `${names[0]} ${names[1]}` : names[0];

                let userCellContent = '';
                const contribs = exp.contributors || [];

                if (contribs.length > 0) {
                    const shopperContrib = contribs.find(c => c.email === exp.userId);
                    const shopperAmount = shopperContrib ? shopperContrib.amount : 0;
                    userCellContent = `${displayName} ${getCurrencySymbol()}${shopperAmount.toFixed(2)}`;

                    const others = contribs.filter(c => c.email !== exp.userId);
                    if (others.length > 0) {
                        userCellContent += '\n------------------\n';
                        userCellContent += others.map(c => {
                            const otherMember = currentHouseData?.members?.find((m: HouseMember) => m.email === c.email);
                            const otherFullName = otherMember?.name || c.email.split('@')[0];
                            const otherNames = otherFullName.split(' ');
                            const otherDisplayName = otherNames.length >= 2 ? `${otherNames[0]} ${otherNames[1]}` : otherNames[0];
                            return `${otherDisplayName} ${getCurrencySymbol()}${c.amount.toFixed(2)}`;
                        }).join('\n');
                    }
                } else {
                    userCellContent = `${displayName} ${getCurrencySymbol()}${exp.amount.toFixed(2)}`;
                }

                return [
                    dateStr,
                    exp.description,
                    {
                        content: userCellContent,
                        styles: { fontSize: 7, valign: 'middle' as const, halign: 'left' as const }
                    },
                    `${getCurrencySymbol()}${exp.amount.toFixed(2)}`
                ];
            });

            // Calculate Total
            const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            tableData.push(['', '', 'Total', `${getCurrencySymbol()}${total.toFixed(2)}`]);

            autoTable(doc, {
                head: [['Date', 'Description', 'User', 'Amount']],
                body: tableData,
                startY: titleY + 5,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 3, valign: 'middle' },
                headStyles: { fillColor: [50, 50, 50] },
                columnStyles: {
                    0: { cellWidth: 22 }, // Date
                    1: { cellWidth: 'auto' }, // Desc
                    2: { cellWidth: 40 }, // User
                    3: { cellWidth: 18, halign: 'right' } // Amount
                }
            });

            // --- SETTLEMENT SECTION ---
            const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

            // Function to draw settlement line
            const drawSettlementLine = (settlement: { debtorName: string; creditorName: string; amountStr: string }, yPosition: number) => {
                let currentX = 14;
                doc.setFont('helvetica', 'bold');
                doc.text(settlement.debtorName, currentX, yPosition);
                currentX += doc.getTextWidth(settlement.debtorName) + 1;

                doc.setFont('helvetica', 'normal');
                doc.text("pays", currentX, yPosition);
                currentX += doc.getTextWidth("pays") + 1;

                doc.setFont('helvetica', 'bold');
                doc.text(settlement.creditorName + ":", currentX, yPosition);
                currentX += doc.getTextWidth(settlement.creditorName + ":") + 1;

                doc.setFont('helvetica', 'normal');
                doc.text(settlement.amountStr, currentX, yPosition);
            };

            // Check if we need a new page
            if (finalY > doc.internal.pageSize.height - 40) {
                doc.addPage();
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Settlement Plan", 14, 20);
                let currentY = 30;
                doc.setFontSize(10);
                if (settlements.length === 0) {
                    doc.setFont('helvetica', 'normal');
                    doc.text(activeMemberCount === 0 ? "No members to split expenses." : (allExpenses.length > 0 ? "All settled! Everyone paid their share." : ""), 14, currentY);
                } else {
                    settlements.forEach(settlement => {
                        drawSettlementLine(settlement, currentY);
                        currentY += 6;
                    });
                }
            } else {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Settlement Plan", 14, finalY);

                doc.setFontSize(10);
                let currentY = finalY + 8;
                if (settlements.length === 0) {
                    doc.setFont('helvetica', 'normal');
                    doc.text(activeMemberCount === 0 ? "No members to split expenses." : (allExpenses.length > 0 ? "All settled! Everyone paid their share." : ""), 14, currentY);
                } else {
                    settlements.forEach(settlement => {
                        drawSettlementLine(settlement, currentY);
                        currentY += 6;
                    });
                }
            }

            // --- FOOTER ---
            const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                const footerY = doc.internal.pageSize.height - 10;

                const footerText = 'OurTab';
                const logoDim = 6;
                // Draw Brand Logo (Centered relative to text)
                const textWidth = doc.getTextWidth(footerText);
                const totalWidth = logoDim + 2 + textWidth; // 2 is padding between logo and text
                const startX = (pageWidth - totalWidth) / 2;

                if (logoDataUrl) {
                    try {
                        doc.addImage(logoDataUrl, 'PNG', startX, footerY - 5, logoDim, logoDim);
                    } catch (e) {
                        console.warn('Failed to add logo to PDF', e);
                    }
                }

                // Brand Name (on same line as logo)
                doc.setFontSize(10);
                doc.setFont('times', 'bold');
                doc.text(footerText, startX + logoDim + 2, footerY);

                // Page Number (Right aligned)
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                const pageString = `Page ${i} of ${pageCount}`;
                doc.text(pageString, pageWidth - 14, footerY, { align: 'right' });
            }

            console.log('Saving PDF...');

            const monthName = month.split(' ')[0];
            const year = month.split(' ')[1];
            const day = String(today.getDate()).padStart(2, '0');
            const fileName = `${monthName}_${year}_${day}_Expenses.pdf`;

            doc.save(fileName);

            showToast('PDF downloaded successfully!', 'success');
        } catch (error) {
            console.error("PDF generation failed:", error);
            showToast('Failed to generate PDF. Check console for details.', 'error');
        }
    };

    return (
        <AuthGuard>
            <main>
                <Navbar actions={
                    <IconButton
                        color="primary"
                        onClick={handleOpenHistory}
                        sx={{
                            bgcolor: 'background.paper',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.1)' },
                            width: 40,
                            height: 40
                        }}
                    >
                        <HistoryIcon />
                    </IconButton>
                } />
                <Container maxWidth="sm" sx={{ mt: 4, mb: 10 }}>
                    <Typography variant="h4" component="h1" gutterBottom>
                        Shopping List
                    </Typography>


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
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setItemName(value ? value.charAt(0).toUpperCase() + value.slice(1) : '');
                                }}
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
                                                secondary={`${getCurrencySymbol()}${Number(item.price).toFixed(2)}`}
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
                                    {getCurrencySymbol()}{Number(total).toFixed(2)}
                                </Typography>
                            </Box>
                        </Paper>
                    )}

                    {/* Contributor Selection */}
                    {items.length > 0 && houseMembers.length > 1 && (
                        <Paper className="glass" sx={{ p: 3, mb: 3, background: 'transparent', boxShadow: 'none' }}>
                            <Accordion defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PeopleIcon color="primary" />
                                        <Typography variant="h6">Who&apos;s Contributing?</Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Select house members who are contributing money for this purchase
                                        </Typography>

                                        {/* House Members */}
                                        {houseMembers
                                            .filter(member => member.email !== user?.email)
                                            .map((member) => (
                                                <Box key={member.email} sx={{ mb: 2 }}>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={selectedContributors.has(member.email)}
                                                                onChange={() => handleContributorToggle(member.email)}
                                                                disabled={loading}
                                                            />
                                                        }
                                                        label={member.name || member.email.split('@')[0]}
                                                    />
                                                    {selectedContributors.has(member.email) && (
                                                        <Box sx={{ pl: 4, pr: 0, mt: 1 }}>
                                                            <TextField
                                                                label={`Amount (${getCurrencySymbol()})`}
                                                                type="number"
                                                                size="small"
                                                                fullWidth
                                                                value={contributors[member.email] || ''}
                                                                onChange={(e) => handleContributorAmountChange(member.email, e.target.value)}
                                                                disabled={loading}
                                                                inputProps={{ step: '0.01', min: '0' }}
                                                            />
                                                        </Box>
                                                    )}
                                                </Box>
                                            ))}

                                        {/* My Contribution */}
                                        <Divider sx={{ my: 2 }} />
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Your contribution:
                                            </Typography>
                                            <TextField
                                                label={`My Amount (${getCurrencySymbol()})`}
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={myContribution}
                                                onChange={(e) => setMyContribution(e.target.value)}
                                                disabled={loading}
                                                inputProps={{ step: '0.01', min: '0' }}
                                            />
                                        </Box>

                                        {/* Quick Actions */}
                                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={handleSplitEqually}
                                                disabled={loading || selectedContributors.size === 0}
                                            >
                                                Split Equally
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={handleIPayAll}
                                                disabled={loading}
                                            >
                                                I&apos;ll Pay All
                                            </Button>
                                        </Box>

                                        {/* Summary */}
                                        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Total:</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {getCurrencySymbol()}{Number(total).toFixed(2)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Others&apos; contributions:</Typography>
                                                <Typography variant="body2">
                                                    {getCurrencySymbol()}{Number(totalContributions).toFixed(2)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Your contribution:</Typography>
                                                <Typography variant="body2">
                                                    {getCurrencySymbol()}{Number(myContributionNum).toFixed(2)}
                                                </Typography>
                                            </Box>
                                            <Divider sx={{ my: 1 }} />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {remaining >= 0 ? 'Remaining:' : 'Over by:'}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight="bold"
                                                    color={remaining < -0.01 ? 'error' : remaining > 0.01 ? 'warning.main' : 'success.main'}
                                                >
                                                    {getCurrencySymbol()}{Number(Math.abs(remaining)).toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {remaining > 0.01 && (
                                            <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                                                ℹ️ You&apos;ll cover the remaining amount
                                            </Typography>
                                        )}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
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
                                        secondary={`Total: ${getCurrencySymbol()}${monthlyExpenses[month].filter((e: Expense) => !e.isSettlementPayment).reduce((sum, e: Expense) => sum + e.amount, 0).toFixed(2)}`}
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
        </AuthGuard>
    );
}

