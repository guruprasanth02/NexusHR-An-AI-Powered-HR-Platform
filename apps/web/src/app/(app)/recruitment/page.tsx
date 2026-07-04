'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { recruitmentApi } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Briefcase, MapPin, Clock, Users, Plus, ChevronRight, Brain, Star } from 'lucide-react';

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
  createdAt: string;
  department?: { name: string; color: string };
  _count: { candidates: number };
}

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OPEN');

  useEffect(() => {
    setLoading(true);
    recruitmentApi.listJobs({ status: activeTab }).then((res) => {
      setJobs(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Recruitment</h1>
          <p className="page-subtitle">AI-powered candidate screening and hiring pipeline</p>
        </div>
        <Link href="/recruitment/new" className="btn-primary">
          <Plus size={15} /> Post Job
        </Link>
      </div>

      {/* AI Feature Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 rounded-2xl flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <div className="gradient-bg rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <p className="font-700 text-sm gradient-text">AI Resume Screening Active</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Upload candidate resumes to get instant AI-powered scores, skills extraction, and ranking
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['OPEN', 'ON_HOLD', 'CLOSED'].map((tab) => (
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
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No {activeTab.toLowerCase()} positions</p>
          <Link href="/recruitment/new" className="btn-primary inline-flex">Post a Job</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/recruitment/${job.id}`}>
                <div className="glass-card p-6 h-full cursor-pointer">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-700 text-base mb-1" style={{ color: 'var(--text-primary)' }}>{job.title}</h3>
                      {job.department && (
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: job.department.color }} />
                          {job.department.name}
                        </span>
                      )}
                    </div>
                    <span className={`badge ${getStatusColor(job.status)}`}>{job.status}</span>
                  </div>

                  <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {job.description}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-3 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{job.type}</span>
                    {job.salary && <span className="flex items-center gap-1">💰 {job.salary}</span>}
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {job.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full font-500"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 4 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)' }}>
                        +{job.skills.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Users size={12} />
                      <strong style={{ color: 'var(--text-primary)' }}>{job._count.candidates}</strong> candidates
                    </span>
                    <div className="flex items-center gap-1 text-xs font-600" style={{ color: '#818cf8' }}>
                      View Pipeline <ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
