'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import NammaLogo from '@/components/NammaLogo';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/account';

  const { login, register } = useAuth();

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await login(loginEmail.trim(), loginPassword);
      if (res.success) {
        router.push(redirect);
      } else {
        setErrorMessage(res.message || 'Invalid email, phone number, or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await register(regName.trim(), regEmail.trim(), regPassword.trim(), regPhone.trim());
      if (res.success) {
        setSuccessMessage('Account created successfully! Redirecting...');
        setTimeout(() => {
          router.push(redirect);
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setResetLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: resetIdentifier.trim(), newPassword: resetNewPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Password updated successfully! Please sign in with your new password.');
        setShowForgotPassword(false);
        setLoginEmail(resetIdentifier.trim());
        setLoginPassword('');
      } else {
        setErrorMessage(data.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while resetting password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 sm:space-y-6">
      {/* Mobile Top Navigation / Back Link */}
      <div className="flex items-center justify-between px-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors py-1 px-2 rounded-lg hover:bg-emerald-100/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Store</span>
        </Link>
        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          Bengaluru Express
        </span>
      </div>

      {/* Brand Header */}
      <div className="text-center pt-1 pb-2">
        <div className="flex justify-center mb-3">
          <NammaLogo size="lg" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">
          Pure Milk • Healthy Life
        </h1>
        <p className="text-xs text-emerald-800/80 mt-1">
          Farm fresh milk, tender meat &amp; veggies delivered across Bengaluru
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-emerald-100/80 shadow-xl shadow-emerald-950/5">
        {/* Modern Segmented Tab Bar for Mobile */}
        <div className="p-1 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex gap-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setShowForgotPassword(false);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'LOGIN' && !showForgotPassword
                ? 'bg-white text-emerald-950 shadow-sm font-extrabold'
                : 'text-gray-500 hover:text-emerald-900'
            }`}
          >
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setShowForgotPassword(false);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'REGISTER' && !showForgotPassword
                ? 'bg-white text-emerald-950 shadow-sm font-extrabold'
                : 'text-gray-500 hover:text-emerald-900'
            }`}
          >
            <span>New Customer</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-[13px] flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-[13px] flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-snug">{successMessage}</span>
          </div>
        )}

        {/* 1. FORGOT PASSWORD VIEW */}
        {showForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs text-emerald-900">
              <span className="font-bold block mb-0.5">Reset Your Password</span>
              Enter your registered mobile phone or email to update your login password.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Registered Mobile Phone or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or user@gmail.com"
                  className="w-full pl-10 pr-3.5 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-11 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3.5 sm:py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {resetLoading ? 'Updating Password...' : 'Save Password & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setErrorMessage('');
                }}
                className="w-full sm:w-auto py-3 sm:py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs sm:text-sm transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : activeTab === 'LOGIN' ? (
          /* 2. CUSTOMER SIGN IN VIEW */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Mobile Number or Email
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. 9876543210 or user@gmail.com"
                  className="w-full pl-10 pr-3.5 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetIdentifier(loginEmail);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors py-0.5 px-1 rounded"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-700" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-xs transition-all shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Signing In...' : 'Sign In & Shop'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* 3. NEW CUSTOMER REGISTER VIEW */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-10 pr-3.5 py-3 sm:py-2 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. ramesh@gmail.com"
                  className="w-full pl-10 pr-3.5 py-3 sm:py-2 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Bengaluru Mobile Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="10-digit number e.g. 9876543210"
                  className="w-full pl-10 pr-3.5 py-3 sm:py-2 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Create Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-11 py-3 sm:py-2 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-700" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-xs transition-all shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Creating Account...' : 'Create Account & Start Shopping'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Staff / Admin link */}
        <div className="mt-5 pt-4 border-t border-gray-100 text-center">
          <Link
            href="/admin/login"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg hover:bg-emerald-50 transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Namma Dairy Staff Manager? Admin Sign In &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Trust reassurance pills */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-emerald-900/70 pt-1">
        <span className="flex items-center gap-1">🌿 100% Raw &amp; Natural Milk</span>
        <span>•</span>
        <span className="flex items-center gap-1">🍗 Antibiotic-Free Cuts</span>
        <span>•</span>
        <span className="flex items-center gap-1">⚡ Same-Day Bengaluru Delivery</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fbf8f1] to-emerald-50/40 py-6 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-center text-xs text-gray-500 py-12">
            Loading login portal...
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
