'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/store';
import { usersApi } from '@/lib/api';
import { getInitials, formatDate } from '@/lib/utils';
import { User, Mail, Phone, MapPin, Save, Lock, Calendar, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const { register: reg1, handleSubmit: hs1 } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: '',
      address: '',
      bio: '',
    },
  });

  const { register: reg2, handleSubmit: hs2 } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const saveProfile = async (data: Record<string, string>) => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await usersApi.update(user.id, data);
      updateUser(res.data.data);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (data: Record<string, string>) => {
    if (!user) return;
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await usersApi.changePassword(user.id, { currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed!');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your personal information and account settings</p>
      </div>

      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center gap-6">
          <div className="relative">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar" style={{ width: 80, height: 80, fontSize: 24 }} />
            ) : (
              <div className="avatar text-2xl font-900" style={{ width: 80, height: 80 }}>
                {getInitials(user?.name || 'U')}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 status-dot online"
              style={{ borderColor: 'var(--bg-elevated)' }} />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-900" style={{ color: 'var(--text-primary)' }}>{user?.name}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.position || user?.role}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><Mail size={11} />{user?.email}</span>
              {user?.department && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: user.department.color }} />
                  {user.department.name}
                </span>
              )}
              <span className="flex items-center gap-1"><Briefcase size={11} />#{user?.employeeId?.slice(-8)}</span>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Account Status</div>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              ✓ Verified
            </span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'profile', label: 'Profile Info', icon: User },
          { key: 'security', label: 'Security', icon: Lock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 transition-smooth"
            style={{
              background: activeTab === key ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
              color: activeTab === key ? '#818cf8' : 'var(--text-muted)',
              border: `1px solid ${activeTab === key ? 'rgba(99,102,241,0.3)' : 'var(--border-default)'}`,
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-700 mb-6 text-base">Personal Information</h3>
          <form onSubmit={hs1(saveProfile)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Full Name</label>
                <input {...reg1('name')} className="input-field" placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Phone</label>
                <input {...reg1('phone')} className="input-field" placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Address</label>
                <input {...reg1('address')} className="input-field" placeholder="City, State" />
              </div>
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Email</label>
                <input type="email" value={user?.email || ''} disabled className="input-field opacity-60 cursor-not-allowed" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Bio</label>
              <textarea {...reg1('bio')} rows={3} className="input-field resize-none" placeholder="Tell us a bit about yourself..." />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </motion.div>
      )}

      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-700 mb-6 text-base">Change Password</h3>
          <form onSubmit={hs2(changePassword)} className="space-y-4 max-w-sm">
            {[
              { name: 'currentPassword', label: 'Current Password' },
              { name: 'newPassword', label: 'New Password' },
              { name: 'confirmPassword', label: 'Confirm New Password' },
            ].map(({ name, label }) => (
              <div key={name}>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</label>
                <input type="password" {...reg2(name as keyof { currentPassword: string; newPassword: string; confirmPassword: string })} className="input-field" placeholder="••••••••" />
              </div>
            ))}
            <button type="submit" disabled={saving} className="btn-primary">
              <Lock size={15} /> {saving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
