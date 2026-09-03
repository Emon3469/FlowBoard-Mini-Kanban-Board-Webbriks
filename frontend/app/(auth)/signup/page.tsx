'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setError('Please agree to the Terms of Service to continue.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background dark:bg-[#0E1117] text-on-surface dark:text-white transition-colors">
      {/* Left Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 max-w-xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md text-white">
            <img src="/logo.png" alt="FlowBoard Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-[18px] tracking-tight block leading-tight text-on-surface dark:text-white">
              FlowBoard
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface dark:text-white">
            Create your account
          </h1>
          <p className="text-[13px] text-on-surface-variant dark:text-[#8B949E] mt-1">
            Set up your Kanban workspace and streamline your team&apos;s workflow.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[12px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant dark:text-[#8B949E] mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-[#8B949E] text-[18px]">
                person
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#161B22] text-on-surface dark:text-white text-[13px] placeholder:text-on-surface-variant/60 dark:placeholder:text-[#8B949E]/60 focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant dark:text-[#8B949E] mb-1.5">
              Work Email *
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-[#8B949E] text-[18px]">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#161B22] text-on-surface dark:text-white text-[13px] placeholder:text-on-surface-variant/60 dark:placeholder:text-[#8B949E]/60 focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant dark:text-[#8B949E] mb-1.5">
              Password (min. 6 characters) *
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-[#8B949E] text-[18px]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#161B22] text-on-surface dark:text-white text-[13px] placeholder:text-on-surface-variant/60 dark:placeholder:text-[#8B949E]/60 focus:outline-none focus:border-primary shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-[#8B949E] hover:text-on-surface dark:hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-[12px] text-on-surface-variant dark:text-[#8B949E]">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="rounded text-primary focus:ring-primary mt-0.5"
              />
              <span>
                I agree to the Terms of Service and Privacy Policy for FlowBoard.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-[13px] transition-colors shadow-sm flex items-center justify-center gap-2 mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </form>

        <p className="text-center text-[12px] text-on-surface-variant dark:text-[#8B949E] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>

      {/* Right Feature Showcase Panel */}
      <div className="hidden lg:flex flex-1 bg-surface dark:bg-[#161B22] border-l border-outline dark:border-[#30363D] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 text-[12px] font-medium text-on-surface-variant dark:text-[#8B949E]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-time collaborative sync</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <span className="text-primary text-[12px] font-bold uppercase tracking-wider">
            Built for Modern Teams
          </span>
          <h2 className="text-3xl font-extrabold text-on-surface dark:text-white mt-2 leading-tight">
            The collaborative Kanban board designed for speed.
          </h2>
          <p className="text-on-surface-variant dark:text-[#8B949E] text-[14px] mt-3 leading-relaxed">
            FlowBoard removes friction from project tracking. Organize workflows, prioritize deliverables, and keep your entire team synchronized in real time.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="border border-outline dark:border-[#30363D] rounded-xl p-4 bg-background/60 dark:bg-[#0E1117]/60">
              <span className="material-symbols-outlined text-primary text-[24px]">view_kanban</span>
              <h4 className="font-semibold text-[13px] text-on-surface dark:text-white mt-2">Dynamic Kanban</h4>
              <p className="text-[12px] text-on-surface-variant dark:text-[#8B949E] mt-1">
                Customizable columns and flexible workflows for any project.
              </p>
            </div>

            <div className="border border-outline dark:border-[#30363D] rounded-xl p-4 bg-background/60 dark:bg-[#0E1117]/60">
              <span className="material-symbols-outlined text-primary text-[24px]">drag_indicator</span>
              <h4 className="font-semibold text-[13px] text-on-surface dark:text-white mt-2">Fluid Drag &amp; Drop</h4>
              <p className="text-[12px] text-on-surface-variant dark:text-[#8B949E] mt-1">
                Smooth task reordering and instant status updates.
              </p>
            </div>

            <div className="border border-outline dark:border-[#30363D] rounded-xl p-4 bg-background/60 dark:bg-[#0E1117]/60">
              <span className="material-symbols-outlined text-primary text-[24px]">group</span>
              <h4 className="font-semibold text-[13px] text-on-surface dark:text-white mt-2">Team Collaboration</h4>
              <p className="text-[12px] text-on-surface-variant dark:text-[#8B949E] mt-1">
                Assign tasks, manage roles, and stay aligned seamlessly.
              </p>
            </div>

            <div className="border border-outline dark:border-[#30363D] rounded-xl p-4 bg-background/60 dark:bg-[#0E1117]/60">
              <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
              <h4 className="font-semibold text-[13px] text-on-surface dark:text-white mt-2">Secure &amp; Reliable</h4>
              <p className="text-[12px] text-on-surface-variant dark:text-[#8B949E] mt-1">
                Role-based access control and secure authentication.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[12px] text-on-surface-variant dark:text-[#8B949E] relative z-10 pt-4 border-t border-outline dark:border-[#30363D]">
          <span>© 2025 FlowBoard</span>
        </div>
      </div>
    </div>
  );
}
