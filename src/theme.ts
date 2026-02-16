'use client';
import { createTheme, PaletteMode } from '@mui/material/styles';
import { Outfit } from 'next/font/google';

const outfit = Outfit({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export const createAppTheme = (mode: PaletteMode) => {
    return createTheme({
        typography: {
            fontFamily: outfit.style.fontFamily,
            h4: {
                fontWeight: 700,
            },
            h6: {
                fontWeight: 600,
            }
        },
        palette: {
            mode,
            primary: {
                main: mode === 'light' ? '#6C63FF' : '#8B7FFF',
            },
            secondary: {
                main: mode === 'light' ? '#00BFA5' : '#1DE9B6',
            },
            background: {
                default: mode === 'light' ? '#F4F6F8' : '#0a0a0a',
                paper: mode === 'light' ? '#FFFFFF' : '#1a1a1a',
            },
            text: {
                primary: mode === 'light' ? '#171717' : '#ededed',
                secondary: mode === 'light' ? '#666666' : '#b0b0b0',
            }
        },
        shape: {
            borderRadius: 16,
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        boxShadow: mode === 'light'
                            ? '0px 4px 20px rgba(0, 0, 0, 0.05)'
                            : '0px 4px 20px rgba(0, 0, 0, 0.3)',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 12,
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        fontWeight: 500,
                    }
                }
            }
        },
    });
};

// Default light theme for initial load
const theme = createAppTheme('light');
export default theme;
