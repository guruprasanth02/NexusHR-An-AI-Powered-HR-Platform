import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'NexusHR — AI-Powered HR Platform', template: '%s | NexusHR' },
  description: 'A premium AI-powered Human Resource Management System with intelligent attendance tracking, leave management, payroll, and smart analytics.',
  keywords: ['HR', 'HRMS', 'Human Resources', 'AI', 'Attendance', 'Leave Management', 'Payroll'],
  authors: [{ name: 'NexusHR Team' }],
  creator: 'NexusHR',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nexushr.app',
    title: 'NexusHR — AI-Powered HR Platform',
    description: 'A premium SaaS-grade AI-powered HRMS',
    siteName: 'NexusHR',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#080812' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
