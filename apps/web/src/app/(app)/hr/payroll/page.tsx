'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { payrollApi } from '@/lib/api';
import { formatCurrency, getStatusColor, MONTHS } from '@/lib/utils';
import { DollarSign, Play, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Payroll {
  id: string;
  month: number;
  year: number;
  netSalary: number;
  basic: number;
  status: string;
  user: { id: string; name: string; department?: { name: string } };
}

export default function HRPayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());

  const load = () => {
    setLoading(true);
    payrollApi.allPayrolls({ limit: '50' }).then((res) => {
      setPayrolls(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await payrollApi.generate({ month: genMonth, year: genYear });
      toast.success(`Payroll generated for ${MONTHS[genMonth - 1]} ${genYear}`);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const paidCount = payrolls.filter((p) => p.status === 'PAID').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payroll Management</h1>
        <p className="page-subtitle">Generate and manage employee payroll</p>
      </div>

      {/* Generate Payroll Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="gradient-bg rounded-xl w-10 h-10 flex items-center justify-center">
            <Play size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-700 text-base">Generate Payroll</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Automatically calculate salaries based on attendance</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={genMonth}
            onChange={(e) => setGenMonth(parseInt(e.target.value))}
            className="input-field text-sm w-auto"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={genYear}
            onChange={(e) => setGenYear(parseInt(e.target.value))}
            className="input-field text-sm w-28"
            min={2020} max={2030}
          />
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            <Play size={14} /> {generating ? 'Generating...' : `Generate ${MONTHS[genMonth - 1]} ${genYear}`}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: '#f59e0b' }}>
          <AlertCircle size={12} /> Existing payroll for the same month/year will be overwritten.
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Payroll Records', value: payrolls.length, color: '#6366f1', icon: DollarSign },
          { label: 'Paid This Month', value: paidCount, color: '#10b981', icon: DollarSign },
          { label: 'Total Paid (All)', value: formatCurrency(totalNet), color: '#f59e0b', icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="text-2xl font-800" style={{ color: 'var(--text-primary)' }}>{loading ? '—' : value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Payroll Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h2 className="font-700 text-base">Payroll Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
                {['Employee', 'Department', 'Month', 'Basic', 'Net Salary', 'Status'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-600" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3 px-4"><div className="skeleton h-5 w-full" /></td></tr>
                ))
              ) : payrolls.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ borderBottom: '1px solid var(--border-default)' }}
                  className="transition-smooth"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <td className="py-3 px-4 font-600" style={{ color: 'var(--text-primary)' }}>{p.user.name}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {p.user.department?.name || '—'}
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {MONTHS[p.month - 1]} {p.year}
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(p.basic)}
                  </td>
                  <td className="py-3 px-4 font-700" style={{ color: '#10b981' }}>
                    {formatCurrency(p.netSalary)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge text-[10px] ${getStatusColor(p.status)}`}>{p.status}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {payrolls.length === 0 && !loading && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No payroll records. Generate payroll for the current month.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
