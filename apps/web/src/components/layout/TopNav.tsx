'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Sun, Moon, Menu, ChevronDown, User, Settings, LogOut, Command } from 'lucide-react';
import { useAuthStore, useUIStore, useNotificationStore } from '@/lib/store';
import { useTheme } from '@/components/ThemeProvider';
import { authApi, notificationsApi } from '@/lib/api';
import { getInitials, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function TopNav() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const { theme, toggleTheme } = useTheme();
  const { notifications, setNotifications } = useNotificationStore();

  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    notificationsApi.list({ limit: '10' }).then((res) => {
      setNotifications(res.data.data);
    }).catch(() => {});
  }, [setNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setCommandPaletteOpen]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      router.push('/login');
      toast.success('Logged out successfully');
    }
  };

  return (
    <header className="topnav" style={{ marginLeft: 'var(--sidebar-current-width, 256px)', transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
      {/* Mobile menu */}
      <button className="btn-ghost p-2 lg:hidden" onClick={toggleSidebar}>
        <Menu size={20} />
      </button>

      {/* Search / Command Palette trigger */}
      <button
        className="flex items-center gap-2 flex-1 max-w-sm px-3 py-2 rounded-xl text-sm transition-smooth"
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
        }}
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search size={15} />
        <span className="flex-1 text-left hidden sm:block">Search anything...</span>
        <span className="hidden sm:flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          <Command size={10} />K
        </span>
      </button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button className="btn-ghost p-2" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            className="btn-ghost p-2 relative"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-700 flex items-center justify-center text-white"
                style={{ background: '#ef4444' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden shadow-xl"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  zIndex: 60,
                }}
              >
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-700 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs font-500"
                        style={{ color: 'var(--text-brand)' }}
                        onClick={() => notificationsApi.markAllRead()}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        className="flex gap-3 p-3 border-b transition-smooth cursor-pointer"
                        style={{
                          borderColor: 'var(--border-default)',
                          background: !notif.isRead ? 'rgba(99,102,241,0.05)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = !notif.isRead ? 'rgba(99,102,241,0.05)' : 'transparent'; }}
                      >
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: !notif.isRead ? 'var(--brand-primary)' : 'var(--border-default)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-500 truncate" style={{ color: 'var(--text-primary)' }}>
                            {notif.title}
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {notif.body}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Menu */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            className="flex items-center gap-2 p-1.5 rounded-xl transition-smooth"
            style={{ background: showProfile ? 'var(--bg-card-hover)' : 'transparent' }}
            onClick={() => setShowProfile(!showProfile)}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar" style={{ width: 32, height: 32 }} />
            ) : (
              <div className="avatar text-xs" style={{ width: 32, height: 32 }}>
                {getInitials(user?.name || 'U')}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-600 leading-none" style={{ color: 'var(--text-primary)' }}>
                {user?.name?.split(' ')[0]}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                {user?.role?.toLowerCase()}
              </p>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden py-2"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 60,
                }}
              >
                <div className="px-4 py-2 border-b mb-1" style={{ borderColor: 'var(--border-default)' }}>
                  <p className="font-600 text-sm">{user?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
                {[
                  { label: 'Profile', href: '/profile', icon: User },
                  { label: 'Settings', href: '/profile', icon: Settings },
                ].map(({ label, href, icon: Icon }) => (
                  <button
                    key={label}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-smooth"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                    onClick={() => { router.push(href); setShowProfile(false); }}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
                <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border-default)' }}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-smooth"
                    style={{ color: '#ef4444' }}
                    onClick={handleLogout}
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
