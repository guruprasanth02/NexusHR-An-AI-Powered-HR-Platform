'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { analyticsApi, attendanceApi, announcementsApi } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import {
  Users, Clock, Calendar, DollarSign, TrendingUp, AlertCircle,
  Heart, Building2, ArrowUpRight, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface CompanyData {
  totalEmployees: number;
  attendanceRate: number;
  present: number;
  late: number;
  onLeave: number;
  absent: number;
  pendingLeaves: number;
  wellnessScore: number;
  companyHealthScore: number;
  departments: Array<{ id: string; name: string; color: string; count: number }>;
}

export default function HRDashboardPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [trend, setTrend] = useState<Array<{ month: string; present: number; late: number; absent: number }>>([]);
  const [deptAnalytics, setDeptAnalytics] = useState<Array<{ name: string; color: string; attendanceRate: number; employeeCount: number; pendingLeaves: number }>>([]);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; content: string; isPinned: boolean; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.company().then((r) => setCompany(r.data.data)),
      analyticsApi.attendanceTrend().then((r) => setTrend(r.data.data)),
      analyticsApi.departments().then((r) => setDeptAnalytics(r.data.data)),
      announcementsApi.list().then((r) => setAnnouncements(r.data.data.slice(0, 3))),
    ]).finally(() => setLoading(false));
  }, []);

  const healthColor = company?.companyHealthScore
    ? company.companyHealthScore >= 80 ? '#10b981' : company.companyHealthScore >= 60 ? '#f59e0b' : '#ef4444'
    : '#6366f1';

  const pieData = company
    ? [
        { name: 'Present', value: company.present, color: '#10b981' },
        { name: 'Absent', value: company.absent, color: '#ef4444' },
        { name: 'On Leave', value: company.onLeave, color: '#6366f1' },
        { name: 'Late', value: company.late, color: '#f59e0b' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">HR Command Center</h1>
          <p className="page-subtitle">{formatDate(new Date(), 'EEEE, MMMM do yyyy')}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/leaves" className="btn-secondary flex items-center gap-2 text-sm">
            <Calendar size={14} /> Review Leaves
            {company?.pendingLeaves ? (
              <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                {company.pendingLeaves}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Employees', value: company?.totalEmployees, icon: Users, color: '#6366f1', sub: 'Active workforce' },
          { label: 'Present Today', value: company?.present, icon: Activity, color: '#10b981', sub: `${company?.attendanceRate || 0}% rate` },
          { label: 'On Leave', value: company?.onLeave, icon: Calendar, color: '#f59e0b', sub: `${company?.pendingLeaves || 0} pending` },
          { label: 'Wellness Score', value: company?.wellnessScore ? `${company.wellnessScore}%` : '—', icon: Heart, color: '#ec4899', sub: 'Team wellbeing' },
        ].map(({ label, value, icon: Icon, color, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="text-2xl font-900" style={{ color: 'var(--text-primary)' }}>
              {loading ? '—' : value ?? '—'}
            </div>
            <div className="text-xs font-500 mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Company Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} style={{ color: healthColor }} />
            <h2 className="font-700 text-base">Company Health Score</h2>
          </div>
          <span className="text-3xl font-900" style={{ color: healthColor }}>
            {loading ? '—' : company?.companyHealthScore}/100
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${company?.companyHealthScore || 0}%` }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="h-full rounded-full"
            style={{ background: healthColor }}
          />
        </div>
        <div className="flex gap-6 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Attendance: <strong style={{ color: 'var(--text-primary)' }}>{company?.attendanceRate}%</strong></span>
          <span>Wellness: <strong style={{ color: 'var(--text-primary)' }}>{company?.wellnessScore}%</strong></span>
          <span>Pending Approvals: <strong style={{ color: company?.pendingLeaves ? '#f59e0b' : '#10b981' }}>{company?.pendingLeaves || 0}</strong></span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <h2 className="font-700 mb-4 text-base">Attendance Trend — 12 Months</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} barSize={12} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '10px', fontSize: '12px' }} />
              <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
              <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Today's Breakdown Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6"
        >
          <h2 className="font-700 mb-4 text-base">Today&apos;s Attendance</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '10px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No attendance data today
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            {pieData.map(({ name, color, value }) => (
              <div key={name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {name}: <strong style={{ color }}>{value}</strong>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Department Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6 mt-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-700 text-base">Department Analytics</h2>
          <Building2 size={18} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deptAnalytics.map((dept, i) => (
            <motion.div
              key={dept.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="p-4 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: dept.color }} />
                <span className="font-600 text-sm" style={{ color: 'var(--text-primary)' }}>{dept.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                <span>{dept.employeeCount} employees</span>
                <span className="font-600" style={{ color: dept.attendanceRate >= 80 ? '#10b981' : '#f59e0b' }}>
                  {dept.attendanceRate}% attendance
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <div className="h-full rounded-full" style={{ width: `${dept.attendanceRate}%`, background: dept.color }} />
              </div>
              {dept.pendingLeaves > 0 && (
                <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: '#f59e0b' }}>
                  <AlertCircle size={10} /> {dept.pendingLeaves} pending leave(s)
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card p-6 mt-6"
        >
          <h2 className="font-700 mb-4 text-base">📢 Recent Announcements</h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-start gap-2">
                  {a.isPinned && <span className="text-xs badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>PINNED</span>}
                  <div>
                    <p className="font-600 text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.content.slice(0, 100)}...</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatDate(a.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
