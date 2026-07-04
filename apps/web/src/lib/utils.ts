import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = 'MMM dd, yyyy') {
  return format(new Date(date), fmt);
}

export function formatTime(date: string | Date) {
  return format(new Date(date), 'hh:mm a');
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    PRESENT: 'text-emerald-400 bg-emerald-400/10',
    LATE: 'text-amber-400 bg-amber-400/10',
    ABSENT: 'text-red-400 bg-red-400/10',
    HALF_DAY: 'text-orange-400 bg-orange-400/10',
    ON_LEAVE: 'text-blue-400 bg-blue-400/10',
    HOLIDAY: 'text-purple-400 bg-purple-400/10',
    WEEKEND: 'text-slate-400 bg-slate-400/10',
    APPROVED: 'text-emerald-400 bg-emerald-400/10',
    REJECTED: 'text-red-400 bg-red-400/10',
    PENDING: 'text-amber-400 bg-amber-400/10',
    CANCELLED: 'text-slate-400 bg-slate-400/10',
    PAID: 'text-emerald-400 bg-emerald-400/10',
    PROCESSING: 'text-blue-400 bg-blue-400/10',
    OPEN: 'text-emerald-400 bg-emerald-400/10',
    CLOSED: 'text-red-400 bg-red-400/10',
    ON_HOLD: 'text-amber-400 bg-amber-400/10',
  };
  return colors[status] || 'text-slate-400 bg-slate-400/10';
}

export function getMoodEmoji(mood: string) {
  const emojis: Record<string, string> = {
    EXCELLENT: '🤩',
    GOOD: '😊',
    NEUTRAL: '😐',
    STRESSED: '😰',
    BURNOUT: '😩',
  };
  return emojis[mood] || '😐';
}

export function getMoodColor(mood: string) {
  const colors: Record<string, string> = {
    EXCELLENT: '#10b981',
    GOOD: '#6366f1',
    NEUTRAL: '#94a3b8',
    STRESSED: '#f59e0b',
    BURNOUT: '#ef4444',
  };
  return colors[mood] || '#94a3b8';
}

export function getLeaveTypeColor(type: string) {
  const colors: Record<string, string> = {
    CASUAL: '#6366f1',
    SICK: '#f43f5e',
    ANNUAL: '#10b981',
    MATERNITY: '#ec4899',
    PATERNITY: '#3b82f6',
    UNPAID: '#94a3b8',
    COMPENSATORY: '#f59e0b',
  };
  return colors[type] || '#6366f1';
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const LEAVE_TYPES = ['CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'COMPENSATORY'];
