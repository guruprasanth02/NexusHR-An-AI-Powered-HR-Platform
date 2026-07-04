'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Search, LayoutDashboard, Clock, Calendar, DollarSign, Heart, MessageSquare, Users, Briefcase, X } from 'lucide-react';
import { useUIStore, useAuthStore } from '@/lib/store';
import { useTheme } from '@/components/ThemeProvider';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number }>;
  action: () => void;
  roles?: string[];
  category: string;
}

export default function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { user } = useAuthStore();
  const { toggleTheme } = useTheme();
  const [query, setQuery] = useState('');

  const commands: CommandItem[] = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => router.push('/dashboard'), category: 'Navigation' },
    { id: 'attendance', label: 'View Attendance', icon: Clock, action: () => router.push('/attendance'), category: 'Navigation' },
    { id: 'leaves', label: 'My Leaves', icon: Calendar, action: () => router.push('/leaves'), category: 'Navigation' },
    { id: 'apply-leave', label: 'Apply for Leave', icon: Calendar, action: () => router.push('/leaves/apply'), category: 'Quick Actions' },
    { id: 'payroll', label: 'View Payroll', icon: DollarSign, action: () => router.push('/payroll'), category: 'Navigation' },
    { id: 'wellness', label: 'Check Wellness', icon: Heart, action: () => router.push('/wellness'), category: 'Navigation' },
    { id: 'ai-assistant', label: 'Open AI Assistant', description: 'Ask anything about HR', icon: MessageSquare, action: () => router.push('/ai-assistant'), category: 'AI' },
    { id: 'hr-dashboard', label: 'HR Dashboard', icon: LayoutDashboard, action: () => router.push('/hr/dashboard'), category: 'HR', roles: ['HR', 'ADMIN'] },
    { id: 'employees', label: 'Manage Employees', icon: Users, action: () => router.push('/hr/employees'), category: 'HR', roles: ['HR', 'ADMIN'] },
    { id: 'recruitment', label: 'Recruitment', icon: Briefcase, action: () => router.push('/recruitment'), category: 'HR', roles: ['HR', 'ADMIN'] },
    { id: 'toggle-theme', label: 'Toggle Dark/Light Mode', icon: Command, action: toggleTheme, category: 'Settings' },
  ];

  const filtered = commands
    .filter((c) => !c.roles || (user && c.roles.includes(user.role)))
    .filter((c) =>
      !query ||
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.description?.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
    );

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  useEffect(() => {
    if (!commandPaletteOpen) setQuery('');
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommandPaletteOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setCommandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-start justify-center pt-24"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }}
          onClick={() => setCommandPaletteOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                autoFocus
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Search commands, pages, actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button onClick={() => setCommandPaletteOpen(false)}>
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {Object.keys(grouped).length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No commands found
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-1">
                    <p className="px-4 py-1 text-[10px] font-700 tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                      {category}
                    </p>
                    {items.map((cmd) => {
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-smooth"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          onClick={() => {
                            cmd.action();
                            setCommandPaletteOpen(false);
                          }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-500" style={{ color: 'var(--text-primary)' }}>{cmd.label}</p>
                            {cmd.description && (
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cmd.description}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 border-t flex items-center gap-3 text-xs" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>↵</kbd> select</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>Esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
