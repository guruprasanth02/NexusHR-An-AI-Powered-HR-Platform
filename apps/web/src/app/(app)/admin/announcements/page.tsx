'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { announcementsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Megaphone, Plus, X, Pin, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    title: string;
    content: string;
  }>();

  const load = () => {
    setLoading(true);
    announcementsApi.list()
      .then((res) => setAnnouncements(res.data.data || []))
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: { title: string; content: string }) => {
    setCreating(true);
    try {
      await announcementsApi.create({ ...data, isPinned });
      toast.success('Announcement posted! 📢');
      reset();
      setIsPinned(false);
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create announcement');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await announcementsApi.delete(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success('Announcement removed');
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const pinned = announcements.filter((a) => a.isPinned);
  const regular = announcements.filter((a) => !a.isPinned);

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Megaphone size={28} style={{ color: '#f59e0b' }} />
            Announcements
          </h1>
          <p className="page-subtitle">Broadcast important updates to the entire organization</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} /> New Announcement
        </motion.button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="glass-card p-6 mb-6"
            style={{ border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-700 text-base flex items-center gap-2">
                <Send size={18} style={{ color: '#f59e0b' }} />
                Compose Announcement
              </h2>
              <button onClick={() => { setShowForm(false); reset(); }} className="btn-ghost p-1.5">
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Title *
                </label>
                <input
                  type="text"
                  {...register('title', { required: 'Title is required' })}
                  className="input-field"
                  placeholder="e.g. 🎉 Q2 All-Hands Meeting — July 15th"
                />
                {errors.title && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Content *
                </label>
                <textarea
                  {...register('content', { required: 'Content is required' })}
                  className="input-field resize-none"
                  rows={4}
                  placeholder="Write your announcement here..."
                />
                {errors.content && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.content.message}</p>}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setIsPinned(!isPinned)}
                    className="w-10 h-5 rounded-full transition-smooth relative flex-shrink-0"
                    style={{ background: isPinned ? '#f59e0b' : 'var(--bg-elevated)', border: '2px solid var(--border-strong)' }}
                  >
                    <div
                      className="absolute top-0 w-4 h-4 rounded-full transition-smooth"
                      style={{
                        background: 'white',
                        top: '0px',
                        left: isPinned ? '18px' : '1px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                  <span className="text-sm font-500 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Pin size={14} style={{ color: isPinned ? '#f59e0b' : 'var(--text-muted)' }} />
                    Pin to top
                  </span>
                </label>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary">
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={creating}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Send size={14} />
                  {creating ? 'Publishing...' : 'Publish'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-700 uppercase tracking-wider mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}>
            <Pin size={12} /> Pinned
          </p>
          <div className="space-y-3">
            {pinned.map((ann, i) => (
              <AnnouncementCard key={ann.id} ann={ann} index={i} pinned onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* All */}
      <div>
        {regular.length > 0 && (
          <p className="text-xs font-700 uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Recent
          </p>
        )}
        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="glass-card h-24 animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-16 text-center"
          >
            <Megaphone size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="font-600 mb-1" style={{ color: 'var(--text-primary)' }}>No announcements yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Post your first announcement to keep the team informed
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="btn-primary mx-auto flex items-center gap-2"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} /> Create Announcement
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {regular.map((ann, i) => (
              <AnnouncementCard key={ann.id} ann={ann} index={i} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({
  ann, index, pinned, onDelete,
}: {
  ann: Announcement;
  index: number;
  pinned?: boolean;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    await onDelete(ann.id);
    setDeleting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass-card p-5"
      style={pinned ? { border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' } : {}}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: pinned ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.1)' }}>
          {pinned ? (
            <Pin size={18} style={{ color: '#f59e0b' }} />
          ) : (
            <Megaphone size={18} style={{ color: '#6366f1' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-700 text-sm" style={{ color: 'var(--text-primary)' }}>{ann.title}</h3>
            {ann.isPinned && (
              <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                PINNED
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed"
            style={{
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: expanded ? 'unset' : 2,
            }}>
            {ann.content}
          </p>

          {ann.content.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-600 mt-1"
              style={{ color: 'var(--text-brand)' }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}

          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {formatDate(ann.createdAt, 'MMM d, yyyy · h:mm a')}
          </p>
        </div>

        <button
          onClick={doDelete}
          disabled={deleting}
          className="btn-ghost p-2 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:!opacity-100"
          title="Delete announcement"
          style={{ color: '#ef4444' }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.div>
  );
}
