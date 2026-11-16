'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  KeyRound,
  RotateCw,
  Clock,
  ShieldAlert,
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

  // ==========================================
  // Secure 5-Step Forgot Password State
  // ==========================================
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Resend cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle standard login
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

  // Handle standard registration
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

  // ==========================================
  // Step 1: Request OTP for Registered Email
  // ==========================================
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMaskedEmail(data.maskedEmail || resetEmail.trim());
        setResendCooldown(60); // 60s cooldown timer
        setAttemptsRemaining(5);
        setForgotStep(3); // Moves to OTP verification step (which shows Step 2 receipt notice)
        setSuccessMessage('A 6-digit verification code has been dispatched to your email.');
      } else {
        if (data.cooldownRemaining) {
          setResendCooldown(data.cooldownRemaining);
        }
        setErrorMessage(data.message || 'Unable to request password recovery. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage('Network error while requesting verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resetLoading) return;
    setErrorMessage('');
    setSuccessMessage('');
    setResetLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResendCooldown(60);
        setResetOtp('');
        setAttemptsRemaining(5);
        setSuccessMessage('A fresh 6-digit verification code has been sent to your email.');
      } else {
        if (data.cooldownRemaining) {
          setResendCooldown(data.cooldownRemaining);
        }
        setErrorMessage(data.message || 'Unable to resend verification code.');
      }
    } catch (err: any) {
      setErrorMessage('Network error while resending verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  // ==========================================
  // Step 3: Verify OTP and acquire Reset Token
  // ==========================================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = resetOtp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim(), otp: cleanOtp }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.resetToken) {
        setResetToken(data.resetToken);
        setForgotStep(4); // Move to Step 4: Enter new password
        setSuccessMessage('Code verified successfully! Please choose your new password.');
      } else {
        if (typeof data.attemptsRemaining === 'number') {
          setAttemptsRemaining(data.attemptsRemaining);
        }
        setErrorMessage(data.message || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setErrorMessage('Network error while verifying code.');
    } finally {
      setResetLoading(false);
    }
  };

  // ==========================================
  // Step 4: Reset Password with Verified Token
  // ==========================================
  const handleFinalResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (resetNewPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setForgotStep(5); // Step 5: Show successful reset confirmation
        setLoginEmail(resetEmail.trim());
        setLoginPassword('');
        setSuccessMessage('');
      } else {
        setErrorMessage(data.message || 'Failed to update password. Please restart recovery.');
      }
    } catch (err: any) {
      setErrorMessage('Network error while updating password.');
    } finally {
      setResetLoading(false);
    }
  };

  // Reset forgot password state when leaving
  const resetForgotState = () => {
    setShowForgotPassword(false);
    setForgotStep(1);
    setResetEmail('');
    setMaskedEmail('');
    setResetOtp('');
    setResetToken('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
    setAttemptsRemaining(null);
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
        {/* Modern Segmented Tab Bar (Hidden during forgot password) */}
        {!showForgotPassword && (
          <div className="p-1 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex gap-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'LOGIN'
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
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'REGISTER'
                  ? 'bg-white text-emerald-950 shadow-sm font-extrabold'
                  : 'text-gray-500 hover:text-emerald-900'
              }`}
            >
              <span>New Customer</span>
            </button>
          </div>
        )}

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

        {/* ========================================================= */}
        {/* SECURE 5-STEP FORGOT PASSWORD WORKFLOW                    */}
        {/* ========================================================= */}
        {showForgotPassword ? (
          <div className="space-y-4">
            {/* Step Progress Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                  {forgotStep === 5 ? '✓' : forgotStep <= 2 ? 1 : forgotStep - 1}
                </span>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-gray-900">
                    {forgotStep === 1 && 'Account Recovery'}
                    {(forgotStep === 2 || forgotStep === 3) && 'Verify 6-Digit OTP'}
                    {forgotStep === 4 && 'Create New Password'}
                    {forgotStep === 5 && 'Password Reset Complete'}
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    {forgotStep <= 4 ? `Step ${forgotStep <= 2 ? 1 : forgotStep - 1} of 3` : 'All done!'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForgotState}
                className="text-xs text-gray-400 hover:text-gray-700 p-1"
                title="Cancel recovery"
              >
                ✕
              </button>
            </div>

            {/* ---------------------------------------------------- */}
            {/* STEP 1: Enter Registered Email Address              */}
            {/* ---------------------------------------------------- */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed">
                  Enter your <strong>registered email address</strong>. We will send a secure 6-digit verification code to confirm your identity.
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="e.g. customer@gmail.com"
                      className="w-full pl-10 pr-3.5 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    For security reasons, recovery codes are only delivered to verified email inboxes.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 sm:py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {resetLoading ? 'Sending Verification Code...' : 'Send 6-Digit Code'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={resetForgotState}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs sm:text-sm transition"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEPS 2 & 3: Receive OTP & Verify Code              */}
            {/* ---------------------------------------------------- */}
            {(forgotStep === 2 || forgotStep === 3) && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {/* Step 2 notice */}
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verification code sent!</span>
                  </div>
                  <p className="text-gray-600 text-[11px]">
                    We have dispatched a 6-digit code to <strong>{maskedEmail}</strong>. The code will expire in <strong>5 minutes</strong>.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-700">
                      Enter 6-Digit Verification Code
                    </label>
                    {attemptsRemaining !== null && (
                      <span className="text-[11px] font-semibold text-amber-700">
                        {attemptsRemaining} of 5 attempts left
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className="w-full pl-10 pr-3.5 py-3 sm:py-2.5 text-center font-mono font-bold tracking-[0.4em] text-lg sm:text-base rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-500">Didn't receive the code?</span>
                  {resendCooldown > 0 ? (
                    <span className="text-gray-400 font-medium inline-flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resetLoading}
                      className="font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 transition"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Resend Code
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={resetLoading || resetOtp.trim().length !== 6}
                    className="w-full py-3 sm:py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {resetLoading ? 'Verifying Code...' : 'Verify Code & Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setErrorMessage('');
                    }}
                    className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 4: Enter New Password                          */}
            {/* ---------------------------------------------------- */}
            {forgotStep === 4 && (
              <form onSubmit={handleFinalResetPassword} className="space-y-4">
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs text-emerald-900">
                  <span className="font-bold block mb-0.5">Identity Verified ✓</span>
                  Create a strong new password for <strong>{maskedEmail}</strong>. Must contain at least 8 characters.
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    New Password (Min 8 Characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-11 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-11 py-3 sm:py-2.5 text-base sm:text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-gray-50/40 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 sm:py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {resetLoading ? 'Updating Password...' : 'Save New Password & Invalidate Old Sessions'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 5: Successful Password Reset Confirmation      */}
            {/* ---------------------------------------------------- */}
            {forgotStep === 5 && (
              <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">Password Reset Successful!</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Your password has been securely updated. All previous active sessions across all devices have been signed out for your protection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetForgotState();
                    setActiveTab('LOGIN');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In with New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'LOGIN' ? (
          /* ========================================================= */
          /* 2. CUSTOMER SIGN IN VIEW                                  */
          /* ========================================================= */
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
                    setForgotStep(1);
                    setResetEmail(loginEmail.includes('@') ? loginEmail : '');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors py-0.5 px-1 rounded cursor-pointer"
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
          /* ========================================================= */
          /* 3. NEW CUSTOMER REGISTER VIEW                             */
          /* ========================================================= */
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
            <span>Pure Picks Staff Manager? Admin Sign In &rarr;</span>
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
