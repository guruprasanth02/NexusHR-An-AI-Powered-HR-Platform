'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leavesApi } from '@/lib/api';
import { LEAVE_TYPES } from '@/lib/utils';
import { ArrowLeft, Calendar, Send, Info } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const leaveSchema = z.object({
  type: z.enum(['CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'COMPENSATORY']),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  reason: z.string().min(10, 'Please provide at least 10 characters').max(500),
});

type LeaveForm = z.infer<typeof leaveSchema>;

const LEAVE_INFO: Record<string, { emoji: string; description: string; days: number }> = {
  CASUAL: { emoji: '☀️', description: 'For personal or family errands', days: 12 },
  SICK: { emoji: '🤒', description: 'For illness or medical appointments', days: 12 },
  ANNUAL: { emoji: '✈️', description: 'Planned vacation and rest', days: 15 },
  MATERNITY: { emoji: '👶', description: 'For new mothers', days: 90 },
  PATERNITY: { emoji: '👨‍👧', description: 'For new fathers', days: 15 },
  UNPAID: { emoji: '📋', description: 'Leave without pay', days: 0 },
  COMPENSATORY: { emoji: '⚖️', description: 'Compensation for extra work', days: 0 },
};

export default function ApplyLeavePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('CASUAL');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LeaveForm>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { type: 'CASUAL' },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const days = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const onSubmit = async (data: LeaveForm) => {
    setLoading(true);
    try {
      await leavesApi.apply(data);
      toast.success('Leave request submitted successfully!');
      router.push('/leaves');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to apply');
    } finally {
      setLoading(false);
    }
  };

  const info = LEAVE_INFO[selectedType];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header flex items-center gap-4">
        <Link href="/leaves" className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="page-title">Apply for Leave</h1>
          <p className="page-subtitle">Submit a new leave request</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-600 mb-3" style={{ color: 'var(--text-primary)' }}>
              Leave Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LEAVE_TYPES.map((type) => {
                const i = LEAVE_INFO[type];
                const isSelected = selectedType === type;
                return (
                  <label
                    key={type}
                    className="cursor-pointer"
                    onClick={() => setSelectedType(type)}
                  >
                    <input type="radio" value={type} {...register('type')} className="sr-only" />
                    <div
                      className="p-3 rounded-xl text-center transition-smooth border"
                      style={{
                        background: isSelected ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
                        borderColor: isSelected ? 'rgba(99,102,241,0.4)' : 'var(--border-default)',
                      }}
                    >
                      <div className="text-xl mb-1">{i.emoji}</div>
                      <div className="text-xs font-600" style={{ color: isSelected ? '#818cf8' : 'var(--text-secondary)' }}>
                        {type}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Info banner */}
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Info size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#818cf8' }}>{info.emoji} {selectedType}</strong>: {info.description}
                {info.days > 0 && ` (${info.days} days/year)`}
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-600 mb-2" style={{ color: 'var(--text-primary)' }}>
                Start Date
              </label>
              <input
                type="date"
                {...register('startDate')}
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.startDate && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-600 mb-2" style={{ color: 'var(--text-primary)' }}>
                End Date
              </label>
              <input
                type="date"
                {...register('endDate')}
                className="input-field"
                min={startDate || new Date().toISOString().split('T')[0]}
              />
              {errors.endDate && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Duration preview */}
          {days > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <Calendar size={14} style={{ color: '#10b981' }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                Duration: <strong style={{ color: '#10b981' }}>{days} day{days > 1 ? 's' : ''}</strong>
                {days > info.days && info.days > 0 && (
                  <span style={{ color: '#f59e0b' }}> (exceeds {info.days} day limit)</span>
                )}
              </span>
            </motion.div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-600 mb-2" style={{ color: 'var(--text-primary)' }}>
              Reason
            </label>
            <textarea
              {...register('reason')}
              rows={4}
              className="input-field resize-none"
              placeholder="Describe the reason for your leave request..."
            />
            {errors.reason && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.reason.message}</p>}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Link href="/leaves" className="btn-secondary flex-1 text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              <Send size={15} />
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
