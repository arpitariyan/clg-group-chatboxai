'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import {
  Mail, Lock, AlertCircle,
  ArrowRight, ShieldCheck, Loader2, RefreshCw, Check
} from '@/components/ui/animated-icon';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isUnverified, setIsUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const [mfaStep, setMfaStep] = useState(false);
  const [mfaEmail, setMfaEmail] = useState('');
  const [pendingUserEmail, setPendingUserEmail] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // Signup OTP verification state
  const [signupVerifyStep, setSignupVerifyStep] = useState(false);
  const [signupVerifyEmail, setSignupVerifyEmail] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupOtpLoading, setSignupOtpLoading] = useState(false);
  const [signupOtpError, setSignupOtpError] = useState('');
  const [signupDevOtp, setSignupDevOtp] = useState('');
  const [signupResendCooldown, setSignupResendCooldown] = useState(0);

  const { login, signInWithGoogle, signInWithGithub, signInWithMicrosoft } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (signupResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setSignupResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [signupResendCooldown]);

  const checkAndTriggerMfa = async (firebaseUserEmail) => {
    try {
      if (sessionStorage.getItem(`mfaVerified_${firebaseUserEmail}`) === '1') return false;
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

  const checkAndTriggerSignupVerification = async (emailToCheck) => {
    try {
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(emailToCheck)}&createIfMissing=false`);
      const data = await res.json();
      if (data?.user?.signup_verified === false) {
        setSignupVerifyEmail(emailToCheck);
        await sendSignupVerificationOtp(emailToCheck);
        setSignupVerifyStep(true);
        return true;
      }
    } catch (err) {
      console.error('[SignupVerify] Failed to check verification status:', err);
    }
    return false;
  };

  const sendSignupVerificationOtp = async (targetEmail) => {
    setSignupDevOtp('');
    const res = await fetch('/api/auth/send-signup-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setSignupResendCooldown(60);
      if (data.devOTP) setSignupDevOtp(data.devOTP);
    } else {
      throw new Error(data.error || 'Failed to send code');
    }
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
      const needsSignupVerify = await checkAndTriggerSignupVerification(result.user.email);
      if (needsSignupVerify) return;
      const mfaTriggered = await checkAndTriggerMfa(result.user.email);
      if (!mfaTriggered) router.push('/app');
    } catch (err) {
      if (err.name === 'EmailNotVerifiedError') {
        setIsUnverified(true);
        setError(err.message || 'Please verify your email address before logging in. Check your inbox or spam folder.');
      } else if (err.name === 'DisposableEmailError') {
        setError(err.message);
      } else {
        setError('Failed to sign in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!result.user.emailVerified) {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(result.user);
        await signOut(auth);
        setResendSuccess(true);
        setError('');
      } else {
        router.push('/app');
      }
    } catch (err) {
      setError('Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      const result = await signInWithGoogle();
      if (result?.user) {
        if (result.isNewUser) {
          const token = await result.user.getIdToken();
          await fetch(`/api/user/profile?email=${encodeURIComponent(result.user.email)}&name=${encodeURIComponent(result.user.displayName || '')}&createIfMissing=true`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          setSignupVerifyEmail(result.user.email);
          await sendSignupVerificationOtp(result.user.email);
          setSignupVerifyStep(true);
          return;
        }
        const needsSignupVerify = await checkAndTriggerSignupVerification(result.user.email);
        if (needsSignupVerify) return;
        const mfaTriggered = await checkAndTriggerMfa(result.user.email);
        if (!mfaTriggered) router.push('/app');
      } else {
        throw new Error('Google sign-in did not return a user');
      }
    } catch (err) {
      console.error('[Social Sign-In] Error with Google:', err);
      setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      const result = await signInWithGithub();
      if (result?.user) {
        if (result.isNewUser) {
          const token = await result.user.getIdToken();
          await fetch(`/api/user/profile?email=${encodeURIComponent(result.user.email)}&name=${encodeURIComponent(result.user.displayName || '')}&createIfMissing=true`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          setSignupVerifyEmail(result.user.email);
          await sendSignupVerificationOtp(result.user.email);
          setSignupVerifyStep(true);
          return;
        }
        const needsSignupVerify = await checkAndTriggerSignupVerification(result.user.email);
        if (needsSignupVerify) return;
        const mfaTriggered = await checkAndTriggerMfa(result.user.email);
        if (!mfaTriggered) router.push('/app');
      } else {
        throw new Error('GitHub sign-in did not return a user');
      }
    } catch (err) {
      console.error('[Social Sign-In] Error with GitHub:', err);
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError('Failed to sign in with GitHub');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      const result = await signInWithMicrosoft();
      if (result?.user) {
        if (result.isNewUser) {
          const token = await result.user.getIdToken();
          await fetch(`/api/user/profile?email=${encodeURIComponent(result.user.email)}&name=${encodeURIComponent(result.user.displayName || '')}&createIfMissing=true`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          setSignupVerifyEmail(result.user.email);
          await sendSignupVerificationOtp(result.user.email);
          setSignupVerifyStep(true);
          return;
        }
        const needsSignupVerify = await checkAndTriggerSignupVerification(result.user.email);
        if (needsSignupVerify) return;
        const mfaTriggered = await checkAndTriggerMfa(result.user.email);
        if (!mfaTriggered) router.push('/app');
      } else {
        throw new Error('Microsoft sign-in did not return a user');
      }
    } catch (err) {
      console.error('[Social Sign-In] Error with Microsoft:', err);
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError('Failed to sign in with Microsoft');
      }
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
        body: JSON.stringify({ otp: mfaOtp, email: mfaEmail, userEmail: pendingUserEmail, enableMfa: false }),
      });
      const data = await res.json();
      if (res.ok) {
        try { sessionStorage.setItem(`mfaVerified_${pendingUserEmail}`, '1'); } catch {}
        router.push('/app');
      } else {
        setMfaError(data.error || 'Invalid OTP.');
        setMfaOtp('');
      }
    } catch {
      setMfaError('Failed to verify OTP.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaCancel = async () => {
    try { await signOut(auth); } catch {}
    setMfaStep(false); setMfaOtp(''); setMfaError(''); setDevOtp(''); setOtpSent(false);
  };

  const handleSignupOtpVerify = async () => {
    if (signupOtp.length !== 6) return;
    setSignupOtpError('');
    setSignupOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: signupOtp, email: signupVerifyEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        const mfaTriggered = await checkAndTriggerMfa(signupVerifyEmail);
        if (!mfaTriggered) router.push('/app');
      } else {
        setSignupOtpError(data.error || 'Invalid code. Please try again.');
        setSignupOtp('');
      }
    } catch {
      setSignupOtpError('Failed to verify code. Please try again.');
    } finally {
      setSignupOtpLoading(false);
    }
  };

  const handleSignupOtpCancel = async () => {
    try { await signOut(auth); } catch {}
    setSignupVerifyStep(false);
    setSignupOtp('');
    setSignupOtpError('');
    setSignupVerifyEmail('');
    setSignupDevOtp('');
  };

  // ── Shared OTP Screen ─────────────────────────────────────────────────────────
  const OtpScreen = ({ title, subtitle, otp, setOtp, error, devOtp, onVerify, verifyLoading, onResend, resendLoading, resendCooldown, onCancel, verifyLabel }) => (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#0f0f11]">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="transition-opacity hover:opacity-75">
            <Image src="/Chatboxai_logo_main_2.png" alt="ChatBox AI" width={120} height={60} className="brightness-200" priority />
          </Link>
        </div>

        {/* Icon Badge */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#1a1a1f] border border-[#2a2a30] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#a4a6ad]" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#f2f2f4] mb-2">{title}</h1>
          <p className="text-sm text-[#71737a] leading-relaxed">{subtitle}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 mb-6 bg-red-950/20 border border-red-800/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Dev OTP */}
        {devOtp && (
          <div className="px-4 py-3 mb-6 bg-amber-950/20 border border-amber-800/30 rounded-xl">
            <span className="text-xs text-amber-300 font-mono"><strong>Dev OTP:</strong> {devOtp}</span>
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-5">
          <Input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="• • • • • •"
            className="text-center text-3xl tracking-[0.7em] font-mono h-14 bg-transparent border-0 border-b-2 border-[#2a2a30] text-[#f2f2f4] rounded-none focus:border-[#f2f2f4] focus:ring-0 placeholder:text-[#3a3a40] transition-colors"
            maxLength={6}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && onVerify()}
          />
          <p className="text-[11px] text-[#555560] text-center mt-2.5 font-mono">Enter the 6-digit code from your inbox</p>
        </div>

        {/* Primary Action */}
        <button
          onClick={onVerify}
          disabled={verifyLoading || otp.length !== 6}
          className="w-full h-11 bg-[#f2f2f4] text-[#0f0f11] font-semibold text-sm rounded-xl hover:bg-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3 cursor-pointer"
        >
          {verifyLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{verifyLabel || 'Verifying...'}</>
          ) : (
            <><ShieldCheck className="w-4 h-4" />{verifyLabel || 'Verify & Continue'}</>
          )}
        </button>

        {/* Resend */}
        <button
          onClick={onResend}
          disabled={resendLoading || resendCooldown > 0}
          className="w-full h-10 text-sm text-[#71737a] hover:text-[#a4a6ad] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
        </button>

        {/* Cancel */}
        <div className="mt-6 text-center">
          <button
            onClick={onCancel}
            className="text-xs text-[#4a4a52] hover:text-red-400 transition-colors font-mono cursor-pointer"
          >
            Cancel & sign out
          </button>
        </div>

        <p className="text-[11px] text-[#3a3a40] text-center mt-5 font-mono">Code expires in 10 minutes · Check your spam folder</p>
      </div>
    </div>
  );

  // ── Signup Verification Gate ──────────────────────────────────────────────────
  if (signupVerifyStep) {
    return (
      <OtpScreen
        title="Verify your email"
        subtitle={<>We sent a 6-digit code to <span className="text-[#a4a6ad]">{signupVerifyEmail}</span></>}
        otp={signupOtp}
        setOtp={setSignupOtp}
        error={signupOtpError}
        devOtp={signupDevOtp}
        onVerify={handleSignupOtpVerify}
        verifyLoading={signupOtpLoading}
        onResend={() => sendSignupVerificationOtp(signupVerifyEmail).catch((err) => setSignupOtpError(err.message))}
        resendCooldown={signupResendCooldown}
        onCancel={handleSignupOtpCancel}
        verifyLabel="Verify & Continue"
      />
    );
  }

  // ── MFA Gate ──────────────────────────────────────────────────────────────────
  if (mfaStep) {
    return (
      <OtpScreen
        title="Two-Factor Authentication"
        subtitle={<>Security code sent to <span className="text-[#a4a6ad]">{mfaEmail}</span></>}
        otp={mfaOtp}
        setOtp={setMfaOtp}
        error={mfaError}
        devOtp={devOtp}
        onVerify={handleMfaVerify}
        verifyLoading={mfaLoading}
        onResend={() => sendMfaOtp(pendingUserEmail, mfaEmail).catch(() => {})}
        resendCooldown={0}
        onCancel={handleMfaCancel}
        verifyLabel="Verify & Sign In"
      />
    );
  }

  // ── Main Sign-In ──────────────────────────────────────────────────────────────
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

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#f2f2f4] mb-1.5">
            Welcome back
          </h1>
          <p className="text-sm text-[#71737a]">
            Sign in to your ChatBox AI account
          </p>
        </div>

        {/* Social Buttons */}
        <div className="space-y-2.5 mb-7">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2.5 bg-[#18181c] border border-[#2a2a30] hover:border-[#3d3d45] hover:bg-[#1e1e23] text-[#d4d4d8] text-sm font-medium rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <Image src="/app_logo_connection/Google.png" alt="Google" width={16} height={16} />
            Continue with Google
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleGithubSignIn}
              disabled={loading}
              className="h-10 flex items-center justify-center gap-2 bg-[#18181c] border border-[#2a2a30] hover:border-[#3d3d45] hover:bg-[#1e1e23] text-[#d4d4d8] text-xs font-medium rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Image src="/app_logo_connection/Github.png" alt="GitHub" width={15} height={15} className="brightness-200" />
              GitHub
            </button>
            <button
              onClick={handleMicrosoftSignIn}
              disabled={loading}
              className="h-10 flex items-center justify-center gap-2 bg-[#18181c] border border-[#2a2a30] hover:border-[#3d3d45] hover:bg-[#1e1e23] text-[#d4d4d8] text-xs font-medium rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Image src="/app_logo_connection/MICROSOFT.png" alt="Microsoft" width={15} height={15} />
              Microsoft
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#222228]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0f0f11] px-4 text-[11px] uppercase tracking-widest text-[#3d3d45] font-mono">
              or continue with email
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex flex-col gap-2 px-4 py-3 bg-red-950/20 border border-red-800/30 rounded-xl">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-300 leading-relaxed">{error}</span>
            </div>
            {isUnverified && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading || resendSuccess}
                className="ml-6 text-xs text-[#a4a6ad] hover:text-[#f2f2f4] flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {resendLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending link...</>
                ) : resendSuccess ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-300">Link sent!</span></>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" />Resend verification email</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsUnverified(false);
                  setResendSuccess(false);
                  if (error) setError('');
                }}
                placeholder="you@example.com"
                className="pl-6 h-11 bg-transparent border-0 border-b border-[#2a2a30] text-[#f2f2f4] rounded-none placeholder:text-[#3a3a40] text-sm focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 transition-colors"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#71737a] tracking-wide">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#71737a] hover:text-[#a4a6ad] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-6 pr-10 h-11 bg-transparent border-0 border-b border-[#2a2a30] text-[#f2f2f4] rounded-none placeholder:text-[#3a3a40] text-sm focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#3d3d45] hover:text-[#a4a6ad] transition-colors cursor-pointer focus:outline-none p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#f2f2f4] text-[#0f0f11] font-semibold text-sm rounded-xl hover:bg-white transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-[#1c1c22]">
          <p className="text-sm text-[#71737a] text-center">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-[#a4a6ad] hover:text-[#f2f2f4] font-medium transition-colors">
              Sign up for free
            </Link>
          </p>
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs text-[#3d3d45] hover:text-[#71737a] transition-colors font-mono"
            >
              ← Back to chatboxai.co.in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
