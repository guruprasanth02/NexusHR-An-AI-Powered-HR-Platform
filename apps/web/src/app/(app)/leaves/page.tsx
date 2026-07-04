'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { leavesApi } from '@/lib/api';
import { formatDate, getLeaveTypeColor, getStatusColor, LEAVE_TYPES } from '@/lib/utils';
import { Plus, Calendar, CheckCircle, XCircle, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Leave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  createdAt: string;
  approvedBy?: { name: string };
}

interface LeaveBalance {
  casual: number; usedCasual: number;
  sick: number; usedSick: number;
  annual: number; usedAnnual: number;
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    leavesApi.myLeaves().then((res) => {
      setLeaves(res.data.data);
      setBalance(res.data.balance);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: string) => {
    try {
      await leavesApi.cancel(id);
      setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: 'CANCELLED' } : l));
      toast.success('Leave cancelled');
    } catch {
      toast.error('Failed to cancel leave');
    }
  };

  const filtered = activeTab === 'ALL' ? leaves : leaves.filter((l) => l.status === activeTab);

  const balanceItems = [
    { label: 'Casual', total: balance?.casual || 12, used: balance?.usedCasual || 0, color: '#6366f1' },
    { label: 'Sick', total: balance?.sick || 12, used: balance?.usedSick || 0, color: '#ef4444' },
    { label: 'Annual', total: balance?.annual || 15, used: balance?.usedAnnual || 0, color: '#10b981' },
  ];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Manage and track your leave requests</p>
        </div>
        <Link href="/leaves/apply" className="btn-primary">
          <Plus size={16} /> Apply Leave
        </Link>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {balanceItems.map(({ label, total, used, color }, i) => {
          const remaining = total - used;
          const pct = (used / total) * 100;
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-600 text-sm">{label} Leave</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-500" style={{ background: `${color}18`, color }}>
                  {remaining} left
                </span>
              </div>
              <div className="text-3xl font-900 mb-1" style={{ color }}>
                {remaining}
                <span className="text-sm font-400 ml-1" style={{ color: 'var(--text-muted)' }}>/ {total} days</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden mt-3" style={{ background: 'var(--border-default)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{used} used this year</p>
            </motion.div>
          );
        })}
      </div>

      {/* Leave List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card"
      >
        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b overflow-x-auto" style={{ borderColor: 'var(--border-default)' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="text-xs font-600 px-3 py-1.5 rounded-lg whitespace-nowrap transition-smooth"
              style={{
                background: activeTab === tab ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: activeTab === tab ? '#818cf8' : 'var(--text-muted)',
                border: activeTab === tab ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
              }}
            >
              {tab}
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-card)' }}>
                {tab === 'ALL' ? leaves.length : leaves.filter((l) => l.status === tab).length}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No leave requests found</p>
              <Link href="/leaves/apply" className="btn-primary mt-4 inline-flex">
                Apply Leave
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((leave, i) => (
                <motion.div
                  key={leave.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-4 p-4 rounded-xl transition-smooth"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                  {/* Type indicator */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: `${getLeaveTypeColor(leave.type)}18` }}>
                    {leave.type === 'SICK' ? '🤒' : leave.type === 'CASUAL' ? '☀️' : leave.type === 'ANNUAL' ? '✈️' : '📋'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-700 text-sm" style={{ color: 'var(--text-primary)' }}>{leave.type} Leave</span>
                      <span className={`badge ${getStatusColor(leave.status)}`}>{leave.status}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(leave.startDate)} — {formatDate(leave.endDate)} · <strong>{leave.days} day(s)</strong>
                    </p>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{leave.reason}</p>
                    {leave.approvedBy && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {leave.status === 'APPROVED' ? <CheckCircle size={10} className="inline mr-1 text-emerald-400" /> : <XCircle size={10} className="inline mr-1 text-red-400" />}
                        By {leave.approvedBy.name}
                      </p>
                    )}
                  </div>

                  {leave.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(leave.id)}
                      className="btn-ghost p-2 flex-shrink-0"
                      title="Cancel"
                    >
                      <X size={15} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
