'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Clock, Calendar, DollarSign, User, Heart, MessageSquare,
  Users, FileCheck, BarChart3, Settings, Briefcase, ChevronLeft, ChevronRight,
  Building2, LogOut, Megaphone,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: string[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Employee
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Attendance', href: '/attendance', icon: Clock },
  { label: 'My Leaves', href: '/leaves', icon: Calendar },
  { label: 'Payroll', href: '/payroll', icon: DollarSign },
  { label: 'Wellness', href: '/wellness', icon: Heart },
  { label: 'AI Assistant', href: '/ai-assistant', icon: MessageSquare },
  { label: 'Profile', href: '/profile', icon: User },
  // HR
  { label: 'HR Dashboard', href: '/hr/dashboard', icon: LayoutDashboard, roles: ['HR', 'ADMIN'] },
  { label: 'Employees', href: '/hr/employees', icon: Users, roles: ['HR', 'ADMIN'] },
  { label: 'Leave Approvals', href: '/hr/leaves', icon: FileCheck, roles: ['HR', 'ADMIN'] },
  { label: 'HR Attendance', href: '/hr/attendance', icon: Clock, roles: ['HR', 'ADMIN'] },
  { label: 'Payroll Mgmt', href: '/hr/payroll', icon: DollarSign, roles: ['HR', 'ADMIN'] },
  { label: 'Analytics', href: '/hr/analytics', icon: BarChart3, roles: ['HR', 'ADMIN'] },
  { label: 'Recruitment', href: '/recruitment', icon: Briefcase, roles: ['HR', 'ADMIN'] },
  // Admin
  { label: 'Admin Panel', href: '/admin/dashboard', icon: Settings, roles: ['ADMIN'] },
  { label: 'Departments', href: '/admin/departments', icon: Building2, roles: ['ADMIN'] },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone, roles: ['ADMIN', 'HR'] },
];

const SECTION_LABELS: Record<string, string> = {
  '/dashboard': 'EMPLOYEE',
  '/hr/dashboard': 'HR',
  '/admin/dashboard': 'ADMIN',
  '/recruitment': 'RECRUITMENT',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      router.push('/login');
      toast.success('Logged out successfully');
    }
  };

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  // Group items
  const employeeItems = filteredItems.filter(
    (item) => !item.roles
  );
  const hrItems = filteredItems.filter(
    (item) => item.roles?.includes('HR') && !item.roles?.includes('ADMIN')
      || (item.roles?.includes('HR') && user?.role !== 'ADMIN')
  ).filter(i => i.roles?.includes('HR') && !i.href.startsWith('/admin'));
  const adminItems = filteredItems.filter((item) => item.roles?.includes('ADMIN'));
  const recruitmentItems = filteredItems.filter((item) => item.href.startsWith('/recruitment'));

  const renderSection = (label: string, items: NavItem[]) => {
    if (!items.length) return null;
    return (
      <div key={label} className="mb-2">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] font-700 tracking-widest px-3 mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {label}
            </motion.p>
          )}
        </AnimatePresence>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/hr/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon size={18} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge && sidebarOpen && (
                <span className="ml-auto badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10px' }}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className="sidebar"
        animate={{ width: sidebarOpen ? 256 : 72 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border-default)', minHeight: 'var(--topnav-height)' }}>
          <div className="gradient-bg rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36 }}>
            <span className="text-white font-black text-lg">N</span>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden"
              >
                <div className="gradient-text font-black text-lg leading-none">NexusHR</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-Powered HRMS</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {renderSection('EMPLOYEE', employeeItems)}
          {user?.role !== 'EMPLOYEE' && renderSection('HUMAN RESOURCES', hrItems)}
          {user?.role === 'ADMIN' && renderSection('ADMINISTRATION', adminItems)}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-smooth hover:opacity-80"
            style={{ background: 'var(--bg-card)' }}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar" style={{ width: 32, height: 32 }} />
            ) : (
              <div className="avatar flex-shrink-0 text-xs" style={{ width: 32, height: 32 }}>
                {getInitials(user?.name || 'U')}
              </div>
            )}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-600 truncate" style={{ color: 'var(--text-primary)' }}>
                    {user?.name}
                  </p>
                  <p className="text-xs truncate capitalize" style={{ color: 'var(--text-muted)' }}>
                    {user?.role?.toLowerCase()}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleLogout}
                  className="btn-ghost p-1.5 flex-shrink-0"
                  title="Logout"
                >
                  <LogOut size={16} style={{ color: 'var(--text-muted)' }} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center transition-smooth hover:scale-110"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-secondary)',
            zIndex: 50,
          }}
        >
          {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </motion.aside>
    </>
  );
}
