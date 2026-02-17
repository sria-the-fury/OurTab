'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

interface NavbarProps {
    actions?: React.ReactNode;
}

export default function Navbar({ actions }: NavbarProps) {
    const { user } = useAuth();

    return (
        <Box sx={{ flexGrow: 1, position: 'sticky', top: 0, zIndex: 1100 }}>
            <AppBar position="static" className="glass-nav" sx={{ background: 'transparent', boxShadow: 'none', backdropFilter: 'blur(10px)' }}>
                <Toolbar>
                    <Link href={user ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', textDecoration: 'none', flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <img src="/icon.svg" alt="OurTab Icon" style={{ width: 32, height: 32, marginRight: 8, borderRadius: 8 }} />
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-abril)', letterSpacing: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                                OurTab
                            </Typography>
                        </Box>
                    </Link>
                    {actions && (
                        <Box sx={{ position: 'absolute', right: 16 }}>
                            {actions}
                        </Box>
                    )}
                </Toolbar>
            </AppBar>
        </Box>
    );
}
