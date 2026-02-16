'use client';

import { Button } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '@/components/AuthContext';

export default function GoogleSignInButton() {
    const { signInWithGoogle } = useAuth();

    return (
        <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={signInWithGoogle}
            sx={{ mt: 2 }}
        >
            Sign in with Google
        </Button>
    );
}
