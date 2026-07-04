'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { analyticsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Users, Heart, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

export default function HRAnalyticsPage() {
  const [company, setCompany] = useState<{
    totalEmployees: number;
    attendanceRate: number;
    wellnessScore: number;
    companyHealthScore: number;
    avgSalary: number;
    pendingLeaves: number;
  } | null>(null);
  const [trend, setTrend] = useState<Array<{ month: string; present: number; late: number; absent: number }>>([]);
  const [deptAnalytics, setDeptAnalytics] = useState<Array<{ name: string; color: string; attendanceRate: number; employeeCount: number; avgSalary?: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.company().then((r) => setCompany(r.data.data)),
      analyticsApi.attendanceTrend().then((r) => setTrend(r.data.data)),
      analyticsApi.departments().then((r) => setDeptAnalytics(r.data.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const radarData = deptAnalytics.map((d) => ({
    subject: d.name.split(' ')[0],
    attendance: d.attendanceRate,
    fullMark: 100,
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">HR Analytics</h1>
        <p className="page-subtitle">In-depth workforce insights and performance metrics</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Employees', value: company?.totalEmployees || 0, icon: Users, color: '#6366f1', format: (v: number) => v.toString() },
          { label: 'Attendance Rate', value: company?.attendanceRate || 0, icon: TrendingUp, color: '#10b981', format: (v: number) => `${v}%` },
          { label: 'Avg Salary (Net)', value: company?.avgSalary || 0, icon: DollarSign, color: '#f59e0b', format: formatCurrency },
          { label: 'Wellness Score', value: company?.wellnessScore || 0, icon: Heart, color: '#ec4899', format: (v: number) => `${v}%` },
        ].map(({ label, value, icon: Icon, color, format }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="text-2xl font-900" style={{ color: 'var(--text-primary)' }}>
              {loading ? '—' : format(value)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="font-700 mb-4 text-base">12-Month Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend} barSize={10} barGap={2}>
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

        {/* Department Radar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <h2 className="font-700 mb-4 text-base">Department Attendance Radar</h2>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border-default)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Attendance" dataKey="attendance" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '10px', fontSize: '12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Department Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 mt-6"
      >
        <h2 className="font-700 mb-4 text-base">Department Breakdown</h2>
        <div className="space-y-4">
          {deptAnalytics.map((dept, i) => (
            <div key={dept.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: dept.color }} />
                  <span className="text-sm font-600" style={{ color: 'var(--text-primary)' }}>{dept.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({dept.employeeCount} employees)</span>
                </div>
                <span className="text-sm font-700" style={{ color: dept.attendanceRate >= 80 ? '#10b981' : '#f59e0b' }}>
                  {dept.attendanceRate}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dept.attendanceRate}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: dept.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
