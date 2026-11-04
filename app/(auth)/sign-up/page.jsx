'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import {
  Mail, Lock, User, AlertCircle, ArrowRight,
  Check, X, ShieldCheck, Loader2, RefreshCw,
} from '@/components/ui/animated-icon';

export default function SignUp() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP verification state
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { signup, signInWithGoogle, signInWithGithub, signInWithMicrosoft } = useAuth();
  const router = useRouter();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    const levels = [
      { strength: 0, label: '', color: '' },
      { strength: 1, label: 'Weak', color: 'bg-red-500' },
      { strength: 2, label: 'Fair', color: 'bg-amber-500' },
      { strength: 3, label: 'Good', color: 'bg-emerald-500' },
      { strength: 4, label: 'Strong', color: 'bg-emerald-400' },
    ];
    return levels[strength];
  };

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: 'At least 8 chars' },
    { met: /[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password), text: 'Upper & lowercase' },
    { met: /\d/.test(formData.password), text: 'One number' },
    { met: /[^a-zA-Z\d]/.test(formData.password), text: 'Special symbol' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const sendSignupOtp = async (email) => {
    setResendLoading(true);
    setDevOtp('');
    try {
      const res = await fetch('/api/auth/send-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setOtpSent(true);
      setResendCooldown(60);
      if (data.devOTP) setDevOtp(data.devOTP);
    } catch (err) {
      setOtpError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields'); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match'); return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long'); return;
    }
    try {
      setError('');
      setLoading(true);
      await signup(formData.email, formData.password, formData.fullName);
      
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/user/profile?email=${encodeURIComponent(formData.email)}&name=${encodeURIComponent(formData.fullName)}&createIfMissing=true`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      setOtpEmail(formData.email);
      await sendSignupOtp(formData.email);
      setOtpStep(true);
    } catch (err) {
      if (err.name === 'DisposableEmailError') {
        setError(err.message);
      } else {
        setError('Failed to create account. Email may already be in use.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 6) return;
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, email: otpEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/app');
      } else {
        setOtpError(data.error || 'Invalid code. Please try again.');
        setOtp('');
      }
    } catch {
      setOtpError('Failed to verify code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpCancel = async () => {
    try { await signOut(auth); } catch {}
    setOtpStep(false);
    setOtp('');
    setOtpError('');
    setOtpEmail('');
    setDevOtp('');
    setOtpSent(false);
  };

  const handleSocialSignUp = async (providerFn, providerName) => {
    try {
      setError('');
      setLoading(true);
      const result = await providerFn();
      if (!result?.user) throw new Error(`${providerName} sign-up did not return a user`);

      if (result.isNewUser) {
        const token = await result.user.getIdToken();
        await fetch(`/api/user/profile?email=${encodeURIComponent(result.user.email)}&name=${encodeURIComponent(result.user.displayName || '')}&createIfMissing=true`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        const email = result.user.email;
        setOtpEmail(email);
        await sendSignupOtp(email);
        setOtpStep(true);
      } else {
        const profileRes = await fetch(`/api/user/profile?email=${encodeURIComponent(result.user.email)}&createIfMissing=false`);
        const profileData = await profileRes.json();
        if (profileData?.user?.signup_verified === false) {
          const email = result.user.email;
          setOtpEmail(email);
          await sendSignupOtp(email);
          setOtpStep(true);
        } else {
          router.push('/app');
        }
      }
    } catch (err) {
      console.error(`[Social Sign-Up] Error with ${providerName}:`, err);
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError(`Failed to sign up with ${providerName}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => handleSocialSignUp(signInWithGoogle, 'Google');
  const handleGithubSignUp = () => handleSocialSignUp(signInWithGithub, 'GitHub');
  const handleMicrosoftSignUp = () => handleSocialSignUp(signInWithMicrosoft, 'Microsoft');

  const passwordStrength = getPasswordStrength();

  // ── OTP Verification Screen ───────────────────────────────────────────────────
  if (otpStep) {
    return (
      <div className="min-h-screen bg-[#0f0f11]">
        <div className="w-full max-w-[400px] mx-auto px-5 py-10 sm:py-14">
          {/* Logo */}
          <div className="flex justify-center mb-6 sm:mb-10">
            <Link href="/" className="transition-opacity hover:opacity-75">
              <Image src="/Chatboxai_logo_main_2.png" alt="ChatBox AI" width={110} height={55} className="brightness-200" priority />
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
            <h1 className="text-[22px] font-semibold tracking-tight text-[#f2f2f4] mb-2">Verify your email</h1>
            <p className="text-sm text-[#71737a] leading-relaxed">
              We sent a 6-digit code to <span className="text-[#a4a6ad]">{otpEmail}</span>
            </p>
          </div>

          {/* Error */}
          {otpError && (
            <div className="flex items-start gap-2.5 px-4 py-3 mb-6 bg-red-950/20 border border-red-800/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-300 leading-relaxed">{otpError}</span>
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
              className="text-center text-3xl tracking-[0.7em] font-mono h-14 bg-transparent border-0 border-b-2 border-[#2a2a30] text-[#f2f2f4] rounded-none focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 placeholder:text-[#3a3a40] transition-colors"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleOtpVerify()}
            />
            <p className="text-[11px] text-[#555560] text-center mt-2.5 font-mono">Enter the 6-digit code from your inbox</p>
          </div>

          {/* Verify */}
          <button
            onClick={handleOtpVerify}
            disabled={otpLoading || otp.length !== 6}
            className="w-full h-11 bg-[#f2f2f4] text-[#0f0f11] font-semibold text-sm rounded-xl hover:bg-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3 cursor-pointer"
          >
            {otpLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</>
            ) : (
              <><ShieldCheck className="w-4 h-4" />Verify & Continue</>
            )}
          </button>

          {/* Resend */}
          <button
            onClick={() => sendSignupOtp(otpEmail)}
            disabled={resendLoading || resendCooldown > 0}
            className="w-full h-10 text-sm text-[#71737a] hover:text-[#a4a6ad] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
          </button>

          {/* Cancel */}
          <div className="mt-6 text-center">
            <button
              onClick={handleOtpCancel}
              className="text-xs text-[#4a4a52] hover:text-red-400 transition-colors font-mono cursor-pointer"
            >
              Cancel & sign out
            </button>
          </div>

          <p className="text-[11px] text-[#3a3a40] text-center mt-5 font-mono">Code expires in 10 minutes · Check your spam folder</p>
        </div>
      </div>
    );
  }

  // ── Clean Minimal Centered Sign-Up Form ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f11]">
      <div className="w-full max-w-[400px] mx-auto px-5 py-8 sm:py-12">

        {/* Logo */}
        <div className="flex justify-center mb-6 sm:mb-10">
          <Link href="/" className="transition-opacity hover:opacity-75">
            <Image
              src="/Chatboxai_logo_main_2.png"
              alt="ChatBox AI"
              width={110}
              height={55}
              className="brightness-200"
              priority
            />
          </Link>
        </div>

        {/* Heading */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-[#f2f2f4] mb-1.5">
            Create your account
          </h1>
          <p className="text-sm text-[#71737a]">
            Start creating with 56+ AI models — free forever
          </p>
        </div>

        {/* Social Sign Up */}
        <div className="space-y-2.5 mb-5 sm:mb-7">
          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2.5 bg-[#18181c] border border-[#2a2a30] hover:border-[#3d3d45] hover:bg-[#1e1e23] text-[#d4d4d8] text-sm font-medium rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <Image src="/app_logo_connection/Google.png" alt="Google" width={16} height={16} />
            Continue with Google
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleGithubSignUp}
              disabled={loading}
              className="h-10 flex items-center justify-center gap-2 bg-[#18181c] border border-[#2a2a30] hover:border-[#3d3d45] hover:bg-[#1e1e23] text-[#d4d4d8] text-xs font-medium rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Image src="/app_logo_connection/Github.png" alt="GitHub" width={15} height={15} className="brightness-200" />
              GitHub
            </button>
            <button
              onClick={handleMicrosoftSignUp}
              disabled={loading}
              className="h-10 flex items-center justify-center gap-2 bg-[#18181c] border border-[#2a2a30] hover:border-[#3d3d45] hover:bg-[#1e1e23] text-[#d4d4d8] text-xs font-medium rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Image src="/app_logo_connection/MICROSOFT.png" alt="Microsoft" width={15} height={15} />
              Microsoft
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-5 sm:mb-7">
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
          <div className="flex items-start gap-2.5 px-4 py-3 mb-5 bg-red-950/20 border border-red-800/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
              <Input
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="pl-6 h-11 bg-transparent border-0 border-b border-[#2a2a30] text-[#f2f2f4] rounded-none placeholder:text-[#3a3a40] text-sm focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 transition-colors"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="pl-6 h-11 bg-transparent border-0 border-b border-[#2a2a30] text-[#f2f2f4] rounded-none placeholder:text-[#3a3a40] text-sm focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 transition-colors"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a strong password"
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

            {/* Password Strength */}
            {formData.password && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1,2,3,4].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${
                          passwordStrength.strength >= level
                            ? passwordStrength.color
                            : 'bg-[#2a2a30]'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <span className="font-mono text-[10px] text-[#71737a] w-10 text-right">{passwordStrength.label}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      {req.met ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3 h-3 text-[#3d3d45] shrink-0" />
                      )}
                      <span className={req.met ? 'text-[#a4a6ad]' : 'text-[#555560]'}>{req.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-[#71737a] mb-2 tracking-wide">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-[#3d3d45] w-4 h-4" />
              <Input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className="pl-6 pr-10 h-11 bg-transparent border-0 border-b border-[#2a2a30] text-[#f2f2f4] rounded-none placeholder:text-[#3a3a40] text-sm focus:border-[#f2f2f4] focus:ring-0 focus-visible:ring-0 transition-colors"
                required
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
                  Creating account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[#1c1c22]">
          <p className="text-sm text-[#71737a] text-center">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-[#a4a6ad] hover:text-[#f2f2f4] font-medium transition-colors">
              Sign in
            </Link>
          </p>
          <p className="font-mono text-[11px] text-[#3a3a40] text-center mt-3 leading-relaxed">
            By creating an account, you agree to our{' '}
            <Link href="/terms-conditions" className="text-[#555560] hover:text-[#71737a] underline underline-offset-2 transition-colors">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy-policy" className="text-[#555560] hover:text-[#71737a] underline underline-offset-2 transition-colors">Privacy Policy</Link>
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
