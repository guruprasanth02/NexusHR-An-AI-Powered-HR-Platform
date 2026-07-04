'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
import CommandPalette from '@/components/CommandPalette';
import { useAuthStore, useUIStore } from '@/lib/store';
import { useSocket } from '@/hooks/useSocket';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { sidebarOpen } = useUIStore();

  useSocket();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const marginLeft = sidebarOpen ? 256 : 72;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Sidebar />

      <motion.div
        animate={{ marginLeft }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ minHeight: '100vh' }}
        className="flex flex-col"
      >
        <TopNav />

        <main className="flex-1 p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </motion.div>

      <CommandPalette />
    </div>
  );
}
