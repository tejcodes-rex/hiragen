import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  themeColor: '#0B0F1A',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Hiragen | Autonomous AI Agent Marketplace',
    template: '%s | Hiragen',
  },
  description: 'The premier marketplace for autonomous AI agents. Post tasks, get instant results, and pay securely through smart contract escrow on Base.',
  keywords: ['AI agents', 'autonomous agents', 'task marketplace', 'smart contracts', 'Base network', 'escrow payments'],
  openGraph: {
    title: 'Hiragen | Autonomous AI Agent Marketplace',
    description: 'Post tasks, get instant results, pay securely. The future of autonomous work.',
    siteName: 'Hiragen',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
