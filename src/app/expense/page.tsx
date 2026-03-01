'use client';

import Container from '@mui/material/Container';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
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
import { calculateMemberFundAccounting } from '@/utils/accounting';
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
    category?: string;
    contributors?: Array<{ email: string; amount: number }>;
    isSettlementPayment?: boolean;
    settlementBetween?: string[];
}

interface HouseMember {
    email: string;
    name?: string;
    photoUrl?: string;
    role?: 'manager' | 'member';
    rentAmount?: number;
}


export default function ExpensePage() {
    const { user, currency, dbUser, house } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    // Item list state
    const [items, setItems] = useState<GroceryItem[]>([]);

    // Current item being added
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');

    // Optional note for this expense
    const [note, setNote] = useState('');

    const [loading, setLoading] = useState(false);
    const [fundDeposits, setFundDeposits] = useState<any[]>([]);
    const [meals, setMeals] = useState<any[]>([]);
    const [expenseCategory, setExpenseCategory] = useState<string>('groceries');

    // House Members state from useHouseData hooked house members directly
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
                    category: house?.typeOfHouse === 'meals_and_expenses' ? expenseCategory : 'groceries',
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

            showToast('Expense submitted successfully!', 'success');
            setItems([]);
            setNote('');

            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);
        } catch (err) {
            console.error('Error adding expense:', err);
            showToast('Failed to submit expense. Please try again.', 'error');
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

                if (house.typeOfHouse === 'meals_and_expenses') {
                    const [depositsRes, mealsRes] = await Promise.all([
                        fetch(`/api/fund-deposits?houseId=${house.id}`),
                        fetch(`/api/meals?houseId=${house.id}`)
                    ]);
                    const [depositsData, mealsData] = await Promise.all([
                        depositsRes.json(),
                        mealsRes.json()
                    ]);
                    setFundDeposits(depositsData || []);
                    setMeals(mealsData || []);
                }

                const grouped: { [key: string]: Expense[] } = {};
                expensesData.forEach((exp: Expense) => {
                    const date = new Date(exp.date);
                    const monthKey = date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
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

            const memberBalances: { [email: string]: number } = {};
            const members = currentHouseData?.members || [];

            const totalGroupExpense = expenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
            void totalGroupExpense;

            // --- SETTLEMENT LOGIC --- (Follows Dashboard logic using allExpenses)
            if (currentHouseData?.typeOfHouse !== 'meals_and_expenses') {
                members.forEach((m: HouseMember) => { memberBalances[m.email] = 0; });
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
            }
            else {
                // Determine the month matching exactly the pdf bounds
                const mealsRes = await fetch(`/api/meals?houseId=${currentHouseData.id}`);
                const mealsList = await mealsRes.json();

                const fundsRes = await fetch(`/api/fund-deposits?houseId=${currentHouseData.id}`);
                const fundsList = await fundsRes.json();

                const getYYYYMM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                // 'month' is formatted as "October 2025", so we parse it:
                const parsedDate = new Date(`${month} 1`);
                const targetMonth = getYYYYMM(parsedDate);

                const months = new Set<string>();
                allExpenses.forEach((e: Expense) => months.add(getYYYYMM(new Date(e.date))));

                if (Array.isArray(fundsList)) {
                    fundsList.filter((d: any) => d.status === 'approved').forEach((d: any) => {
                        months.add(getYYYYMM(new Date(d.createdAt)));
                    });
                }
                if (Array.isArray(mealsList)) {
                    mealsList.forEach((m: any) => months.add(m.date.substring(0, 7)));
                }

                months.add(targetMonth);
                const sortedMonths = Array.from(months).sort();

                members.forEach((m: HouseMember) => {
                    memberBalances[m.email] = 0;
                });

                for (const monthStr of sortedMonths) {
                    if (monthStr > targetMonth) break;

                    const mealsPerDay = currentHouseData.mealsPerDay || 3;
                    let monthlyMealsConsumed = 0;
                    const monthlyMemberMeals: { [key: string]: number } = {};
                    members.forEach((m: HouseMember) => monthlyMemberMeals[m.email] = 0);

                    if (Array.isArray(mealsList) && mealsList.length > 0) {
                        mealsList.filter((m: any) => m.date.startsWith(monthStr)).forEach((dayRecord: any) => {
                            members.forEach((m: HouseMember) => {
                                const mMeals = dayRecord.meals?.[m.email] || {};
                                if (mealsPerDay === 3 && (mMeals.breakfast ?? true)) monthlyMemberMeals[m.email]++;
                                if (mMeals.lunch ?? true) monthlyMemberMeals[m.email]++;
                                if (mMeals.dinner ?? true) monthlyMemberMeals[m.email]++;
                            });
                        });
                    }

                    monthlyMealsConsumed = Object.values(monthlyMemberMeals).reduce((sum, count) => sum + count, 0);

                    if (Array.isArray(fundsList)) {
                        fundsList
                            .filter((d: any) => d.status === 'approved' && getYYYYMM(new Date(d.createdAt)) === monthStr)
                            .forEach((d: any) => {
                                if (memberBalances[d.email] !== undefined) memberBalances[d.email] += d.amount;
                            });
                    }

                    members.forEach((m: HouseMember) => {
                        const rent = m.rentAmount || 0;
                        memberBalances[m.email] -= rent;
                    });

                    let monthlyGroceries = 0;
                    let monthlyOther = 0;

                    allExpenses
                        .filter((e: Expense) => getYYYYMM(new Date(e.date)) === monthStr)
                        .forEach((exp: Expense) => {
                            if (exp.isSettlementPayment && exp.settlementBetween && exp.settlementBetween.length === 2) {
                                const [payer, receiver] = [exp.userId, exp.settlementBetween.find(e => e !== exp.userId)!];
                                if (memberBalances[payer] !== undefined) memberBalances[payer] += exp.amount;
                                else memberBalances[payer] = exp.amount;
                                if (memberBalances[receiver] !== undefined) memberBalances[receiver] -= exp.amount;
                                else memberBalances[receiver] = -exp.amount;
                                return;
                            }

                            if (exp.category === 'groceries' || !exp.category) {
                                monthlyGroceries += exp.amount;
                            } else {
                                monthlyOther += exp.amount;
                            }
                        });

                    const otherSharePerPerson = members.length > 0 ? (monthlyOther / members.length) : 0;
                    const mealUnitPrice = monthlyMealsConsumed > 0 ? (monthlyGroceries / monthlyMealsConsumed) : 0;

                    members.forEach((m: HouseMember) => {
                        memberBalances[m.email] -= otherSharePerPerson;
                        const memberGroceryCost = monthlyMemberMeals[m.email] * mealUnitPrice;
                        memberBalances[m.email] -= memberGroceryCost;
                    });
                }
            }

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
                        amountStr: `${amount.toFixed(2)}`
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

            // Subtitle: House Type
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            const houseTypeStr = currentHouseData?.typeOfHouse === 'meals_and_expenses'
                ? 'Meals and Expenses Tracking'
                : 'Shared Expenses Tracking';
            doc.text(houseTypeStr, pageWidth / 2, 26, { align: 'center' });

            //house currency
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Currency: ${currentHouseData?.currency}`, pageWidth / 2, 32, { align: 'center' });

            // Right: Generation Info
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const rightX = pageWidth - 14;
            doc.text(`Generated by: ${user?.displayName || user?.email?.split('@')[0]}`, rightX, 30, { align: 'right' });

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
                const isMealsHouse = currentHouseData?.typeOfHouse === 'meals_and_expenses';

                if (contribs.length > 0) {
                    const shopperContrib = contribs.find(c => c.email === exp.userId);
                    const shopperAmount = shopperContrib ? shopperContrib.amount : 0;
                    userCellContent = isMealsHouse ? displayName : `${displayName} ${shopperAmount.toFixed(2)}`;

                    const others = contribs.filter(c => c.email !== exp.userId);
                    if (others.length > 0) {
                        userCellContent += isMealsHouse ? '' : '\n------------------\n';
                        userCellContent += others.map(c => {
                            const otherMember = currentHouseData?.members?.find((m: HouseMember) => m.email === c.email);
                            const otherFullName = otherMember?.name || c.email.split('@')[0];
                            const otherNames = otherFullName.split(' ');
                            const otherDisplayName = otherNames.length >= 2 ? `${otherNames[0]} ${otherNames[1]}` : otherNames[0];
                            return isMealsHouse ? `, ${otherDisplayName}` : `${otherDisplayName} ${c.amount.toFixed(2)}`;
                        }).join(isMealsHouse ? '' : '\n');
                    }
                } else {
                    userCellContent = isMealsHouse ? displayName : `${displayName} ${exp.amount.toFixed(2)}`;
                }

                return [
                    dateStr,
                    exp.description.replace(/[৳৳৳৳]/g, '').split(' Tk')[0].split(' ó')[0].trim(),
                    {
                        content: userCellContent,
                        styles: { fontSize: 7, valign: 'middle' as const, halign: 'left' as const }
                    },
                    `${exp.amount.toFixed(2)}`
                ];
            });

            // Calculate Total
            const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            tableData.push(['', '', 'Total', `${total.toFixed(2)}`]);

            autoTable(doc, {
                head: [['Date', 'Description', 'Spender', 'Amount']],
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

            // --- HOUSE FUND - MEMBER BREAKDOWN SECTION (For Meals and Expenses Houses) ---
            if (currentHouseData?.typeOfHouse === 'meals_and_expenses') {
                const getYYYYMM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const parsedDate = new Date(`${month} 1`);
                const targetMonth = getYYYYMM(parsedDate);

                const accountingResult = calculateMemberFundAccounting(currentHouseData, allExpenses, fundDeposits, meals, targetMonth);
                const accounting = accountingResult.members;
                const summary = accountingResult.summary;
                const finalY = (doc as any).lastAutoTable?.finalY || titleY + 20;

                doc.addPage();
                doc.setFontSize(16);
                doc.setFont('abril', 'bold');
                doc.text("House Fund — Member Breakdown", pageWidth / 2, 20, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Report Period: ${month}`, pageWidth / 2, 28, { align: 'center' });

                const fundTableData: any[] = [];
                currentHouseData.members?.forEach((m: HouseMember) => {
                    const stats = accounting[m.email];
                    if (stats) {
                        const netBalance = stats.deposits - (stats.rent + stats.utilities + stats.wage + stats.mealCost);
                        fundTableData.push([
                            m.name || m.email.split('@')[0],
                            `${stats.deposits.toFixed(2)}`,
                            `- ${stats.rent.toFixed(2)}`,
                            `- ${stats.utilities.toFixed(2)}`,
                            `- ${stats.wage.toFixed(2)}`,
                            {
                                content: `(${stats.periodicMealCount}) - ${stats.periodicMealCost.toFixed(2)}`,
                                styles: { halign: 'right' }
                            },
                            {
                                content: `${netBalance.toFixed(2)}`,
                                styles: { fontStyle: 'bold', textColor: netBalance >= 0 ? [0, 100, 0] : [150, 0, 0] }
                            }
                        ]);
                    }
                });

                autoTable(doc, {
                    head: [['Member', 'Deposits', 'Rent', 'Utils', 'Wage', 'Meals Count: Cost', 'Balance']],
                    body: fundTableData,
                    startY: 35,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
                    headStyles: { fillColor: [76, 175, 80] }, // Greenish header
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 'auto' },
                        1: { halign: 'right', cellWidth: 20 },
                        2: { halign: 'right', cellWidth: 20 },
                        3: { halign: 'right', cellWidth: 20 },
                        4: { halign: 'right', cellWidth: 20 },
                        5: { halign: 'right', cellWidth: 25 },
                        6: { halign: 'right', cellWidth: 20 }
                    }
                });

                const tableFinalY = (doc as any).lastAutoTable?.finalY + 15;

                // House Totals Summary Section in PDF
                doc.setFontSize(14);
                doc.setFont('abril', 'bold');
                doc.text("House Totals Summary", 14, tableFinalY);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                let summaryY = tableFinalY + 8;

                const summaryItems = [
                    { label: "Previous Months Remaining", value: `${summary.previousMonthsRemaining.toFixed(2)}`, color: summary.previousMonthsRemaining >= 0 ? [0, 100, 0] : [150, 0, 0] },
                    { label: "Total Fund Collected", value: `${summary.totalDeposits.toFixed(2)}`, color: [0, 100, 0] },
                    { label: "Total Rent Deducted", value: `- ${summary.totalRent.toFixed(2)}`, color: [150, 0, 0] },
                    { label: "Total Utilities", value: `- ${summary.totalUtilities.toFixed(2)}`, color: [150, 0, 0] },
                    { label: "Total Worker Wage", value: `- ${summary.totalWages.toFixed(2)}`, color: [150, 0, 0] },
                    { label: "Total Grocery Cost", value: `- ${summary.totalGroceries.toFixed(2)}`, color: [150, 0, 0] },
                    { label: "Meals in this Month", value: `${summary.periodicTotalMeals}`, color: [0, 0, 0] },
                    { label: "Cost per Meal", value: `${summary.periodicCostPerMeal.toFixed(2)}`, color: [0, 0, 150] },
                ];

                summaryItems.forEach(item => {
                    doc.setTextColor(0, 0, 0);
                    doc.text(item.label, 14, summaryY);
                    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
                    doc.text(String(item.value), pageWidth - 14, summaryY, { align: 'right' });
                    summaryY += 6;
                });

                doc.setDrawColor(200, 200, 200);
                doc.line(14, summaryY + 2, pageWidth - 14, summaryY + 2);
                summaryY += 10;

                doc.setFontSize(12);
                doc.setFont('abril', 'bold');
                doc.setTextColor(0, 100, 0);
                doc.text("Remaining House Fund", 14, summaryY);
                doc.text(`${summary.remainingFund.toFixed(2)}`, pageWidth - 14, summaryY, { align: 'right' });
            }

            // --- SETTLEMENT SECTION (For Standard Shared Houses) ---
            if (currentHouseData?.typeOfHouse !== 'meals_and_expenses') {
                const finalY = (doc as any).lastAutoTable?.finalY + 15;

                doc.setFontSize(14);
                doc.setFont('abril', 'bold');
                doc.text("Settlement Plan", 14, finalY);

                if (settlements.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    let settleY = finalY + 8;

                    settlements.forEach((s) => {
                        const text = `${s.creditorName} will get ${currentHouseData?.currency} ${s.amountStr} from ${s.debtorName}`;
                        doc.text(text, 14, settleY);
                        settleY += 6;
                    });
                } else {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.text("All settled! Everyone paid their share.", 14, finalY + 8);
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
                <Container maxWidth="sm" sx={{ mt: 4, mb: 10 }}>
                    <Box className="glass-nav" sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1100,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 2,
                        mb: 0.1,
                        mx: { xs: -2, sm: -3 },
                        px: { xs: 2, sm: 3 },
                        backgroundColor: 'transparent !important', // Let glass-nav handle it
                    }}>
                        <Typography variant="h4" component="h1" sx={{
                            fontWeight: 800,
                            backdropFilter: 'blur(20px)',
                            borderRadius: '12px',
                            padding: "4px",
                            background: 'linear-gradient(45deg, #6C63FF 30%, #FF6584 90%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            lineHeight: 1.2,
                            letterSpacing: '-0.02em'
                        }}>
                            Expense
                        </Typography>
                        <IconButton
                            color="primary"
                            onClick={handleOpenHistory}
                            sx={{
                                bgcolor: 'background.paper',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.1)' },
                                width: 44,
                                height: 44
                            }}
                        >
                            <HistoryIcon />
                        </IconButton>
                    </Box>


                    {/* Add Item Form */}
                    <Paper className="glass" sx={{ p: 2, mb: 2, background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Box component="form" onSubmit={handleAddItem}>
                            {house?.typeOfHouse === 'meals_and_expenses' && (
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <InputLabel id="category-label">Category</InputLabel>
                                    <Select
                                        labelId="category-label"
                                        value={expenseCategory}
                                        label="Category"
                                        onChange={(e) => setExpenseCategory(e.target.value)}
                                        disabled={loading}
                                    >
                                        <MenuItem value="groceries">Groceries</MenuItem>
                                        <MenuItem value="utilities">Utilities</MenuItem>
                                        <MenuItem value="wage">Wage</MenuItem>
                                        <MenuItem value="other">Other</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                <TextField
                                    label="Item Name"
                                    required
                                    size="small"
                                    value={itemName}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setItemName(value ? value.charAt(0).toUpperCase() + value.slice(1) : '');
                                    }}
                                    disabled={loading}
                                    placeholder="Milk, Bread..."
                                    sx={{ flexGrow: 2 }}
                                />
                                <TextField
                                    label={`Price (${getCurrencySymbol()})`}
                                    type="number"
                                    required
                                    size="small"
                                    value={itemPrice}
                                    onChange={(e) => setItemPrice(e.target.value)}
                                    disabled={loading}
                                    inputProps={{ step: '0.01', min: '0' }}
                                    sx={{ width: '100px' }}
                                />
                            </Box>
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                disabled={loading}
                            >
                                Add to List
                            </Button>
                        </Box>
                    </Paper>

                    {/* Items List */}
                    {items.length > 0 && (
                        <Paper className="glass" sx={{ p: 2, mb: 2, background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold">Cart ({items.length})</Typography>
                                <Typography variant="subtitle1" color="primary" fontWeight="bold">
                                    {getCurrencySymbol()}{Number(total).toFixed(2)}
                                </Typography>
                            </Box>
                            <List disablePadding>
                                {items.map((item, index) => (
                                    <div key={item.id}>
                                        <ListItem
                                            disableGutters
                                            sx={{ py: 0.5 }}
                                            secondaryAction={
                                                <IconButton edge="end" size="small" onClick={() => handleRemoveItem(item.id)} disabled={loading} color="error">
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={<Typography variant="body2" fontWeight="medium">{item.name}</Typography>}
                                                secondary={<Typography variant="caption" color="text.secondary">{getCurrencySymbol()}{Number(item.price).toFixed(2)}</Typography>}
                                            />
                                        </ListItem>
                                        {index < items.length - 1 && <Divider component="li" />}
                                    </div>
                                ))}
                            </List>
                        </Paper>
                    )}

                    {/* Contributor Selection */}
                    {items.length > 0 && houseMembers.length > 1 && house?.typeOfHouse !== 'meals_and_expenses' && (
                        <Paper className="glass" sx={{ mb: 2, background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            <Accordion defaultExpanded sx={{ background: 'transparent', boxShadow: 'none', '&:before': { display: 'none' } }}>
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
                        <Paper className="glass" sx={{ p: 2, background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <TextField
                                    label="Note (Optional)"
                                    fullWidth
                                    size="small"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    disabled={loading}
                                    placeholder="e.g., Weekly groceries"
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="success"
                                    fullWidth
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Submitting...' : 'Complete Purchase'}
                                </Button>
                            </Box>
                        </Paper>
                    )}

                    {items.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="text.secondary">
                                Add items to your expense to get started
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

