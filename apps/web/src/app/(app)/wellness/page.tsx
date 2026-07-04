'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { moodApi } from '@/lib/api';
import { getMoodEmoji, getMoodColor, formatDate } from '@/lib/utils';
import { Heart, TrendingUp, AlertTriangle, Flame } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';

const MOODS = [
  { value: 'EXCELLENT', emoji: '🤩', label: 'Excellent', desc: 'Feeling amazing!' },
  { value: 'GOOD', emoji: '😊', label: 'Good', desc: 'Pretty good day' },
  { value: 'NEUTRAL', emoji: '😐', label: 'Neutral', desc: 'Just another day' },
  { value: 'STRESSED', emoji: '😰', label: 'Stressed', desc: 'Under pressure' },
  { value: 'BURNOUT', emoji: '😩', label: 'Burnout', desc: 'Completely drained' },
];

interface MoodEntry {
  date: string;
  mood: string;
  energyLevel: number;
  stressLevel: number;
  burnoutScore: number;
  note?: string;
}

export default function WellnessPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [stats, setStats] = useState({ avgBurnout: 0, moodCounts: {} as Record<string, number>, totalEntries: 0 });
  const [selectedMood, setSelectedMood] = useState('GOOD');
  const [energy, setEnergy] = useState(7);
  const [stress, setStress] = useState(3);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    moodApi.myMoods({ days: 30 }).then((res) => {
      setEntries(res.data.data);
      setTodayEntry(res.data.todayEntry);
      setStats(res.data.stats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await moodApi.submit({ mood: selectedMood, energyLevel: energy, stressLevel: stress, note });
      setTodayEntry(res.data.data);
      toast.success('Mood logged! 💪');
    } catch {
      toast.error('Failed to log mood');
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = entries.map((e) => ({
    date: formatDate(e.date, 'MMM dd'),
    burnout: e.burnoutScore,
    energy: e.energyLevel * 10,
    stress: e.stressLevel * 10,
  }));

  const burnoutLevel = stats.avgBurnout;
  const burnoutLabel = burnoutLevel < 20 ? 'Excellent' : burnoutLevel < 40 ? 'Good' : burnoutLevel < 60 ? 'Moderate' : burnoutLevel < 80 ? 'High Risk' : 'Critical';
  const burnoutColor = burnoutLevel < 20 ? '#10b981' : burnoutLevel < 40 ? '#6366f1' : burnoutLevel < 60 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Employee Wellness</h1>
        <p className="page-subtitle">Track your mood, energy, and wellbeing</p>
      </div>

      {/* Burnout Score */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 text-center"
        >
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-3">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border-default)" strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40" fill="none"
                stroke={burnoutColor} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - burnoutLevel / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-xl font-900" style={{ color: burnoutColor }}>{Math.round(burnoutLevel)}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/ 100</div>
            </div>
          </div>
          <div className="font-700 text-sm mb-0.5" style={{ color: burnoutColor }}>Burnout Risk: {burnoutLabel}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>30-day average</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 flex flex-col justify-center"
        >
          <div className="flex items-center gap-3 mb-3">
            <Heart size={20} style={{ color: '#ec4899' }} />
            <span className="font-700 text-sm">Engagement Score</span>
          </div>
          <div className="text-4xl font-900 gradient-text">{Math.round(100 - burnoutLevel)}%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Higher is better</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 flex flex-col justify-center"
        >
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp size={20} style={{ color: '#6366f1' }} />
            <span className="font-700 text-sm">Mood Entries</span>
          </div>
          <div className="text-4xl font-900" style={{ color: 'var(--text-primary)' }}>{stats.totalEntries}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Last 30 days</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Mood Check-in */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <h2 className="font-700 mb-2 text-base">Daily Mood Check-in</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            {todayEntry ? "Today's mood already logged. Update it below." : "How are you feeling today?"}
          </p>

          {/* Mood selector */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {MOODS.map(({ value, emoji, label }) => (
              <motion.button
                key={value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedMood(value)}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl transition-smooth"
                style={{
                  background: selectedMood === value ? `${getMoodColor(value)}20` : 'var(--bg-card)',
                  border: `2px solid ${selectedMood === value ? getMoodColor(value) : 'var(--border-default)'}`,
                  minWidth: 60,
                }}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-[10px] font-600" style={{ color: selectedMood === value ? getMoodColor(value) : 'var(--text-muted)' }}>
                  {label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Sliders */}
          {[
            { label: 'Energy Level', value: energy, onChange: setEnergy, color: '#10b981', icon: Flame },
            { label: 'Stress Level', value: stress, onChange: setStress, color: '#ef4444', icon: AlertTriangle },
          ].map(({ label, value, onChange, color, icon: Icon }) => (
            <div key={label} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-500" style={{ color: 'var(--text-secondary)' }}>
                  <Icon size={14} style={{ color }} /> {label}
                </div>
                <span className="text-sm font-700" style={{ color }}>{value}/10</span>
              </div>
              <input
                type="range" min={1} max={10}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: color }}
              />
            </div>
          ))}

          {/* Note */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="input-field resize-none mb-4 text-sm"
            placeholder="Optional: Add a note about your day..."
          />

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Saving...' : todayEntry ? '✅ Update Mood' : `${getMoodEmoji(selectedMood)} Log Mood`}
          </button>

          {todayEntry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 p-3 rounded-xl text-sm text-center"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
            >
              Today: {getMoodEmoji(todayEntry.mood)} {todayEntry.mood}
            </motion.div>
          )}
        </motion.div>

        {/* Mood Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="font-700 mb-4 text-base">Wellness Trend — Last 30 Days</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '10px', fontSize: '11px', color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="burnout" stroke="#ef4444" strokeWidth={2} dot={false} name="Burnout Risk" />
                <Line type="monotone" dataKey="energy" stroke="#10b981" strokeWidth={2} dot={false} name="Energy %" />
                <Line type="monotone" dataKey="stress" stroke="#f59e0b" strokeWidth={2} dot={false} name="Stress %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Start logging your mood to see trends
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            {[{ label: 'Burnout Risk', color: '#ef4444' }, { label: 'Energy', color: '#10b981' }, { label: 'Stress', color: '#f59e0b' }].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
