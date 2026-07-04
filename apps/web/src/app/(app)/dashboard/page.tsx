'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Clock, Calendar, DollarSign, Heart, TrendingUp, ArrowUpRight,
  CheckCircle, AlertCircle, PlayCircle, StopCircle, Zap
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { attendanceApi, leavesApi, payrollApi, moodApi } from '@/lib/api';
import { formatCurrency, formatDate, formatTime, getMoodEmoji, getStatusColor } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as any },
  }),
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [attendance, setAttendance] = useState<{ checkIn?: string; checkOut?: string; status?: string } | null>(null);
  const [leaves, setLeaves] = useState<{ data: Array<{ type: string; status: string; days: number; startDate: string }>, balance: Record<string, number> | null }>({ data: [], balance: null });
  const [payroll, setPayroll] = useState<Array<{ month: number; year: number; netSalary: number; status: string }>>([]);
  const [mood, setMood] = useState<{ todayEntry: { mood: string } | null }>({ todayEntry: null });
  const [attendanceHistory, setAttendanceHistory] = useState<Array<{ status: string; date: string }>>([]);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    attendanceApi.today().then((r) => setAttendance(r.data.data)).catch(() => {});
    leavesApi.myLeaves().then((r) => setLeaves({ data: r.data.data, balance: r.data.balance })).catch(() => {});
    payrollApi.myPayslips().then((r) => setPayroll(r.data.data)).catch(() => {});
    moodApi.myMoods({ days: 7 }).then((r) => setMood(r.data)).catch(() => {});
    attendanceApi.myHistory().then((r) => setAttendanceHistory(r.data.data)).catch(() => {});
  }, []);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await attendanceApi.checkIn();
      setAttendance(res.data.data);
      toast.success('Checked in successfully! 🎉');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingIn(true);
    try {
      const res = await attendanceApi.checkOut();
      setAttendance(res.data.data);
      toast.success('Checked out! Have a great evening! 👋');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-out failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const latestPayroll = payroll[0];
  const pendingLeaves = leaves.data.filter((l) => l.status === 'PENDING').length;
  const approvedLeaves = leaves.data.filter((l) => l.status === 'APPROVED').length;

  // Build chart data
  const chartData = attendanceHistory.slice(-14).map((a) => ({
    date: formatDate(a.date, 'MMM dd'),
    present: ['PRESENT', 'LATE'].includes(a.status) ? 1 : 0,
    late: a.status === 'LATE' ? 1 : 0,
  }));

  const presentCount = attendanceHistory.filter((a) => ['PRESENT', 'LATE'].includes(a.status)).length;
  const totalDays = attendanceHistory.filter((a) => !['WEEKEND', 'HOLIDAY'].includes(a.status)).length;
  const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  const kpiCards = [
    {
      title: 'Attendance Rate',
      value: `${attendanceRate}%`,
      subtitle: `${presentCount} of ${totalDays} days`,
      icon: TrendingUp,
      color: '#10b981',
      trend: '+2%',
    },
    {
      title: 'Leave Balance',
      value: `${(leaves.balance?.casual || 0) - (leaves.balance?.usedCasual || 0)} days`,
      subtitle: 'Casual leave remaining',
      icon: Calendar,
      color: '#6366f1',
      trend: `${pendingLeaves} pending`,
    },
    {
      title: 'Last Salary',
      value: latestPayroll ? formatCurrency(latestPayroll.netSalary) : '—',
      subtitle: latestPayroll ? `${['January','February','March','April','May','June','July','August','September','October','November','December'][latestPayroll.month - 1]} ${latestPayroll.year}` : 'Not generated',
      icon: DollarSign,
      color: '#f59e0b',
      trend: latestPayroll?.status || '',
    },
    {
      title: 'Wellness Score',
      value: mood.todayEntry ? getMoodEmoji(mood.todayEntry.mood) : '—',
      subtitle: mood.todayEntry ? `Today: ${mood.todayEntry.mood}` : 'No mood logged today',
      icon: Heart,
      color: '#ec4899',
      trend: '',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="page-subtitle">
            {formatDate(new Date(), 'EEEE, MMMM do yyyy')} — {user?.position || user?.role}
          </p>
        </div>

        {/* Check In / Out */}
        <div className="flex gap-3">
          {!attendance?.checkIn ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary flex items-center gap-2"
              onClick={handleCheckIn}
              disabled={checkingIn}
            >
              <PlayCircle size={16} />
              {checkingIn ? 'Processing...' : 'Check In'}
            </motion.button>
          ) : !attendance?.checkOut ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckOut}
              disabled={checkingIn}
              className="btn-secondary flex items-center gap-2"
            >
              <StopCircle size={16} style={{ color: '#ef4444' }} />
              {checkingIn ? 'Processing...' : 'Check Out'}
            </motion.button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-500"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
              <CheckCircle size={16} /> Day Complete
            </div>
          )}
        </div>
      </div>

      {/* Today's Status Banner */}
      {attendance && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl flex items-center gap-4"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <Zap size={20} style={{ color: '#818cf8' }} />
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <span style={{ color: 'var(--text-secondary)' }}>
              Status: <span className={`font-600 ${getStatusColor(attendance.status || 'ABSENT').split(' ')[0]}`}>{attendance.status}</span>
            </span>
            {attendance.checkIn && (
              <span style={{ color: 'var(--text-secondary)' }}>
                Check-in: <span className="font-600" style={{ color: 'var(--text-primary)' }}>{formatTime(attendance.checkIn)}</span>
              </span>
            )}
            {attendance.checkOut && (
              <span style={{ color: 'var(--text-secondary)' }}>
                Check-out: <span className="font-600" style={{ color: 'var(--text-primary)' }}>{formatTime(attendance.checkOut)}</span>
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${card.color}18`, border: `1px solid ${card.color}30` }}
                >
                  <Icon size={20} style={{ color: card.color }} />
                </div>
                {card.trend && (
                  <span className="text-xs font-500 flex items-center gap-1"
                    style={{ color: 'var(--text-muted)' }}>
                    <ArrowUpRight size={12} />
                    {card.trend}
                  </span>
                )}
              </div>
              <div className="text-2xl font-800" style={{ color: 'var(--text-primary)' }}>
                {card.value}
              </div>
              <div className="text-xs mt-1 font-500" style={{ color: 'var(--text-secondary)' }}>
                {card.title}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {card.subtitle}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <h2 className="font-700 mb-4" style={{ fontSize: '15px' }}>Attendance — Last 14 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                }}
              />
              <Area
                type="monotone"
                dataKey="present"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#presentGrad)"
                name="Present"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick Actions & Leave Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h2 className="font-700 mb-4" style={{ fontSize: '15px' }}>Quick Actions</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Apply Leave', href: '/leaves/apply', icon: Calendar, color: '#6366f1' },
              { label: 'View Payslip', href: '/payroll', icon: DollarSign, color: '#f59e0b' },
              { label: 'Log Mood', href: '/wellness', icon: Heart, color: '#ec4899' },
              { label: 'AI Assistant', href: '/ai-assistant', icon: Zap, color: '#10b981' },
            ].map(({ label, href, icon: Icon, color }) => (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-smooth"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-sm font-500" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <ArrowUpRight size={14} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Leave summary */}
          {leaves.data.length > 0 && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="text-xs font-700 mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Recent Leaves
              </h3>
              {leaves.data.slice(0, 2).map((leave, i) => (
                <div key={i} className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-600" style={{ color: 'var(--text-primary)' }}>{leave.type}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(leave.startDate)} · {leave.days}d</p>
                  </div>
                  <span className={`badge ${getStatusColor(leave.status)}`}>{leave.status}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Leaves Table */}
      {pendingLeaves > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-5 mt-6 flex items-center gap-3"
        >
          <AlertCircle size={18} style={{ color: '#f59e0b' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You have <span className="font-700" style={{ color: '#f59e0b' }}>{pendingLeaves}</span> pending leave request(s) awaiting HR approval.
          </p>
          <Link href="/leaves" className="ml-auto text-sm font-600" style={{ color: 'var(--text-brand)' }}>
            View →
          </Link>
        </motion.div>
      )}
    </div>
  );
}
