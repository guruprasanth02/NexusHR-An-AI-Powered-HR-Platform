'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { getInitials, formatDate, getStatusColor } from '@/lib/utils';
import { Search, Users, Mail, Phone, Building2, Plus } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  position?: string;
  phone?: string;
  avatar?: string;
  joinDate: string;
  isVerified: boolean;
  isActive: boolean;
  department?: { id: string; name: string; color: string };
}

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      usersApi.list({ search, limit: '30' }).then((res) => {
        setEmployees(res.data.data);
        setTotal(res.data.meta.total);
      }).catch(() => {}).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{total} team members</p>
        </div>
        <button className="btn-primary">
          <Plus size={15} /> Add Employee
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card p-5"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                {emp.avatar ? (
                  <img src={emp.avatar} alt={emp.name} className="avatar" style={{ width: 48, height: 48 }} />
                ) : (
                  <div className="avatar text-sm" style={{ width: 48, height: 48 }}>
                    {getInitials(emp.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-700 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{emp.name}</h3>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{emp.position || emp.role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge text-[10px] ${getStatusColor(emp.isActive ? 'PRESENT' : 'ABSENT')}`}>
                      {emp.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <span className="badge text-[10px]" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                      {emp.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <Mail size={12} />
                  <span className="truncate">{emp.email}</span>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Phone size={12} />
                    <span>{emp.phone}</span>
                  </div>
                )}
                {emp.department && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Building2 size={12} />
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: emp.department.color }} />
                      {emp.department.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Joined {formatDate(emp.joinDate, 'MMM yyyy')}
                </span>
                <span className="text-xs font-500" style={{ color: 'var(--text-muted)' }}>#{emp.employeeId?.slice(-6) || '—'}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {employees.length === 0 && !loading && (
        <div className="glass-card py-16 text-center">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--text-muted)' }}>No employees found</p>
        </div>
      )}
    </div>
  );
}
