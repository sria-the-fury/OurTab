'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

export default function Navbar() {
    const { user } = useAuth();

    return (
        <Box sx={{ flexGrow: 1, position: 'sticky', top: 0, zIndex: 1100 }}>
            <AppBar position="static" className="glass-nav" sx={{ background: 'transparent', boxShadow: 'none', backdropFilter: 'blur(10px)' }}>
                <Toolbar>
                    <Link href={user ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', textDecoration: 'none', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <img src="/icon.svg" alt="OurTab Icon" style={{ width: 32, height: 32, marginRight: 8, borderRadius: 8 }} />
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-abril)', letterSpacing: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                                OurTab
                            </Typography>
                        </Box>
                    </Link>
                </Toolbar>
            </AppBar>
        </Box>
    );
}
