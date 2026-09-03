'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('alice@flowboard.dev');
  const [password, setPassword] = useState('Flowboard123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
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
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <img src="/logo.png" alt="FlowBoard Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-[18px] tracking-tight block leading-tight">FlowBoard</span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface dark:text-white">
            Welcome back
          </h1>
          <p className="text-[13px] text-on-surface-variant dark:text-[#8B949E] mt-1">
            Sign in to manage your boards, track tasks, and collaborate with your team.
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
              Email Address
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#161B22] text-on-surface dark:text-white text-[13px] placeholder:text-on-surface-variant/50 dark:placeholder:text-[#8B949E]/50 focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12px] font-medium text-on-surface-variant dark:text-[#8B949E]">
                Password
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Password reset instructions sent to your email.');
                }}
                className="text-[12px] text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-[#8B949E] text-[18px]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-outline dark:border-[#30363D] bg-surface dark:bg-[#161B22] text-on-surface dark:text-white text-[13px] placeholder:text-on-surface-variant/50 dark:placeholder:text-[#8B949E]/50 focus:outline-none focus:border-primary shadow-sm"
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

          <div className="flex items-center justify-between text-[12px] pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant dark:text-[#8B949E]">
              <input type="checkbox" defaultChecked className="rounded text-primary focus:ring-primary" />
              <span>Remember this device</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold text-[13px] transition-colors shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In to Workspace'}
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </form>

        <p className="text-center text-[12px] text-on-surface-variant dark:text-[#8B949E] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Create workspace
          </Link>
        </p>
      </div>

      {/* Right Feature Showcase Panel */}
      <div className="hidden lg:flex flex-1 bg-surface dark:bg-[#161B22] border-l border-outline dark:border-[#30363D] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 text-[12px] font-medium text-on-surface-variant dark:text-[#8B949E]">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Real-time collaborative sync</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-extrabold text-on-surface dark:text-white mt-2 leading-tight">
            Organize tasks with complete clarity.
          </h2>
          <p className="text-on-surface-variant dark:text-[#8B949E] text-[14px] mt-3 leading-relaxed">
            FlowBoard delivers a streamlined Kanban workflow with fluid drag-and-drop columns, instant task updates,
            and enterprise-grade team collaboration.
          </p>

          {/* Mini Mock Cards Preview */}
          <div className="mt-8 space-y-3">
            {/* Task Card 1: In Progress */}
            <div className="bg-background dark:bg-[#0E1117] border border-outline dark:border-[#30363D] rounded-xl p-3.5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold flex items-center justify-center text-[12px]">
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[13px] text-on-surface dark:text-white">
                    Implement WebSocket live sync
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-primary font-medium">In Progress</span>
                    <span className="text-[11px] text-on-surface-variant dark:text-[#8B949E]">• 3 subtasks</span>
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                Frontend
              </span>
            </div>

            {/* Task Card 2: Completed */}
            <div className="bg-background dark:bg-[#0E1117] border border-outline dark:border-[#30363D] rounded-xl p-3.5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/15 text-success font-semibold flex items-center justify-center text-[12px]">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[13px] text-on-surface dark:text-white">
                    Drag-and-drop column interaction
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-success font-medium">Done</span>
                    <span className="text-[11px] text-on-surface-variant dark:text-[#8B949E]">• Verified</span>
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-success/10 text-success border border-success/20">
                UI / UX
              </span>
            </div>

            {/* Task Card 3: In Review */}
            <div className="bg-background dark:bg-[#0E1117] border border-outline dark:border-[#30363D] rounded-xl p-3.5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 font-semibold flex items-center justify-center text-[12px]">
                  <span className="material-symbols-outlined text-[18px]">rate_review</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[13px] text-on-surface dark:text-white">
                    Dark mode CSS tokens persistence
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-amber-500 font-medium">Review</span>
                    <span className="text-[11px] text-on-surface-variant dark:text-[#8B949E]">• 2 comments</span>
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-variant dark:bg-[#30363D] text-on-surface-variant dark:text-[#8B949E]">
                Core
              </span>
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
