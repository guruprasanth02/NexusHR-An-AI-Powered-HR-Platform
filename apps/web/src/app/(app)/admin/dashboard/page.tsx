'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usersApi, analyticsApi, announcementsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users, Building2, DollarSign, TrendingUp, Shield,
  Plus, Megaphone, Activity, CheckCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Stat {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  change?: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.company().catch(() => ({ data: { data: null } })),
      usersApi.departments().catch(() => ({ data: { data: [] } })),
      announcementsApi.list().catch(() => ({ data: { data: [] } })),
    ]).then(([companyRes, deptRes, announcRes]) => {
      setStats(companyRes.data.data);
      setDepartments(deptRes.data.data || []);
      setAnnouncements((announcRes.data.data || []).slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  const kpiCards: Stat[] = [
    {
      label: 'Total Employees',
      value: stats?.totalEmployees?.toString() ?? '—',
      icon: Users,
      color: '#6366f1',
      change: 'Active workforce',
    },
    {
      label: 'Departments',
      value: departments.length.toString(),
      icon: Building2,
      color: '#a855f7',
      change: 'Across organization',
    },
    {
      label: 'Avg Attendance',
      value: stats?.avgAttendance ? `${stats.avgAttendance}%` : '—',
      icon: TrendingUp,
      color: '#10b981',
      change: 'This month',
    },
    {
      label: 'Monthly Payroll',
      value: stats?.totalPayroll ? formatCurrency(stats.totalPayroll) : '—',
      icon: DollarSign,
      color: '#f59e0b',
      change: 'Current month',
    },
  ];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Shield size={28} style={{ color: '#6366f1' }} />
            Admin Panel
          </h1>
          <p className="page-subtitle">System overview and administration controls</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/announcements">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="btn-secondary flex items-center gap-2 text-sm">
              <Megaphone size={16} /> Announcements
            </motion.button>
          </Link>
          <Link href="/admin/departments">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Add Department
            </motion.button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${card.color}18`, border: `1px solid ${card.color}30` }}>
                  <Icon size={20} style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-2xl font-800" style={{ color: 'var(--text-primary)' }}>
                {loading ? '—' : card.value}
              </div>
              <div className="text-xs font-600 mt-1" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
              {card.change && (
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.change}</div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Departments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-700 text-base flex items-center gap-2">
              <Building2 size={18} style={{ color: '#a855f7' }} />
              Departments
            </h2>
            <Link href="/admin/departments"
              className="text-xs font-600" style={{ color: 'var(--text-brand)' }}>
              Manage →
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
              ))
            ) : departments.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No departments yet</p>
            ) : (
              departments.map((dept: any) => (
                <div key={dept.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dept.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 truncate" style={{ color: 'var(--text-primary)' }}>{dept.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{dept.description || 'No description'}</p>
                  </div>
                  <div className="text-xs font-600 px-2 py-1 rounded-lg"
                    style={{ background: `${dept.color}20`, color: dept.color }}>
                    {dept._count?.users ?? 0} members
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-700 text-base flex items-center gap-2">
              <Megaphone size={18} style={{ color: '#f59e0b' }} />
              Announcements
            </h2>
            <Link href="/admin/announcements"
              className="text-xs font-600" style={{ color: 'var(--text-brand)' }}>
              All →
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
              ))
            ) : announcements.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No announcements</p>
            ) : (
              announcements.map((ann: any) => (
                <div key={ann.id} className="p-3 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-start gap-2">
                    {ann.isPinned && (
                      <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                    )}
                    <div>
                      <p className="text-sm font-600 leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {ann.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(ann.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/admin/announcements">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-secondary w-full mt-4 text-sm flex items-center gap-2 justify-center"
            >
              <Plus size={14} /> New Announcement
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 mt-6"
      >
        <h2 className="font-700 text-base mb-4 flex items-center gap-2">
          <Activity size={18} style={{ color: '#10b981' }} />
          Quick Administration
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'HR Dashboard', href: '/hr/dashboard', icon: TrendingUp, color: '#6366f1' },
            { label: 'All Employees', href: '/hr/employees', icon: Users, color: '#a855f7' },
            { label: 'Payroll Mgmt', href: '/hr/payroll', icon: DollarSign, color: '#f59e0b' },
            { label: 'Analytics', href: '/hr/analytics', icon: Activity, color: '#10b981' },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="p-4 rounded-xl text-center cursor-pointer"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: `${color}15` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <p className="text-xs font-600" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
