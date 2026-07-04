'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { attendanceApi } from '@/lib/api';
import { formatTime, getStatusColor } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  workHours?: number;
  lateMinutes?: number;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#10b981',
  LATE: '#f59e0b',
  ABSENT: '#ef4444',
  HALF_DAY: '#f97316',
  ON_LEAVE: '#6366f1',
  HOLIDAY: '#a855f7',
  WEEKEND: '#334155',
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, totalWorkHours: 0, attendanceRate: 0 });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<AttendanceRecord | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();
    setLoading(true);
    attendanceApi
      .myHistory({ month, year })
      .then((res) => {
        setRecords(res.data.data);
        setStats(res.data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const recordMap = new Map(records.map((r) => [format(new Date(r.date), 'yyyy-MM-dd'), r]));
  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  const prevMonth = () => setCurrentMonth((m) => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; });
  const nextMonth = () => setCurrentMonth((m) => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">Track your daily attendance and work hours</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Present', value: stats.present, color: '#10b981' },
          { label: 'Late', value: stats.late, color: '#f59e0b' },
          { label: 'Absent', value: stats.absent, color: '#ef4444' },
          { label: 'Half Day', value: stats.halfDay, color: '#f97316' },
          { label: 'On Leave', value: stats.onLeave, color: '#6366f1' },
          { label: 'Hours', value: `${stats.totalWorkHours}h`, color: '#a855f7' },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 text-center"
          >
            <div className="text-2xl font-800" style={{ color }}>
              {loading ? '—' : value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Attendance Rate */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} style={{ color: '#6366f1' }} />
            <h2 className="font-700 text-base">Attendance Rate</h2>
          </div>
          <span className="text-3xl font-900 gradient-text">{stats.attendanceRate}%</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.attendanceRate}%` }}
            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full gradient-bg"
          />
        </div>
        {stats.late > 0 && (
          <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: '#f59e0b' }}>
            <AlertTriangle size={14} />
            <span>{stats.late} late arrival(s) this month. Punctuality affects your consistency score.</span>
          </div>
        )}
      </motion.div>

      {/* Calendar Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-700 text-base">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button className="btn-ghost p-2" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <button className="btn-ghost p-2" onClick={nextMonth}><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-600" style={{ color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for month start */}
          {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {monthDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const record = recordMap.get(key);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isFuture = day > new Date();
            const weekend = isWeekend(day);

            let color = 'var(--bg-card)';
            if (weekend) color = STATUS_COLORS.WEEKEND;
            else if (isFuture) color = 'var(--bg-card)';
            else if (record) color = STATUS_COLORS[record.status] || STATUS_COLORS.ABSENT;
            else if (!isFuture) color = STATUS_COLORS.ABSENT;

            return (
              <motion.div
                key={key}
                whileHover={{ scale: 1.15, zIndex: 10 }}
                className="relative aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer"
                style={{
                  background: `${color}30`,
                  border: isToday ? `2px solid ${color}` : `1px solid ${color}50`,
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (record) {
                    setHoveredDay(record);
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <span className="text-xs font-600" style={{ color: isFuture || weekend ? 'var(--text-muted)' : color }}>
                  {day.getDate()}
                </span>
                {record && !weekend && (
                  <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: color }} />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
          {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'WEEKEND').map(([status, color]) => (
            <div key={status} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="w-3 h-3 rounded" style={{ background: `${color}50`, border: `1px solid ${color}` }} />
              {status.replace('_', ' ')}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Daily log table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 mt-6"
      >
        <h2 className="font-700 mb-4 text-base">Daily Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Date', 'Status', 'Check In', 'Check Out', 'Hours', 'Late'].map((h) => (
                  <th key={h} className="text-left py-2.5 px-2 text-xs font-600" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.slice().reverse().slice(0, 15).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-default)' }}
                  className="transition-smooth hover:bg-[var(--bg-card-hover)]">
                  <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>
                    {format(new Date(r.date), 'EEE, MMM dd')}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`badge ${getStatusColor(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>
                    {r.checkIn ? <span className="flex items-center gap-1"><Clock size={12} />{formatTime(r.checkIn)}</span> : '—'}
                  </td>
                  <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>
                    {r.checkOut ? formatTime(r.checkOut) : '—'}
                  </td>
                  <td className="py-3 px-2 font-500" style={{ color: 'var(--text-primary)' }}>
                    {r.workHours ? `${r.workHours}h` : '—'}
                  </td>
                  <td className="py-3 px-2" style={{ color: r.lateMinutes ? '#f59e0b' : 'var(--text-muted)' }}>
                    {r.lateMinutes ? `${r.lateMinutes}m` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && !loading && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No attendance records for this month
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
