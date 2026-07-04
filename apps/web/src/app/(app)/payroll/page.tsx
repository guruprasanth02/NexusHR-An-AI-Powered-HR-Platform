'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { payrollApi } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, MONTHS } from '@/lib/utils';
import { DollarSign, TrendingUp, FileText, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface Payroll {
  id: string;
  month: number;
  year: number;
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  pf: number;
  tax: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  status: string;
  creditedAt?: string;
}

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selected, setSelected] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    payrollApi.myPayslips().then((res) => {
      setPayrolls(res.data.data);
      if (res.data.data.length > 0) setSelected(res.data.data[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const chartData = payrolls.slice().reverse().map((p) => ({
    month: MONTHS[p.month - 1].slice(0, 3),
    net: p.netSalary,
    deductions: p.deductions,
  }));

  const totalEarned = payrolls.reduce((s, p) => s + p.netSalary, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payroll</h1>
        <p className="page-subtitle">View your salary slips and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Latest Net Salary', value: selected ? formatCurrency(selected.netSalary) : '—', icon: DollarSign, color: '#10b981' },
          { label: 'Total Earned (YTD)', value: formatCurrency(totalEarned), icon: TrendingUp, color: '#6366f1' },
          { label: 'Total Payslips', value: payrolls.length.toString(), icon: FileText, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${color}18` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div className="text-2xl font-800" style={{ color: 'var(--text-primary)' }}>{loading ? '—' : value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salary Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <h2 className="font-700 mb-4 text-base">Salary Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={24} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '12px' }}
                formatter={((value: any) => [formatCurrency(Number(value))]) as any}
              />
              <Bar dataKey="net" fill="#6366f1" radius={[6, 6, 0, 0]} name="Net Salary" />
              <Bar dataKey="deductions" fill="#ef4444" radius={[6, 6, 0, 0]} name="Deductions" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Payslip List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <h2 className="font-700 mb-4 text-base">Payslips</h2>
          <div className="space-y-2">
            {payrolls.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-smooth"
                style={{
                  background: selected?.id === p.id ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
                  border: `1px solid ${selected?.id === p.id ? 'rgba(99,102,241,0.3)' : 'var(--border-default)'}`,
                }}
              >
                <div>
                  <p className="text-sm font-600" style={{ color: 'var(--text-primary)' }}>
                    {MONTHS[p.month - 1]} {p.year}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(p.netSalary)}
                  </p>
                </div>
                <span className={`badge ${getStatusColor(p.status)}`}>{p.status}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Payslip Detail */}
      {selected && (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mt-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-700 text-lg">Payslip — {MONTHS[selected.month - 1]} {selected.year}</h2>
              {selected.creditedAt && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Credited on {formatDate(selected.creditedAt)}
                </p>
              )}
            </div>
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={14} /> Download PDF
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Earnings */}
            <div>
              <h3 className="text-xs font-700 uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>EARNINGS</h3>
              {[
                { label: 'Basic Salary', value: selected.basic },
                { label: 'HRA', value: selected.hra },
                { label: 'Allowances', value: selected.allowances },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-sm font-600" style={{ color: '#10b981' }}>{formatCurrency(value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2.5 mt-1">
                <span className="text-sm font-700">Gross</span>
                <span className="text-sm font-700" style={{ color: '#10b981' }}>
                  {formatCurrency(selected.basic + selected.hra + selected.allowances)}
                </span>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="text-xs font-700 uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>DEDUCTIONS</h3>
              {[
                { label: 'Provident Fund (PF)', value: selected.pf },
                { label: 'Income Tax (TDS)', value: selected.tax },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-sm font-600" style={{ color: '#ef4444' }}>{formatCurrency(value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2.5 mt-1">
                <span className="text-sm font-700">Total Deductions</span>
                <span className="text-sm font-700" style={{ color: '#ef4444' }}>{formatCurrency(selected.deductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="mt-6 p-4 rounded-2xl flex items-center justify-between"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span className="font-700 text-base">Net Salary</span>
            <span className="text-3xl font-900" style={{ color: '#10b981' }}>{formatCurrency(selected.netSalary)}</span>
          </div>

          <div className="flex gap-6 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Working Days: <strong style={{ color: 'var(--text-primary)' }}>{selected.workingDays}</strong></span>
            <span>Present Days: <strong style={{ color: 'var(--text-primary)' }}>{selected.presentDays}</strong></span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
