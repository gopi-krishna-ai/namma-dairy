'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NammaLogo from '@/components/NammaLogo';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Lock, Mail, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await login(email, password, 'ADMIN');
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
    <div className="min-h-screen bg-gradient-to-br from-[#064e3b] via-[#022c22] to-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        {/* Top Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Customer Storefront
          </Link>
        </div>

        {/* Header with Shield */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-emerald-500/30 text-emerald-400 mb-3 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Namma Dairy Staff Portal</h1>
          <p className="text-xs text-emerald-200/80 mt-1">
            Store Management, Order Fulfillment &amp; Inventory Hub
          </p>
        </div>

        {/* Login Form Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 pb-2 border-b">
            Staff Credentials
          </h2>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Store Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nammadairy.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Administrative Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-900 text-white font-bold text-xs hover:bg-emerald-950 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Verifying RBAC Privileges...' : 'Authenticate & Open Dashboard'}
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <Link
              href="/login"
              className="text-xs font-medium text-gray-600 hover:text-emerald-800 transition-colors"
            >
              Looking for customer account? <span className="underline">Go to Customer Login</span>
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-center text-emerald-200/60">
          Strict Role-Based Access Control enforced. Administrative actions are logged for food safety compliance.
        </p>
      </div>
    </div>
  );
}
