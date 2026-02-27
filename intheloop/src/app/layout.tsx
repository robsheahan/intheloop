import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { QueryProvider } from '@/context/QueryProvider';
import './globals.css';

export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'In The Loop',
  description: 'Stay in the loop with personalized alerts for music, books, news, crypto, and more.',
  icons: {
    icon: [
      { url: '/intheloop/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/intheloop/favicon.svg', type: 'image/svg+xml' },
      { url: '/intheloop/favicon.ico', rel: 'shortcut icon' },
    ],
    apple: '/intheloop/apple-touch-icon.png',
  },
  manifest: '/intheloop/site.webmanifest',
  appleWebApp: {
    title: 'In The Loop',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
