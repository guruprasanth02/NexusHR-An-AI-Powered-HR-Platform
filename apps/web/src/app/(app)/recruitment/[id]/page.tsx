'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { recruitmentApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, Brain, Star, Upload, Check, X, ChevronRight,
  MapPin, Clock, Users, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  aiScore?: number;
  aiSummary?: string;
  aiSkills: string[];
  aiStrengths: string[];
  aiWeaknesses: string[];
  status: string;
  appliedAt: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  skills: string[];
  location: string;
  type: string;
  salary?: string;
  status: string;
  department?: { name: string; color: string };
  candidates: Candidate[];
}

const STATUS_ORDER = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
const STATUS_COLORS: Record<string, string> = {
  APPLIED: '#94a3b8',
  SCREENING: '#f59e0b',
  INTERVIEW: '#6366f1',
  OFFER: '#10b981',
  HIRED: '#22c55e',
  REJECTED: '#ef4444',
};

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return null;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1 text-xs font-700" style={{ color }}>
      <Star size={10} fill={color} />
      {score}/100
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rescreening, setRescreening] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = () => {
    setLoading(true);
    recruitmentApi.getJob(jobId).then((res) => {
      setJob(res.data.data);
      if (res.data.data.candidates.length > 0) {
        setSelectedCandidate(res.data.data.candidates[0]);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  const handleAddCandidate = async () => {
    if (!addForm.name || !addForm.email) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('name', addForm.name);
      fd.append('email', addForm.email);
      if (addForm.phone) fd.append('phone', addForm.phone);
      await recruitmentApi.addCandidate(jobId, fd);
      toast.success('Candidate added!');
      setShowAddForm(false);
      setAddForm({ name: '', email: '', phone: '' });
      loadJob();
    } catch {
      toast.error('Failed to add candidate');
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (candidateId: string, status: string) => {
    try {
      await recruitmentApi.updateCandidateStatus(jobId, candidateId, status);
      loadJob();
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleRescreen = async (candidateId: string) => {
    setRescreening(candidateId);
    try {
      await recruitmentApi.screenCandidate(jobId, candidateId);
      loadJob();
      toast.success('AI screening complete!');
    } catch {
      toast.error('Screening failed');
    } finally {
      setRescreening(null);
    }
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>;
  }

  if (!job) return <div className="glass-card p-8 text-center" style={{ color: 'var(--text-muted)' }}>Job not found</div>;

  const sortedCandidates = [...job.candidates].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-start gap-4">
        <Link href="/recruitment" className="btn-ghost p-2 mt-1">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{job.title}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {job.department && (
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: job.department.color }} />
                {job.department.name}
              </span>
            )}
            <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{job.type}</span>
            <span className="flex items-center gap-1"><Users size={11} />{job.candidates.length} candidates</span>
          </div>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-sm">
          <Upload size={14} /> Add Candidate
        </button>
      </div>

      {/* Add Candidate Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6 mb-6 overflow-hidden"
          >
            <h3 className="font-700 mb-4 text-base">Add Candidate</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Full Name *" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} className="input-field text-sm" />
              <input type="email" placeholder="Email *" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} className="input-field text-sm" />
              <input type="tel" placeholder="Phone" value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} className="input-field text-sm" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleAddCandidate} disabled={uploading} className="btn-primary text-sm">
                {uploading ? 'Adding...' : 'Add & AI Screen'}
              </button>
              <button onClick={() => setShowAddForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Feature Banner */}
      <div className="mb-6 p-4 rounded-2xl flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.1))', border: '1px solid rgba(168,85,247,0.2)' }}>
        <Brain size={20} style={{ color: '#a855f7' }} />
        <div className="flex-1">
          <p className="text-sm font-600" style={{ color: '#c084fc' }}>AI-Powered Candidate Ranking</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Candidates are ranked by AI score. Click on any candidate to view detailed analysis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate List */}
        <div>
          <h2 className="font-700 mb-3 text-base">{sortedCandidates.length} Candidates</h2>
          <div className="space-y-3">
            {sortedCandidates.map((candidate, i) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedCandidate(candidate)}
                className="glass-card p-4 cursor-pointer"
                style={{
                  borderColor: selectedCandidate?.id === candidate.id ? 'rgba(99,102,241,0.4)' : 'var(--border-default)',
                  background: selectedCandidate?.id === candidate.id ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-800 flex-shrink-0"
                    style={{
                      background: i === 0 ? 'rgba(234,179,8,0.2)' : i === 1 ? 'rgba(148,163,184,0.15)' : 'var(--bg-card)',
                      color: i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : 'var(--text-muted)',
                    }}>
                    #{i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-700 text-sm">{candidate.name}</span>
                      <ScoreBadge score={candidate.aiScore} />
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{candidate.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-600"
                      style={{ background: `${STATUS_COLORS[candidate.status]}20`, color: STATUS_COLORS[candidate.status] }}>
                      {candidate.status}
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </motion.div>
            ))}

            {sortedCandidates.length === 0 && (
              <div className="glass-card py-12 text-center">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No candidates yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Candidate Detail */}
        <AnimatePresence mode="wait">
          {selectedCandidate && (
            <motion.div
              key={selectedCandidate.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-700 text-lg">{selectedCandidate.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedCandidate.email}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Applied {formatDate(selectedCandidate.appliedAt)}</p>
                </div>
                {selectedCandidate.aiScore && (
                  <div className="text-center">
                    <div className="text-4xl font-900"
                      style={{ color: selectedCandidate.aiScore >= 80 ? '#10b981' : selectedCandidate.aiScore >= 60 ? '#f59e0b' : '#ef4444' }}>
                      {selectedCandidate.aiScore}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>AI Score</div>
                  </div>
                )}
              </div>

              {selectedCandidate.aiSummary && (
                <div className="p-3 rounded-xl mb-4"
                  style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Brain size={13} style={{ color: '#a855f7' }} />
                    <span className="text-xs font-700" style={{ color: '#a855f7' }}>AI Analysis</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedCandidate.aiSummary}</p>
                </div>
              )}

              {selectedCandidate.aiSkills.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-700 mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Skills Detected</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidate.aiSkills.map((skill) => (
                      <span key={skill} className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedCandidate.aiStrengths.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-700 mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Strengths</h4>
                  {selectedCandidate.aiStrengths.map((s) => (
                    <div key={s} className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <Check size={11} style={{ color: '#10b981' }} /> {s}
                    </div>
                  ))}
                </div>
              )}

              {selectedCandidate.aiWeaknesses.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-700 mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Areas of Concern</h4>
                  {selectedCandidate.aiWeaknesses.map((w) => (
                    <div key={w} className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <X size={11} style={{ color: '#ef4444' }} /> {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Status actions */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-700 mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Update Status</h4>
                <div className="flex flex-wrap gap-2">
                  {STATUS_ORDER.filter((s) => s !== selectedCandidate.status).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedCandidate.id, status)}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg font-600 transition-smooth"
                      style={{ background: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}40` }}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleRescreen(selectedCandidate.id)}
                  disabled={rescreening === selectedCandidate.id}
                  className="mt-3 btn-secondary text-xs flex items-center gap-2"
                >
                  <RefreshCw size={12} className={rescreening === selectedCandidate.id ? 'animate-spin' : ''} />
                  {rescreening === selectedCandidate.id ? 'Screening...' : 'Re-run AI Screen'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
