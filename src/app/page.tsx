'use client';


import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { useAuth } from '@/components/AuthContext';
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
          <Typography variant="h2" component="h1" gutterBottom align="center">
            Grocery Expense Tracker
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom align="center" color="text.secondary">
            Manage your group expenses with ease.
          </Typography>

          <Box sx={{ mt: 4 }}>
            {loading ? (
              <Typography>Loading...</Typography>
            ) : (
              !user && <GoogleSignInButton />
            )}
          </Box>
        </Box>
      </Container>
    </main>
  );
}
