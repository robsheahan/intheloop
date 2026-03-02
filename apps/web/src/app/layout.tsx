import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { QueryProvider } from '@/context/QueryProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tell Me When',
  description: 'Personalized alerts for music, books, news, crypto, and more.',
  icons: {
    icon: [
      { url: '/intheloopnew/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/intheloopnew/favicon.svg', type: 'image/svg+xml' },
      { url: '/intheloopnew/favicon.ico', rel: 'shortcut icon' },
    ],
    apple: '/intheloopnew/apple-touch-icon.png',
  },
  manifest: '/intheloopnew/site.webmanifest',
  appleWebApp: {
    title: 'Tell Me When',
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
