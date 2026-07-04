'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { attendanceApi, usersApi } from '@/lib/api';
import { formatDate, formatTime, getStatusColor } from '@/lib/utils';
import { Search, Download } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  workHours?: number;
  lateMinutes?: number;
  user: { id: string; name: string; employeeId: string; department?: { name: string; color: string } };
}

export default function HRAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    setLoading(true);
    attendanceApi.overview({ date: selectedDate }).then((res) => {
      setRecords(res.data.data?.records || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedDate]);

  const filtered = records.filter((r) =>
    !search || r.user.name.toLowerCase().includes(search.toLowerCase()) ||
    r.user.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    present: filtered.filter((r) => r.status === 'PRESENT').length,
    late: filtered.filter((r) => r.status === 'LATE').length,
    absent: filtered.filter((r) => r.status === 'ABSENT').length,
    onLeave: filtered.filter((r) => r.status === 'ON_LEAVE').length,
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Attendance Overview</h1>
          <p className="page-subtitle">Monitor real-time team attendance</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Present', value: stats.present, color: '#10b981' },
          { label: 'Late', value: stats.late, color: '#f59e0b' },
          { label: 'Absent', value: stats.absent, color: '#ef4444' },
          { label: 'On Leave', value: stats.onLeave, color: '#6366f1' },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 text-center"
          >
            <div className="text-2xl font-800" style={{ color }}>{loading ? '—' : value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..." className="input-field pl-9 text-sm" />
        </div>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field text-sm w-auto" />
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
                {['Employee', 'Department', 'Status', 'Check In', 'Check Out', 'Hours', 'Late'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-600" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-3 px-4">
                      <div className="skeleton h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.map((rec, i) => (
                <motion.tr
                  key={rec.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ borderBottom: '1px solid var(--border-default)' }}
                  className="transition-smooth"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <td className="py-3 px-4">
                    <div className="font-600 text-sm" style={{ color: 'var(--text-primary)' }}>{rec.user.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>#{rec.user.employeeId?.slice(-6) || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    {rec.user.department ? (
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: rec.user.department.color }} />
                        {rec.user.department.name}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge text-[10px] ${getStatusColor(rec.status)}`}>{rec.status}</span>
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {rec.checkIn ? formatTime(rec.checkIn) : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {rec.checkOut ? formatTime(rec.checkOut) : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs font-600" style={{ color: 'var(--text-primary)' }}>
                    {rec.workHours ? `${rec.workHours}h` : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: rec.lateMinutes ? '#f59e0b' : 'var(--text-muted)' }}>
                    {rec.lateMinutes ? `${rec.lateMinutes}m` : '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No records found</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
