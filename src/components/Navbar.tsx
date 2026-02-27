'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LogoutIcon from '@mui/icons-material/Logout';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { usePathname } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';

interface NavbarProps {
    actions?: React.ReactNode;
}

export default function Navbar({ actions }: NavbarProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const isProfilePage = pathname === '/profile';
    const isDashboardPage = pathname === '/dashboard';

    return (
        <Box sx={{ flexGrow: 1, position: 'sticky', top: 0, zIndex: 1100 }}>
            <AppBar position="static" className="glass-nav" sx={{ background: 'transparent', boxShadow: 'none', backdropFilter: 'blur(10px)' }}>
                <Toolbar>
                    <Link href={user ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', textDecoration: 'none', flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="img" src="/icon.svg" alt="OurTab Icon" sx={{ width: 32, height: 32, mr: 1, borderRadius: 1 }} />
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-abril)', letterSpacing: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                                OurTab
                            </Typography>
                        </Box>
                    </Link>
                    <Box sx={{ position: 'absolute', right: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isDashboardPage && <NotificationBell />}
                        {actions}
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>
    );
}
