'use client';


import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
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
    <main style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center', background: '#f8fafc' }}>
      {/* Animated Background Blobs */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        overflow: 'hidden',
        filter: 'blur(80px)',
        opacity: { xs: 0.4, md: 0.6 }
      }}>
        <Box className="animate-blob" sx={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: '40vw',
          height: '40vw',
          bgcolor: 'rgba(108, 99, 255, 0.3)',
          borderRadius: '50%',
        }} />
        <Box className="animate-blob" sx={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: '35vw',
          height: '35vw',
          bgcolor: 'rgba(255, 101, 132, 0.2)',
          borderRadius: '50%',
          animationDelay: '2s'
        }} />
      </Box>

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, px: 2 }}>
        <Box
          className="animate-stagger"
          sx={{
            py: { xs: 8, md: 10 },
            px: { xs: 2, md: 4 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Box
            component="img"
            src="/icon.svg"
            alt="OurTab Icon"
            sx={{
              width: { xs: 80, md: 100 },
              height: { xs: 80, md: 100 },
              mb: 3,
              borderRadius: '24px',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
              transition: 'transform 0.5s ease',
              '&:hover': { transform: 'scale(1.05) rotate(5deg)' }
            }}
          />

          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 900,
              background: 'linear-gradient(45deg, #6C63FF 30%, #FF6584 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1.5,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              fontSize: { xs: '2.5rem', md: '4rem' }
            }}
          >
            OurTab
          </Typography>

          <Typography
            variant="h6"
            component="p"
            color="text.secondary"
            sx={{
              maxWidth: 320,
              mb: 5,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: { xs: '0.65rem', md: '0.75rem' },
              opacity: 0.7,
              lineHeight: 1.6
            }}
          >
            Manage your house expenses with master-level ease
          </Typography>

          <Box sx={{ width: '100%', mt: 0 }}>
            {loading ? (
              <Box sx={{ py: 2 }}><Loader inline /></Box>
            ) : (
              !user && (
                <Box sx={{
                  display: 'inline-block',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    filter: 'drop-shadow(0 10px 15px rgba(108, 99, 255, 0.2))'
                  }
                }}>
                  <GoogleSignInButton />
                </Box>
              )
            )}
          </Box>

          <Typography variant="caption" sx={{ mt: 4, opacity: 0.4, fontWeight: 500, px: 2, display: 'block' }}>
            Securely login with your Google account to get started
          </Typography>
        </Box>
      </Container>
    </main>
  );
}


