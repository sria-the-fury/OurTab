import type { Metadata } from 'next';
import { Outfit, Abril_Fatface } from 'next/font/google';
import ThemeRegistry from '@/components/ThemeRegistry';
import { AuthProvider } from '@/components/AuthContext';
import { ToastProvider } from '@/components/ToastContext';

const outfit = Outfit({ subsets: ['latin'] });
const abril = Abril_Fatface({ weight: '400', subsets: ['latin'], variable: '--font-abril' });

export const metadata: Metadata = {
  title: 'OurTab',
  description: 'Split grocery bills and track shared expenses with ease.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.className} ${abril.variable}`}>
        <ThemeRegistry>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
