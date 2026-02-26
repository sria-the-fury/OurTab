'use client';
import { useEffect } from 'react';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { useHouseData } from '@/hooks/useHouseData';
import Avatar from '@mui/material/Avatar';

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const { house } = useHouseData();

    useEffect(() => {
        // Keep effect for any future pathname-based side effects
    }, [pathname]);

    return (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, pb: 'calc(env(safe-area-inset-bottom) + 8px)' }} elevation={3} className="glass-nav">
            <BottomNavigation
                showLabels
                value={pathname}
                onChange={(event, newValue) => {
                    router.push(newValue);
                }}
                sx={{
                    background: 'transparent',
                    '& .MuiBottomNavigationAction-root': {
                        minWidth: 'auto',
                        padding: '10px 0',

                    },
                    '& .Mui-selected': {
                        color: 'primary.main',
                    }
                }}
            >
                <BottomNavigationAction label="Dashboard" value="/dashboard" icon={<DashboardIcon />} />
                <BottomNavigationAction label="Buy List" value="/buy-list" icon={<FormatListBulletedIcon />} />
                {house?.typeOfHouse === 'meals_and_expenses' && (
                    <BottomNavigationAction label="Meals" value="/meals" icon={<RestaurantMenuIcon />} />
                )}
                <BottomNavigationAction label="Shopping" value="/shopping" icon={<ShoppingCartIcon />} />
                <BottomNavigationAction
                    label="Profile"
                    value="/profile"
                    icon={
                        user?.photoURL ? (
                            <Avatar src={user.photoURL} sx={{ width: 24, height: 24, mb: '2px' }} />
                        ) : (
                            <PersonIcon />
                        )
                    }
                />
            </BottomNavigation>
        </Paper>
    );
}
