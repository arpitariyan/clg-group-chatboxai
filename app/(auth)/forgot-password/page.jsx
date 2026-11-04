'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import {
  Mail, Lock, AlertCircle, ArrowLeft, ArrowRight,
  CheckCircle2, Loader2, RefreshCw
} from '@/components/ui/animated-icon';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const router = useRouter();

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    try {
      setError('');
      setLoading(true);
      setDevOtp('');
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      if (data.devOTP) setDevOtp(data.devOTP);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    try {
      setError('');
      setLoading(true);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#0f0f11]">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="transition-opacity hover:opacity-75">
            <Image
              src="/Chatboxai_logo_main_2.png"
              alt="ChatBox AI"
              width={120}
              height={60}
              className="brightness-200"
              priority
            />
          </Link>
        </div>

        {/* Step Indicator — steps 1 & 2 only */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold transition-all duration-300 ${
                    step === s
                      ? 'bg-[#f2f2f4] text-[#0f0f11]'
                      : step > s
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-[#1a1a1f] border border-[#2a2a30] text-[#555560]'
                  }`}
                >
                  {step > s ? '✓' : s}
                </div>
                {s < 2 && (
                  <div className={`w-10 h-px transition-all duration-300 ${step > s ? 'bg-emerald-500/40' : 'bg-[#2a2a30]'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 1: Enter email ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="mb-8">
              <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#f2f2f4] mb-1.5">
                Reset password
              </h1>
              <p className="text-sm text-[#71737a]">
                Enter your email and we&apos;ll send you a recovery code
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 mb-6 bg-red-950/20 border border-red-800/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-red-300 leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                    placeholder="you@example.com"
                    className="pl-6 h-11 bg-transparent border-0 border-b border-[#2a2a30] text-[#f2f2f4] rounded-none placeholder:text-[#3a3a40] text-sm focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 transition-colors"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-11 bg-[#f2f2f4] text-[#0f0f11] font-semibold text-sm rounded-xl hover:bg-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Sending code...</>
                  ) : (
                    <>Send Recovery Code <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── STEP 2: Enter OTP + new password ───────────────────────── */}
        {step === 2 && (
          <>
            <div className="mb-8">
              <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#f2f2f4] mb-1.5">
                Enter recovery code
              </h1>
              <p className="text-sm text-[#71737a]">
                Code sent to <span className="text-[#a4a6ad]">{email}</span>
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 mb-6 bg-red-950/20 border border-red-800/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-red-300 leading-relaxed">{error}</span>
              </div>
            )}

            {devOtp && (
              <div className="px-4 py-3 mb-6 bg-amber-950/20 border border-amber-800/30 rounded-xl">
                <span className="text-xs text-amber-300 font-mono"><strong>Dev OTP:</strong> {devOtp}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* OTP */}
              <div>
                <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
                  Verification Code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError(''); }}
                  placeholder="• • • • • •"
                  className="text-center text-3xl tracking-[0.7em] font-mono h-14 bg-transparent border-0 border-b-2 border-[#2a2a30] text-[#f2f2f4] rounded-none focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 placeholder:text-[#3a3a40] transition-colors"
                  maxLength={6}
                  required
                  autoFocus
                />
                <p className="text-[11px] text-[#555560] text-center mt-2 font-mono">Enter the 6-digit code from your inbox</p>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="pl-6 pr-10 h-11 bg-transparent border-0 border-b border-[#2a2a30] text-[#f2f2f4] rounded-none placeholder:text-[#3a3a40] text-sm focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 transition-colors"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-[#3d3d45] hover:text-[#a4a6ad] transition-colors cursor-pointer focus:outline-none p-1"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-6 pr-10 h-11 bg-transparent border-0 border-b border-[#2a2a30] text-[#f2f2f4] rounded-none placeholder:text-[#3a3a40] text-sm focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 transition-colors"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-[#3d3d45] hover:text-[#a4a6ad] transition-colors cursor-pointer focus:outline-none p-1"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}
                  className="w-full h-11 bg-[#f2f2f4] text-[#0f0f11] font-semibold text-sm rounded-xl hover:bg-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Updating password...</>
                  ) : (
                    'Reset Password'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading}
                  className="w-full h-10 text-sm text-[#71737a] hover:text-[#a4a6ad] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resend Code
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── STEP 3: Success ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                {/* Subtle glow */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 blur-xl" />
              </div>
            </div>

            <h1 className="text-[26px] font-semibold tracking-tight text-[#f2f2f4] mb-2">
              Password updated
            </h1>
            <p className="text-sm text-[#71737a] leading-relaxed mb-8 max-w-[300px] mx-auto">
              Your password has been successfully reset. You can now sign in with your new credentials.
            </p>

            <button
              onClick={() => router.push('/sign-in')}
              className="w-full h-11 bg-[#f2f2f4] text-[#0f0f11] font-semibold text-sm rounded-xl hover:bg-white transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              Sign In Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer Nav */}
        <div className="mt-8 pt-6 border-t border-[#1c1c22] text-center">
          {step < 3 ? (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 text-xs text-[#3d3d45] hover:text-[#71737a] transition-colors font-mono"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to sign in
            </Link>
          ) : (
            <Link
              href="/"
              className="text-xs text-[#3d3d45] hover:text-[#71737a] transition-colors font-mono"
            >
              ← Back to chatboxai.co.in
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}
