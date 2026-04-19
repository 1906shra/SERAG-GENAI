'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { AuthManager } from '@/lib/auth';
import toast from 'react-hot-toast';

// ── Inner form — uses useSearchParams so must be inside <Suspense> ────────────
function LoginForm() {
  const searchParams   = useSearchParams();
  const [isLoading,    setIsLoading]    = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData,     setFormData]     = useState({ email: '', password: '' });
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.email)    e.email    = 'Email is required';
    if (!formData.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await AuthManager.getInstance().login(formData.email, formData.password);
      if (res.success) {
        toast.success('Welcome back!');
        const redirectTo = searchParams.get('redirect') || '/home';
        window.location.href = redirectTo;
      } else {
        toast.error((res as any).message || 'Login failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email address
        </label>
        <div className="relative">
          <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={`input pl-10 ${errors.email ? 'border-error-400 focus:ring-error-400 focus:border-error-400' : ''}`}
          />
        </div>
        {errors.email && <p className="mt-1 text-xs text-error-600">{errors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <div className="relative">
          <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className={`input pl-10 pr-10 ${errors.password ? 'border-error-400 focus:ring-error-400 focus:border-error-400' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-error-600">{errors.password}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary w-full py-3 text-sm mt-2"
      >
        {isLoading
          ? <><div className="loading-spinner h-4 w-4" /> Signing in…</>
          : <><span>Sign in</span><ArrowRightIcon className="h-4 w-4" /></>
        }
      </button>
    </form>
  );
}

// ── Page shell — no dynamic hooks at this level ───────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden
                      bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500
                      flex-col items-center justify-center p-12 text-white">
        <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 max-w-sm text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl
                          bg-white/20 backdrop-blur-sm border border-white/30 mb-8 shadow-xl">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold mb-3 tracking-tight">AI Search Engine</h1>
          <p className="text-primary-200 text-sm leading-relaxed mb-10">
            Your intelligent document search platform powered by RAG technology.
            Ask questions, get precise answers.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Accuracy', value: '99%' },
              { label: 'Speed',    value: '<1s'  },
              { label: 'Secure',   value: 'JWT'  },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-primary-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md fade-in-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-md">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">AI Search Engine</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">
              Sign in to your account to continue.{' '}
              <Link href="/register" className="text-primary-600 font-medium hover:text-primary-700">
                Create account
              </Link>
            </p>
          </div>

          {/* LoginForm uses useSearchParams — must be wrapped in Suspense */}
          <Suspense
            fallback={
              <div className="space-y-5">
                <div className="skeleton h-10 w-full rounded-lg" />
                <div className="skeleton h-10 w-full rounded-lg" />
                <div className="skeleton h-12 w-full rounded-lg" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-xs text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary-600 font-semibold hover:text-primary-700">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
