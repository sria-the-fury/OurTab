'use client';

import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

const bounce = keyframes`
  0%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
`;

export default function Loader() {
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
            backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white
            backdropFilter: 'blur(5px)'
        }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                {[0, 1, 2].map((i) => (
                    <Box
                        key={i}
                        sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            animation: `${bounce} 1.4s infinite ease-in-out both`,
                            animationDelay: `${i * 0.16}s`
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
}
