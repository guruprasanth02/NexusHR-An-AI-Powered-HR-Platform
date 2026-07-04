'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { Building2, Plus, X, Users, Edit2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;
  _count?: { users: number };
}

const COLORS = [
  '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    name: string;
    description?: string;
  }>();

  const loadDepartments = () => {
    setLoading(true);
    usersApi.departments()
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => toast.error('Failed to load departments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDepartments(); }, []);

  const onSubmit = async (data: { name: string; description?: string }) => {
    setCreating(true);
    try {
      await usersApi.createDepartment({ ...data, color: selectedColor });
      toast.success('Department created! 🏢');
      reset();
      setShowForm(false);
      setSelectedColor(COLORS[0]);
      loadDepartments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Building2 size={28} style={{ color: '#a855f7' }} />
            Departments
          </h1>
          <p className="page-subtitle">Manage organizational structure and teams</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} /> New Department
        </motion.button>
      </div>

      {/* Create Department Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-700 text-base">Create New Department</h2>
              <button
                onClick={() => { setShowForm(false); reset(); }}
                className="btn-ghost p-1.5"
              >
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Department Name *
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="input-field"
                    placeholder="e.g. Engineering"
                  />
                  {errors.name && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    {...register('description')}
                    className="input-field"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-600 mb-2" style={{ color: 'var(--text-primary)' }}>
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="w-8 h-8 rounded-lg transition-smooth flex items-center justify-center"
                      style={{
                        background: color,
                        transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: selectedColor === color ? `0 0 0 3px ${color}40` : 'none',
                      }}
                    >
                      {selectedColor === color && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); reset(); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={creating}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="btn-primary"
                >
                  {creating ? 'Creating...' : 'Create Department'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Departments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="glass-card h-36 animate-pulse" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-16 text-center"
        >
          <Building2 size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="font-600 mb-1" style={{ color: 'var(--text-primary)' }}>No departments yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create your first department to organize your workforce</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-6 hover:border-opacity-60 group"
              style={{ borderLeft: `4px solid ${dept.color}` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `${dept.color}18` }}>
                  <Building2 size={22} style={{ color: dept.color }} />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: `${dept.color}12`, border: `1px solid ${dept.color}25` }}>
                  <Users size={12} style={{ color: dept.color }} />
                  <span className="text-xs font-700" style={{ color: dept.color }}>
                    {dept._count?.users ?? 0} members
                  </span>
                </div>
              </div>

              <h3 className="font-700 text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                {dept.name}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {dept.description || 'No description provided'}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
