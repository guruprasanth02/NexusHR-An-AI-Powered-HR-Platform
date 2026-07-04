'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@nexushr.com', password: 'Password@123', color: '#6366f1' },
  { label: 'HR Manager', email: 'hr@nexushr.com', password: 'Password@123', color: '#a855f7' },
  { label: 'Employee', email: 'employee@nexushr.com', password: 'Password@123', color: '#10b981' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 🎉`);
      router.push(user.role === 'EMPLOYEE' ? '/dashboard' : '/hr/dashboard');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #080812 0%, #0f0f2a 100%)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="gradient-bg rounded-2xl w-12 h-12 flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <div className="gradient-text font-black text-2xl">NexusHR</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-Powered HRMS</div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-6">
          {[
            { emoji: '🧠', title: 'AI Leave Intelligence', desc: 'Smart recommendations and burnout prediction' },
            { emoji: '📊', title: 'Real-time Analytics', desc: 'Live workforce insights and department health scores' },
            { emoji: '🚀', title: 'AI Resume Screening', desc: 'Automated candidate ranking and evaluation' },
            { emoji: '💬', title: 'HR AI Assistant', desc: 'Instant answers to any HR policy question' },
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
          © {new Date().getFullYear()} NexusHR. Built for the future of work.
        </p>
      </div>

      {/* Right - Login Form */}
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
            <h1 className="text-3xl font-900 mb-1" style={{ color: 'var(--text-primary)' }}>Sign in</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              Welcome back to your HR command center
            </p>

            {/* Demo accounts */}
            <div className="mb-6">
              <p className="text-xs font-600 mb-2" style={{ color: 'var(--text-muted)' }}>QUICK DEMO ACCESS</p>
              <div className="flex gap-2">
                {DEMO_ACCOUNTS.map(({ label, email, password, color }) => (
                  <button
                    key={label}
                    onClick={() => { setValue('email', email); setValue('password', password); }}
                    className="flex-1 py-2 px-2 rounded-lg text-[10px] font-700 transition-smooth"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="input-field"
                  placeholder="you@company.com"
                />
                {errors.email && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: 'var(--text-primary)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.password.message}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight size={16} />
                  </span>
                )}
              </motion.button>
            </form>

            <p className="mt-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-600" style={{ color: 'var(--text-brand)' }}>
                Create account
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
