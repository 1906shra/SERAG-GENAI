'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { AuthManager } from '@/lib/auth';
import toast from 'react-hot-toast';

const PERKS = [
  'Semantic + keyword hybrid search',
  'AI-generated answers with citations',
  'PDF, DOCX, TXT & URL support',
  'Real-time analytics dashboard',
];

export default function RegisterPage() {
  const [isLoading,    setIsLoading]    = useState(false);
  const [showPwd,      setShowPwd]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [formData,     setFormData]     = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim())                          e.name    = 'Name is required';
    if (!formData.email)                                e.email   = 'Email is required';
    if (formData.password.length < 6)                  e.password = 'At least 6 characters';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
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
      const res = await AuthManager.getInstance().register(formData.name, formData.email, formData.password);
      if (res.success) {
        toast.success('Account created! Welcome aboard 🎉');
        window.location.href = '/home';
      } else {
        toast.error((res as any).message || 'Registration failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const Field = ({
    label, name, type = 'text', placeholder, icon: Icon,
    showToggle, onToggle, show, autoComplete,
  }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          name={name}
          type={showToggle ? (show ? 'text' : 'password') : type}
          autoComplete={autoComplete}
          value={(formData as any)[name]}
          onChange={handleChange}
          placeholder={placeholder}
          className={`input pl-10 ${showToggle ? 'pr-10' : ''} ${errors[name] ? 'border-error-400 focus:ring-error-400' : ''}`}
        />
        {showToggle && (
          <button type="button" onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        )}
      </div>
      {errors[name] && <p className="mt-1 text-xs text-error-600">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden
                      bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500
                      flex-col items-center justify-center p-12 text-white">
        <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 max-w-xs">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl
                          bg-white/20 backdrop-blur-sm border border-white/30 mb-8 shadow-xl">
            <SparklesIcon className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Start for free</h2>
          <p className="text-primary-200 text-sm mb-8 leading-relaxed">
            Join thousands of users who search smarter with AI-powered document intelligence.
          </p>
          <ul className="space-y-3">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-3 text-sm">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckIcon className="h-3 w-3 text-white" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
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
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1">
              Already have one?{' '}
              <Link href="/login" className="text-primary-600 font-medium hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Full Name"        name="name"            icon={UserIcon}     placeholder="John Doe"          autoComplete="name" />
            <Field label="Email address"    name="email"           icon={EnvelopeIcon} placeholder="you@example.com"   autoComplete="email" type="email" />
            <Field label="Password"         name="password"        icon={LockClosedIcon} placeholder="Min. 6 characters" autoComplete="new-password"
                   showToggle onToggle={() => setShowPwd(!showPwd)} show={showPwd} />
            <Field label="Confirm Password" name="confirmPassword" icon={LockClosedIcon} placeholder="Repeat password"   autoComplete="new-password"
                   showToggle onToggle={() => setShowConfirm(!showConfirm)} show={showConfirm} />

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3 text-sm mt-2"
            >
              {isLoading
                ? <><div className="loading-spinner h-4 w-4" /> Creating account…</>
                : <><span>Create account</span><ArrowRightIcon className="h-4 w-4" /></>
              }
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
