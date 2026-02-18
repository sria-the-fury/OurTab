import type { Metadata, Viewport } from 'next';
import { Outfit, Abril_Fatface } from 'next/font/google';
import ThemeRegistry from '@/components/ThemeRegistry';
import { AuthProvider } from '@/components/AuthContext';
import { ToastProvider } from '@/components/ToastContext';

const outfit = Outfit({ subsets: ['latin'] });
const abril = Abril_Fatface({ weight: '400', subsets: ['latin'], variable: '--font-abril' });

export const metadata: Metadata = {
  title: 'OurTab',
  description: 'Split grocery bills and track shared expenses with ease.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
