'use client';


import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { useAuth } from '@/components/AuthContext';
import Loader from '@/components/Loader';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <main>

      <Container maxWidth="lg">
        <Box
          sx={{
            my: 4,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '80vh',
          }}
        >
          {/* <LocalGroceryStoreIcon sx={{ fontSize: 100, color: 'primary.main', mb: 1 }} /> */}
          <Box component="img" src="/icon.svg" alt="OurTab Icon" sx={{ width: 120, height: 120, mb: 1, borderRadius: '20px' }} />
          <Typography variant="h2" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 0, fontFamily: 'var(--font-abril)', letterSpacing: 1 }}>
            OurTab
          </Typography>
          <Typography variant="h6" component="p" gutterBottom align="center" color="text.secondary" sx={{ maxWidth: 600, mb: 4, letterSpacing: 3, textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600 }}>
            MANAGE YOUR HOUSE EXPENSES WITH EASE
          </Typography>

          <Box sx={{ mt: 4 }}>
            {loading ? (
              <Loader inline />
            ) : (
              !user && <GoogleSignInButton />
            )}
          </Box>
        </Box>
      </Container>
    </main>
  );
}
