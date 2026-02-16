'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

import Link from 'next/link';
import { useAuth } from './AuthContext';

export default function Navbar() {

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" className="glass-nav" sx={{ background: 'transparent', boxShadow: 'none' }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                            OurTab
                        </Link>
                    </Typography>
                </Toolbar>
            </AppBar>
        </Box>
    );
}
