'use client';


import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
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
          <LocalGroceryStoreIcon sx={{ fontSize: 100, color: 'primary.main', mb: 1 }} />
          <Typography variant="h2" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 0 }}>
            OurTab
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom align="center" color="text.secondary" sx={{ mt: 2 }}>
            Grocery Expense Tracker
          </Typography>
          <Typography variant="h6" component="p" gutterBottom align="center" color="text.secondary" sx={{ maxWidth: 600, mb: 4 }}>
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
