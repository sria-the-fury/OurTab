'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import { useAuth } from '@/components/AuthContext';
import { useHouseData } from '@/hooks/useHouseData';
import Loader from '@/components/Loader';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useToast } from '@/components/ToastContext';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import Avatar from '@mui/material/Avatar';
import LightModeIcon from '@mui/icons-material/LightMode';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

export default function MealsPage() {
    const { user, loading: authLoading } = useAuth();
    const { house, meals, loading: dataLoading, mutateMeals } = useHouseData();
    const { showToast } = useToast();

    const [selectedDate, setSelectedDate] = useState(new Date());

    const loading = authLoading || (!!user && dataLoading);

    // Filter meals for the selected month
    const currentMonthMeals = useMemo(() => {
        return meals.filter(m => {
            const mDate = new Date(m.date);
            return mDate.getMonth() === selectedDate.getMonth() && mDate.getFullYear() === selectedDate.getFullYear();
        });
    }, [meals, selectedDate]);

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

    const handleMealToggle = async (dateStr: string, email: string, mealType: 'breakfast' | 'lunch' | 'dinner', currentStatus: boolean) => {
        if (!house?.id) return;

        // Optimistic update logic could be added here, but SWR mutate will handle state update soon after

        try {
            const res = await fetch('/api/meals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    houseId: house.id,
                    date: dateStr,
                    email,
                    mealType,
                    isTaking: !currentStatus
                })
            });

            if (res.ok) {
                mutateMeals();
            } else {
                showToast('Failed to update meal status', 'error');
            }
        } catch (error) {
            console.error('Error toggling meal', error);
            showToast('Error updating meal status', 'error');
        }
    };

    if (loading) return <Loader />;

    if (!house || house.typeOfHouse !== 'meals_and_expenses') {
        return (
            <AuthGuard>
                <Navbar />
                <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 10 }}>
                    <RestaurantMenuIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h5" color="text.secondary">Meal tracking is not enabled for this house.</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>Change house settings in Profile to use this feature.</Typography>
                </Container>
                <BottomNav />
            </AuthGuard>
        );
    }

    const { mealsPerDay = 3, members = [] } = house;

    const houseCreatedAt = house.createdAt ? new Date(house.createdAt) : null;
    const houseCreationDateOnly = houseCreatedAt
        ? new Date(houseCreatedAt.getFullYear(), houseCreatedAt.getMonth(), houseCreatedAt.getDate())
        : null;

    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const days: string[] = [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);

        // Skip dates before house creation
        if (houseCreationDateOnly && date < houseCreationDateOnly) {
            continue;
        }

        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // Filter out future dates: only show past and current dates
        if (dateStr > todayStr) {
            break; // Stop adding days if we've reached a future date
        }
        days.push(dateStr);
    }

    return (
        <AuthGuard>
            <main>
                <Navbar />
                <Container maxWidth="lg" sx={{ mt: 4, pb: 10 }}>
                    {/* Header Section */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        mb: 4,
                        gap: 2
                    }}>
                        <Box>
                            <Typography variant="h3" component="h1" sx={{
                                fontWeight: 800,
                                background: 'linear-gradient(45deg, #6C63FF 30%, #FF6584 90%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 0.5,
                                letterSpacing: '-0.02em'
                            }}>
                                Meal Tracking
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.8, fontWeight: 500 }}>
                                View and monitor household meal consumption
                            </Typography>
                        </Box>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            bgcolor: 'rgba(108, 99, 255, 0.08)',
                            px: 2,
                            py: 1,
                            borderRadius: 3,
                            border: '1px solid rgba(108, 99, 255, 0.2)'
                        }}>
                            <RestaurantMenuIcon sx={{ color: 'primary.main' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {house.name}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Month Navigator - Premium Glass Style */}
                    <Paper className="glass" sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 4,
                        p: 1.5,
                        borderRadius: 4,
                        maxWidth: 400,
                        mx: 'auto',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                    }}>
                        <IconButton
                            onClick={handlePreviousMonth}
                            disabled={
                                !!houseCreatedAt &&
                                (selectedDate.getFullYear() < houseCreatedAt.getFullYear() ||
                                    (selectedDate.getFullYear() === houseCreatedAt.getFullYear() && selectedDate.getMonth() <= houseCreatedAt.getMonth()))
                            }
                            sx={{
                                color: 'primary.main',
                                bgcolor: 'rgba(108, 99, 255, 0.05)',
                                '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.1)' }
                            }}
                        >
                            <KeyboardArrowLeftIcon />
                        </IconButton>

                        <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarMonthIcon sx={{ color: 'primary.main', opacity: 0.7 }} fontSize="small" />
                            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '0.01em', minWidth: 160, textAlign: 'center' }}>
                                {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </Typography>
                        </Stack>

                        <IconButton
                            onClick={handleNextMonth}
                            disabled={selectedDate.getFullYear() > new Date().getFullYear() || (selectedDate.getFullYear() === new Date().getFullYear() && selectedDate.getMonth() >= new Date().getMonth())}
                            sx={{
                                color: 'primary.main',
                                bgcolor: 'rgba(108, 99, 255, 0.05)',
                                '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.1)' }
                            }}
                        >
                            <KeyboardArrowRightIcon />
                        </IconButton>
                    </Paper>

                    {/* Desktop View: Modern Grid */}
                    <Paper className="glass" sx={{
                        p: 3,
                        borderRadius: 4,
                        overflow: 'hidden',
                        background: 'rgba(255, 255, 255, 0.02)',
                        display: { xs: 'none', md: 'block' },
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: `120px repeat(${members.length}, 1fr)`, gap: 2, mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', opacity: 0.6, pl: 1 }}>DATE</Typography>
                            {members.map(member => (
                                <Box key={member.email} sx={{ textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                                        <Avatar src={member.photoUrl} sx={{ width: 36, height: 36, mb: 1, border: '2px solid rgba(108, 99, 255, 0.3)' }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, maxWidth: 120 }} noWrap>
                                            {member.name || member.email.split('@')[0]}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={2} justifyContent="center" sx={{ opacity: 0.5 }}>
                                        <Tooltip title="Breakfast"><LightModeIcon sx={{ fontSize: 16 }} /></Tooltip>
                                        <Tooltip title="Lunch"><WbSunnyIcon sx={{ fontSize: 16 }} /></Tooltip>
                                        <Tooltip title="Dinner"><BedtimeIcon sx={{ fontSize: 16 }} /></Tooltip>
                                    </Stack>
                                </Box>
                            ))}
                        </Box>

                        <Divider sx={{ mb: 2, opacity: 0.1 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {days.map(dateStr => {
                                const dateObj = new Date(dateStr);
                                const isToday = dateStr === todayStr;
                                const dayRecord = currentMonthMeals.find(m => m.date === dateStr);

                                return (
                                    <Box key={dateStr} sx={{
                                        display: 'grid',
                                        gridTemplateColumns: `120px repeat(${members.length}, 1fr)`,
                                        gap: 2,
                                        alignItems: 'center',
                                        p: 1.5,
                                        borderRadius: 3,
                                        transition: 'all 0.2s ease',
                                        bgcolor: isToday ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                                        border: isToday ? '1px solid rgba(108, 99, 255, 0.2)' : '1px solid transparent',
                                        '&:hover': {
                                            bgcolor: isToday ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)'
                                        }
                                    }}>
                                        <Box sx={{ pl: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: isToday ? 800 : 600, color: isToday ? 'primary.main' : 'text.primary' }}>
                                                {dateObj.getDate()} {dateObj.toLocaleString('default', { weekday: 'short' })}
                                            </Typography>
                                            {isToday && <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'block', mt: -0.5 }}>TODAY</Typography>}
                                        </Box>

                                        {members.map(member => {
                                            const memberMeals = dayRecord?.meals?.[member.email] || {};
                                            const b = memberMeals.breakfast ?? true;
                                            const l = memberMeals.lunch ?? true;
                                            const d = memberMeals.dinner ?? true;

                                            const StatusChip = ({ active, icon: Icon }: { active: boolean, icon: any }) => (
                                                <Box sx={{
                                                    width: 30,
                                                    height: 30,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    bgcolor: active ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                    color: active ? '#4caf50' : 'rgba(255, 255, 255, 0.2)',
                                                    border: active ? '1.5px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    cursor: 'default'
                                                }}>
                                                    <Icon sx={{ fontSize: 16 }} />
                                                </Box>
                                            );

                                            return (
                                                <Stack key={`${dateStr}-${member.email}`} direction="row" spacing={2} justifyContent="center">
                                                    {mealsPerDay === 3 && <StatusChip active={b} icon={LightModeIcon} />}
                                                    <StatusChip active={l} icon={WbSunnyIcon} />
                                                    <StatusChip active={d} icon={BedtimeIcon} />
                                                </Stack>
                                            );
                                        })}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Paper>

                    {/* Mobile View: High-End Cards */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2.5 }}>
                        {days.map(dateStr => {
                            const dateObj = new Date(dateStr);
                            const isToday = dateStr === todayStr;
                            const dayRecord = currentMonthMeals.find(m => m.date === dateStr);

                            return (
                                <Paper key={`mobile-${dateStr}`} className="glass" sx={{
                                    p: 2.5,
                                    borderRadius: 4,
                                    background: isToday ? 'rgba(108, 99, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                    border: isToday ? '1.2px solid rgba(108, 99, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: isToday ? '0 8px 24px rgba(108, 99, 255, 0.1)' : 'none'
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isToday ? 'primary.main' : 'text.primary' }}>
                                            {dateObj.getDate()} {dateObj.toLocaleString('default', { weekday: 'long' })}
                                        </Typography>
                                        {isToday && (
                                            <Chip
                                                label="TODAY"
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 900,
                                                    bgcolor: 'primary.main',
                                                    color: 'white'
                                                }}
                                            />
                                        )}
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {members.map(member => {
                                            const memberMeals = dayRecord?.meals?.[member.email] || {};
                                            const b = memberMeals.breakfast ?? true;
                                            const l = memberMeals.lunch ?? true;
                                            const d = memberMeals.dinner ?? true;

                                            const MobileStatusIcon = ({ active, icon: Icon }: { active: boolean, icon: any }) => (
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    px: 1.2,
                                                    py: 0.6,
                                                    borderRadius: 2,
                                                    bgcolor: active ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                                    color: active ? '#4caf50' : 'rgba(255, 255, 255, 0.2)',
                                                    border: active ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    <Icon sx={{ fontSize: 14 }} />
                                                </Box>
                                            );

                                            return (
                                                <Box key={member.email} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar src={member.photoUrl} sx={{ width: 32, height: 32, border: '1.5px solid rgba(255, 255, 255, 0.1)' }}>
                                                            {member.name ? member.name[0].toUpperCase() : member.email[0].toUpperCase()}
                                                        </Avatar>
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                            {member.name || member.email.split('@')[0]}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.8 }}>
                                                        {mealsPerDay === 3 && <MobileStatusIcon active={b} icon={LightModeIcon} />}
                                                        <MobileStatusIcon active={l} icon={WbSunnyIcon} />
                                                        <MobileStatusIcon active={d} icon={BedtimeIcon} />
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Box>

                    {/* Meal Summary Widget - Premium Stat Cards */}
                    <Box sx={{ mt: 8 }}>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Monthly Consumption</Typography>
                            <Divider sx={{ width: 60, height: 4, bgcolor: 'primary.main', borderRadius: 2, mb: 3 }} />
                        </Box>

                        <Grid container spacing={3}>
                            {members.map(member => {
                                let totalMealsConsumed = 0;
                                days.forEach(dateStr => {
                                    const dayRecord = currentMonthMeals.find(m => m.date === dateStr);
                                    const m = dayRecord?.meals?.[member.email] || {};
                                    if (mealsPerDay === 3 && (m.breakfast ?? true)) totalMealsConsumed++;
                                    if (m.lunch ?? true) totalMealsConsumed++;
                                    if (m.dinner ?? true) totalMealsConsumed++;
                                });

                                return (
                                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={`summary-${member.email}`} sx={{ display: 'flex' }}>
                                        <Paper className="glass" sx={{
                                            p: 3,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 2,
                                            borderRadius: 4,
                                            textAlign: 'center',
                                            width: '100%',
                                            height: '100%',
                                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                            }
                                        }}>
                                            <Avatar src={member.photoUrl} sx={{
                                                width: 70,
                                                height: 70,
                                                border: '3px solid',
                                                borderColor: 'rgba(108, 99, 255, 0.4)',
                                                bgcolor: 'background.paper',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }} />
                                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, lineHeight: 1.2 }}>
                                                    {member.name || member.email.split('@')[0]}
                                                </Typography>
                                                <Box sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    bgcolor: 'rgba(108, 99, 255, 0.1)',
                                                    px: 2,
                                                    py: 0.5,
                                                    borderRadius: 10,
                                                    width: 'fit-content',
                                                    mx: 'auto'
                                                }}>
                                                    <RestaurantMenuIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                                                        {totalMealsConsumed}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', opacity: 0.8 }}>
                                                        MEALS
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                </Container>
                <BottomNav />
            </main>
        </AuthGuard>
    );
}
