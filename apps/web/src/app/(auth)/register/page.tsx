'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['EMPLOYEE', 'HR']),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'EMPLOYEE' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authApi.register(data);
      toast.success('Registration successful! Please check your email for verification. 📧');
      router.push('/login');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #080812 0%, #0f0f2a 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="gradient-bg rounded-2xl w-12 h-12 flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <div className="gradient-text font-black text-2xl">NexusHR</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-Powered HRMS</div>
          </div>
        </div>

        <div className="space-y-6">
          {[
            { emoji: '💡', title: 'Seamless Onboarding', desc: 'Get registered and setup in less than 2 minutes' },
            { emoji: '🛡️', title: 'Secure & Verified', desc: 'Role-based access controls and encrypted data systems' },
            { emoji: '🌐', title: 'Remote First', desc: 'Collaborate and coordinate with teams across the globe' },
          ].map(({ emoji, title, desc }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-4"
            >
              <div className="text-2xl">{emoji}</div>
              <div>
                <h3 className="font-700 text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} NexusHR. All rights reserved.
        </p>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:max-w-md">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="gradient-bg rounded-xl w-10 h-10 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="gradient-text font-black text-xl">NexusHR</div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-900 mb-1" style={{ color: 'var(--text-primary)' }}>Create account</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              Join your company on NexusHR
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Full Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="input-field"
                  placeholder="John Doe"
                />
                {errors.name && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Email address</label>
                <input
                  type="email"
                  {...register('email')}
                  className="input-field"
                  placeholder="name@company.com"
                />
                {errors.email && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Password</label>
                <input
                  type="password"
                  {...register('password')}
                  className="input-field"
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Your Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: 'EMPLOYEE', label: 'Employee' },
                    { val: 'HR', label: 'HR Manager' },
                  ].map(({ val, label }) => (
                    <label
                      key={val}
                      className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-smooth"
                      style={{
                        background: 'var(--bg-glass)',
                        borderColor: errors.role ? '#ef4444' : 'var(--border-default)',
                      }}
                    >
                      <input
                        type="radio"
                        value={val}
                        {...register('role')}
                        className="accent-indigo-500"
                      />
                      <span className="text-xs font-600" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    </label>
                  ))}
                </div>
                {errors.role && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.role.message}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="btn-primary w-full"
              >
                {loading ? 'Creating account...' : <span className="flex items-center gap-2">Sign Up <ArrowRight size={16} /></span>}
              </motion.button>
            </form>

            <p className="mt-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-600" style={{ color: 'var(--text-brand)' }}>
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
