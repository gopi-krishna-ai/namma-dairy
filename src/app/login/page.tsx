'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import NammaLogo from '@/components/NammaLogo';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, ArrowRight, Lock, Mail, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/account';

  const { login, register } = useAuth();

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
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
        setErrorMessage(res.message || 'Invalid email, phone, or password.');
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
    <div className="max-w-md w-full space-y-6">
      {/* Brand Card Header */}
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <NammaLogo size="lg" />
        </div>
        <h2 className="text-2xl font-black text-emerald-950">Customer Account Portal</h2>
        <p className="text-xs text-gray-600 mt-1">
          Order fresh farm milk, tender meat, and vegetables in Bengaluru
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-md">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMessage('');
            }}
            className={`flex-1 pb-3 text-center transition-colors relative ${
              activeTab === 'LOGIN' ? 'text-emerald-800' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Customer Sign In
            {activeTab === 'LOGIN' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMessage('');
            }}
            className={`flex-1 pb-3 text-center transition-colors relative ${
              activeTab === 'REGISTER' ? 'text-emerald-800' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            New Customer Register
            {activeTab === 'REGISTER' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>
        </div>

        {/* Feedback banners */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {showForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
              <span className="font-bold block mb-0.5">Reset Your Password</span>
              Enter your registered email address or phone number, and choose a new password.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Registered Email or Phone</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="e.g. user@gmail.com or 9876543210"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={resetLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {resetLoading ? 'Updating Password...' : 'Save New Password & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setErrorMessage('');
                }}
                className="py-2.5 px-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : activeTab === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email, Phone, or User ID</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com or 9876543210"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetIdentifier(loginEmail);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In to Your Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bengaluru Mobile Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Create Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Register as Customer'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Admin link */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link
            href="/admin/login"
            className="text-xs font-medium text-emerald-800 hover:text-emerald-950 flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Namma Dairy Store Manager? Go to Admin Portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#fbf8f1] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Suspense fallback={
        <div className="text-center text-xs text-gray-500 py-12">
          Loading login portal...
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
