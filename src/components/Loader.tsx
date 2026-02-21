'use client';

import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

const pulse = keyframes`
  0%, 100% {
    transform: scale(0.6);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
`;

interface LoaderProps {
    inline?: boolean;
}

export default function Loader({ inline = false }: LoaderProps) {
    const loaderContent = (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', justifyContent: 'center' }}>
            {[0, 1, 2].map((i) => (
                <Box
                    key={i}
                    sx={{
                        width: inline ? 10 : 16,
                        height: inline ? 10 : 16,
                        borderRadius: '50%',
                        backgroundColor: 'primary.main',
                        animation: `${pulse} 1.5s infinite ease-in-out both`,
                        animationDelay: `${i * 0.2}s`,
                        boxShadow: (theme) => `0 0 10px ${theme.palette.primary.main}44`
                    }}
                />
            ))}
        </Box>
    );

    if (inline) {
        return <Box sx={{ py: 2 }}>{loaderContent}</Box>;
    }

    return (
        <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            backgroundColor: (theme) => theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(10, 10, 10, 0.7)',
            backdropFilter: 'blur(8px)'
        }}>
            {loaderContent}
        </Box>
    );
}
