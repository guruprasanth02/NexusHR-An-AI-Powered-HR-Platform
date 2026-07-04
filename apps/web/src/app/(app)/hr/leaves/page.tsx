'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leavesApi } from '@/lib/api';
import { formatDate, getStatusColor, getLeaveTypeColor } from '@/lib/utils';
import { CheckCircle, XCircle, Brain, ChevronDown, ChevronUp, Clock } from 'lucide-react';
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
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    position?: string;
    department?: { name: string };
  };
}

interface AIRec {
  verdict: 'APPROVE' | 'REJECT' | 'REVIEW';
  score: number;
  reason: string;
  details: { attendanceScore: number; leaveBalanceOk: boolean; hasConflicts: boolean; recentLeaves: number; workload: string };
}

export default function HRLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiRecs, setAiRecs] = useState<Record<string, AIRec>>({});
  const [loadingAI, setLoadingAI] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');

  useEffect(() => {
    setLoading(true);
    leavesApi.all({ status: activeTab, limit: '30' }).then((res) => {
      setLeaves(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [activeTab]);

  const getAIRecommendation = async (leaveId: string) => {
    setLoadingAI((prev) => ({ ...prev, [leaveId]: true }));
    try {
      const res = await leavesApi.getRecommendation(leaveId);
      setAiRecs((prev) => ({ ...prev, [leaveId]: res.data.data }));
    } catch {
      toast.error('Failed to get AI recommendation');
    } finally {
      setLoadingAI((prev) => ({ ...prev, [leaveId]: false }));
    }
  };

  const handleAction = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await leavesApi.updateStatus(leaveId, { status, rejectionReason: status === 'REJECTED' ? rejectionReason : undefined });
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      toast.success(`Leave ${status === 'APPROVED' ? 'approved ✅' : 'rejected ❌'}`);
      setRejectionReason('');
      setExpanded(null);
    } catch {
      toast.error('Failed to update leave status');
    }
  };

  const verdictColor = (verdict: string) =>
    verdict === 'APPROVE' ? '#10b981' : verdict === 'REJECT' ? '#ef4444' : '#f59e0b';

  const verdictIcon = (verdict: string) =>
    verdict === 'APPROVE' ? '✅' : verdict === 'REJECT' ? '❌' : '⚠️';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Leave Approvals</h1>
        <p className="page-subtitle">Review and process employee leave requests with AI assistance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="text-xs font-600 px-4 py-2 rounded-xl whitespace-nowrap transition-smooth"
            style={{
              background: activeTab === tab ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
              color: activeTab === tab ? '#818cf8' : 'var(--text-muted)',
              border: `1px solid ${activeTab === tab ? 'rgba(99,102,241,0.3)' : 'var(--border-default)'}`,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : leaves.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--text-muted)' }}>No {activeTab.toLowerCase()} leaves</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaves.map((leave, i) => {
            const rec = aiRecs[leave.id];
            const isExpanded = expanded === leave.id;

            return (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card overflow-hidden"
              >
                {/* Main row */}
                <div className="p-5 flex items-start gap-4">
                  {/* Employee */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-700 text-white"
                    style={{ background: getLeaveTypeColor(leave.type) }}>
                    {leave.user.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-700 text-sm">{leave.user.name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{leave.user.position}</span>
                      {leave.user.department && (
                        <span className="badge text-[10px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                          {leave.user.department.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`badge ${getStatusColor(leave.status)}`}>{leave.type} LEAVE</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                      </span>
                      <span className="text-xs font-600" style={{ color: 'var(--text-primary)' }}>
                        {leave.days} day(s)
                      </span>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{leave.reason}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* AI Rec */}
                    {!rec && activeTab === 'PENDING' && (
                      <button
                        onClick={() => getAIRecommendation(leave.id)}
                        disabled={loadingAI[leave.id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-smooth"
                        style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}
                      >
                        <Brain size={12} />
                        {loadingAI[leave.id] ? 'Analyzing...' : 'AI Review'}
                      </button>
                    )}

                    {activeTab === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(leave.id, 'APPROVED')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-600 transition-smooth"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                        >
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : leave.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-600 transition-smooth"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          <XCircle size={12} /> Reject
                          {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* AI Recommendation Panel */}
                <AnimatePresence>
                  {rec && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t px-5 pb-4"
                      style={{ borderColor: 'var(--border-default)' }}
                    >
                      <div className="pt-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Brain size={16} style={{ color: '#a855f7' }} />
                          <span className="text-xs font-700 uppercase tracking-wider" style={{ color: '#a855f7' }}>AI Recommendation</span>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl text-center flex-shrink-0"
                            style={{ background: `${verdictColor(rec.verdict)}18`, border: `1px solid ${verdictColor(rec.verdict)}30`, minWidth: 80 }}>
                            <div className="text-2xl">{verdictIcon(rec.verdict)}</div>
                            <div className="text-xs font-700 mt-1" style={{ color: verdictColor(rec.verdict) }}>{rec.verdict}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Score: {rec.score}</div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{rec.reason}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <span>Attendance: <strong style={{ color: rec.details.attendanceScore >= 80 ? '#10b981' : '#f59e0b' }}>{rec.details.attendanceScore.toFixed(0)}%</strong></span>
                              <span>Balance OK: <strong style={{ color: rec.details.leaveBalanceOk ? '#10b981' : '#ef4444' }}>{rec.details.leaveBalanceOk ? 'Yes' : 'No'}</strong></span>
                              <span>Recent Leaves: <strong style={{ color: 'var(--text-primary)' }}>{rec.details.recentLeaves}</strong></span>
                              <span>Workload: <strong style={{ color: 'var(--text-primary)' }}>{rec.details.workload}</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rejection reason */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t px-5 pb-4"
                      style={{ borderColor: 'var(--border-default)' }}
                    >
                      <div className="pt-4">
                        <label className="text-xs font-600 block mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Rejection Reason (optional)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                          className="input-field resize-none text-sm mb-3"
                          placeholder="Provide a reason for rejection..."
                        />
                        <button
                          onClick={() => handleAction(leave.id, 'REJECTED')}
                          className="btn-primary text-sm"
                          style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
                        >
                          <XCircle size={14} /> Confirm Reject
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
