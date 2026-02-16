'use client';
import { useState, useEffect } from 'react';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import { useRouter, usePathname } from 'next/navigation';

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const [value, setValue] = useState(pathname);

    useEffect(() => {
        setValue(pathname);
    }, [pathname]);

    return (
        <Paper className="glass-bottom-nav" sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'transparent' }} elevation={3}>
            <BottomNavigation
                showLabels
                value={value}
                onChange={(event, newValue) => {
                    setValue(newValue);
                    router.push(newValue);
                }}
                sx={{ background: 'transparent' }}
            >
                <BottomNavigationAction label="Dashboard" value="/dashboard" icon={<HomeIcon />} />
                <BottomNavigationAction label="Shopping" value="/shopping" icon={<ShoppingCartIcon />} />
                <BottomNavigationAction label="Profile" value="/profile" icon={<PersonIcon />} />
            </BottomNavigation>
        </Paper>
    );
}
