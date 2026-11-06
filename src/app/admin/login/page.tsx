'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NammaLogo from '@/components/NammaLogo';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await login(email.trim(), password, 'ADMIN');
      if (res.success) {
        if (res.user?.role !== 'ADMIN') {
          setErrorMessage('Access Denied: This account lacks administrative credentials.');
          return;
        }
        router.push('/admin');
      } else {
        setErrorMessage(res.message || 'Invalid administrative credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Administrative login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#064e3b] via-[#022c22] to-slate-900 py-6 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-4 sm:space-y-6">
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
            Bengaluru Hub
          </span>
        </div>

        {/* Header with Shield */}
        <div className="text-center pt-2">
          <div className="inline-flex p-3 sm:p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-emerald-500/30 text-emerald-400 mb-2 shadow-lg">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Namma Dairy Staff Portal
          </h1>
          <p className="text-xs text-emerald-200/80 mt-1">
            Store Management, Order Fulfillment &amp; Catalog Hub
          </p>
        </div>

        {/* Login Form Box */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl border border-gray-100">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Staff Credentials
            </h2>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              Secure RBAC
            </span>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-[13px] flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Store Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nammadairy.com"
                  className="w-full pl-10 pr-3.5 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium bg-gray-50/40 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Administrative Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium bg-gray-50/40 focus:bg-white transition"
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
              className="w-full py-3.5 sm:py-3 px-4 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-sm sm:text-xs transition-all shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Verifying RBAC Privileges...' : 'Authenticate & Open Dashboard'}
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <Link
              href="/login"
              className="text-xs font-medium text-gray-600 hover:text-emerald-800 transition-colors inline-block py-1"
            >
              Looking for customer account? <span className="underline font-semibold text-emerald-700">Go to Customer Login</span>
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-center text-emerald-200/60 px-4">
          Strict Role-Based Access Control enforced. Administrative actions are logged for food safety compliance.
        </p>
      </div>
    </div>
  );
}
