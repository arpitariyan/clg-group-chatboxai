'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, Moon, Sun,
  ArrowRight, ShieldCheck, Loader2, RefreshCw
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA gate state
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaEmail, setMfaEmail] = useState('');
  const [pendingUserEmail, setPendingUserEmail] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const { login, signInWithGoogle } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

  const checkAndTriggerMfa = async (firebaseUserEmail) => {
    try {
      if (sessionStorage.getItem(`mfaVerified_${firebaseUserEmail}`) === '1') {
        return false;
      }
    } catch {}

    try {
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(firebaseUserEmail)}`);
      const data = await res.json();
      const userData = data?.user;

      if (userData?.mfa_enabled && userData?.mfa_email) {
        setPendingUserEmail(firebaseUserEmail);
        setMfaEmail(userData.mfa_email);
        await sendMfaOtp(firebaseUserEmail, userData.mfa_email);
        setMfaStep(true);
        return true;
      }
    } catch (err) {
      console.error('[MFA] Failed to check MFA status:', err);
    }
    return false;
  };

  const sendMfaOtp = async (userEmail, mfaAddress) => {
    setOtpSent(false);
    setDevOtp('');
    const res = await fetch('/api/auth/send-mfa-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mfaAddress, userEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setOtpSent(true);
      if (data.devOTP) setDevOtp(data.devOTP);
    } else {
      throw new Error(data.error || 'Failed to send OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }

    try {
      setError('');
      setLoading(true);
      const result = await login(email, password);
      const mfaTriggered = await checkAndTriggerMfa(result.user.email);
      if (!mfaTriggered) router.push('/app');
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      const result = await signInWithGoogle();
      if (result?.user) {
        const mfaTriggered = await checkAndTriggerMfa(result.user.email);
        if (!mfaTriggered) router.push('/app');
      } else {
        throw new Error('Google sign-in did not return a user');
      }
    } catch (error) {
      setError('Failed to sign in with Google');
      console.error('Google sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (mfaOtp.length !== 6) return;
    setMfaError('');
    setMfaLoading(true);
    try {
      const res = await fetch('/api/auth/verify-mfa-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: mfaOtp,
          email: mfaEmail,
          userEmail: pendingUserEmail,
          enableMfa: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        try {
          sessionStorage.setItem(`mfaVerified_${pendingUserEmail}`, '1');
        } catch {}
        router.push('/app');
      } else {
        setMfaError(data.error || 'Invalid OTP. Please try again.');
        setMfaOtp('');
      }
    } catch (err) {
      setMfaError('Failed to verify OTP. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaCancel = async () => {
    try { await signOut(auth); } catch {}
    setMfaStep(false);
    setMfaOtp('');
    setMfaError('');
    setDevOtp('');
    setOtpSent(false);
  };

  // ─── MFA OTP Gate ──────────────────────────────────────────────────────────
  if (mfaStep) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="cursor-pointer fixed top-5 right-5 rounded-full h-9 w-9 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-slate-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </Button>

        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center gap-6 mb-8">
            <Image src="/Chatboxai_logo_main.png" alt="ChatBox AI" width={140} height={70} className="mx-auto" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Two-Factor Auth</h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Code sent to <span className="font-semibold text-slate-700 dark:text-gray-200">{mfaEmail}</span>
              </p>
            </div>
          </div>

          {/* MFA Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700/60 shadow-lg shadow-slate-200/50 dark:shadow-none p-7 space-y-5">
            {mfaError && (
              <div className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-400">{mfaError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                6-digit verification code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={mfaOtp}
                onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-500 rounded-xl"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && mfaOtp.length === 6 && handleMfaVerify()}
              />
              {devOtp && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  {/* <p className="text-xs text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">Dev mode:</span> OTP is{' '}
                    <span className="font-mono font-bold tracking-widest">{devOtp}</span>
                  </p> */}
                </div>
              )}
            </div>

            <Button
              onClick={handleMfaVerify}
              disabled={mfaLoading || mfaOtp.length !== 6}
              className="w-full h-11 cursor-pointer bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              {mfaLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Verifying...</span>
              ) : (
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Verify &amp; Continue</span>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => sendMfaOtp(pendingUserEmail, mfaEmail).catch(() => {})}
              disabled={mfaLoading}
              className="w-full h-10 cursor-pointer rounded-xl border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />Resend Code
            </Button>

            <button
              onClick={handleMfaCancel}
              className="w-full text-sm text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors py-1 cursor-pointer"
            >
              Cancel &amp; Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Normal Sign-In Form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="cursor-pointer fixed top-5 right-5 rounded-full h-9 w-9 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-slate-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
      >
        {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
      </Button>

      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-6 mb-6">
          <Link href="/" className="block">
            <Image src="/Chatboxai_logo_main_2.png" alt="ChatBox AI" width={140} height={70} className="mx-auto" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Sign in to your account to continue</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700/60 shadow-lg shadow-slate-200/50 dark:shadow-none p-7">
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full h-11 cursor-pointer bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-750 rounded-xl font-medium text-slate-700 dark:text-gray-200 shadow-sm hover:shadow-md transition-all mb-5"
          >
            <FcGoogle className="w-5 h-5 mr-2.5" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-slate-200 dark:border-gray-700" />
            <span className="text-xs text-slate-400 dark:text-gray-500 font-medium">or continue with email</span>
            <div className="flex-1 border-t border-slate-200 dark:border-gray-700" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-11 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-11 h-11 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 cursor-pointer bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-slate-500 dark:text-gray-400 mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-semibold">
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-gray-500 mt-5 px-4">
          By signing in, you agree to our{' '}
          <Link href="/terms-conditions" className="underline underline-offset-2 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}