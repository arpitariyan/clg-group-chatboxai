'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield, ShieldCheck, ShieldOff, Mail, Lock, Key,
  Laptop, Activity, Fingerprint, AlertCircle, CheckCircle2,
  Loader2, RefreshCw, ArrowRight, X
} from '@/components/ui/animated-icon';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/lib/alert';
import { authFetch } from '@/lib/auth-fetch';

// ─── OTP-based Change Password Sub-component ──────────────────────────────────
function ChangePasswordPanel({ userEmail, onClose }) {
  // step: 1 = send OTP, 2 = verify OTP + new password, 3 = success
  const [step, setStep] = useState(1);
  const [email] = useState(userEmail || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    setDevOtp('');
    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      if (data.devOTP) setDevOtp(data.devOTP);
      setStep(2);
      toast.success('OTP sent! Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setOtp('');
    setDevOtp('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');
      if (data.devOTP) setDevOtp(data.devOTP);
      toast.success('New OTP sent!');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-4 border-t border-border mt-4 space-y-4">
      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Step 1 – show email and send OTP */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Your email</label>
            <div className="relative max-w-md">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                readOnly
                className="pl-9 max-w-md bg-muted/50 cursor-not-allowed opacity-70"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll send a 6-digit code to this address to verify it's you.
            </p>
          </div>
          <Button
            onClick={handleSendOtp}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
            ) : (
              <><ArrowRight className="w-4 h-4 mr-2" />Send Verification Code</>
            )}
          </Button>
        </div>
      )}

      {/* Step 2 – OTP + new password */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Dev OTP hint */}
          {devOtp && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Dev mode:</span> OTP is{' '}
                <span className="font-mono font-bold tracking-widest">{devOtp}</span>
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium">
              6-digit code sent to <span className="text-foreground font-semibold">{email}</span>
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • • • •"
              maxLength={6}
              className="w-full sm:max-w-50 text-center text-lg sm:text-xl tracking-[0.4em] sm:tracking-[0.5em] font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium">New Password</label>
            <div className="relative max-w-md">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="pl-9 max-w-md bg-white dark:bg-gray-900 text-sm"
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium">Confirm New Password</label>
            <div className="relative max-w-md">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="pl-9 max-w-md bg-white dark:bg-gray-900 text-sm"
                minLength={6}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <Button
              onClick={handleResetPassword}
              disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
              ) : (
                'Update Password'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />Resend Code
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 – success */}
      {step === 3 && (
        <div className="flex flex-col items-start gap-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Password updated successfully!
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Your new password is active. You can close this panel.
          </p>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            <X className="w-4 h-4 mr-2" />Close
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main SecuritySettings Component ─────────────────────────────────────────
export default function SecuritySettings() {
  const { currentUser } = useAuth();
  const { userData, updateUserData } = useUser() || {};

  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnabledLocal, setMfaEnabledLocal] = useState(null);
  const [mfaDevOtp, setMfaDevOtp] = useState('');

  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const [loginActivity, setLoginActivity] = useState([]);
  const [loginActivityLoading, setLoginActivityLoading] = useState(false);
  const [loginActivityFetched, setLoginActivityFetched] = useState(false);

  const isMfaEnabled = mfaEnabledLocal !== null ? mfaEnabledLocal : !!userData?.mfa_enabled;

  const [sessionInfo] = useState(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let browser = 'Unknown Browser';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';

    let platform = 'Unknown';
    if (ua.includes('Windows')) platform = 'Windows';
    else if (ua.includes('iPhone') || ua.includes('iPad')) platform = 'iOS';
    else if (ua.includes('Android')) platform = 'Android';
    else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) platform = 'macOS';
    else if (ua.includes('Linux')) platform = 'Linux';

    return { browser, platform, sessionStart: new Date().toLocaleString() };
  });

  useEffect(() => {
    if (loginActivityFetched || !currentUser?.email) return;
    const fetchActivity = async () => {
      setLoginActivityLoading(true);
      try {
        const res = await authFetch(`/api/auth/login-activity?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        if (data.success) setLoginActivity(data.events || []);
      } catch (err) {
        console.error('Failed to fetch login activity:', err);
      } finally {
        setLoginActivityLoading(false);
        setLoginActivityFetched(true);
      }
    };
    fetchActivity();
  }, [currentUser?.email, loginActivityFetched]);

  const handleMfaSendOtp = async () => {
    if (!mfaEmail || !mfaEmail.includes('@')) {
      return toast.error('Please enter a valid email address');
    }
    try {
      setMfaLoading(true);
      setMfaDevOtp('');
      const response = await fetch('/api/auth/send-mfa-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mfaEmail, userEmail: currentUser.email })
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        toast.success(data.message || 'OTP sent! Please check your inbox.');
        if (data.devOTP) setMfaDevOtp(data.devOTP);
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaOtp || mfaOtp.length !== 6) {
      return toast.error('Please enter a valid 6-digit OTP');
    }
    try {
      setMfaLoading(true);
      const response = await fetch('/api/auth/verify-mfa-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: mfaOtp, email: mfaEmail, userEmail: currentUser.email, enableMfa: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'OTP verification failed');

      setMfaEnabledLocal(true);
      await updateUserData({ mfa_enabled: true, mfa_email: mfaEmail });
      toast.success('MFA enabled successfully!');
      setShowMfaSetup(false);
      setMfaEmail('');
      setMfaOtp('');
      setOtpSent(false);
      setMfaDevOtp('');
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
      setMfaOtp('');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaDisable = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) return;
    try {
      setMfaLoading(true);
      setMfaEnabledLocal(false);
      await updateUserData({ mfa_enabled: false, mfa_email: null });
      toast.success('MFA disabled successfully.');
    } catch (error) {
      toast.error('Failed to disable MFA.');
    } finally {
      setMfaLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString();
  };

  const getProviderLabel = (providerId) => {
    if (!providerId) return 'Unknown';
    if (providerId === 'google.com') return 'Google';
    if (providerId === 'password') return 'Email and Password';
    return providerId;
  };

  const providers = currentUser?.providerData?.length
    ? currentUser.providerData
    : currentUser?.providerId
    ? [{ providerId: currentUser.providerId }]
    : [];
  const primaryProvider = providers[0]?.providerId || null;

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Authentication */}
      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Authentication</h2>
          <p className="text-sm text-muted-foreground">Manage your login credentials and connected accounts.</p>
        </div>

        <div className="space-y-3 sm:space-y-4 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Sign-in Method</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Your primary way of signing in to ChatBox AI</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-xs self-start sm:self-auto shrink-0">{getProviderLabel(primaryProvider)}</Badge>
          </div>

          {(primaryProvider === 'password' || !primaryProvider) && (
            <div className="p-4 sm:p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Key className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Password</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Change your password via email verification
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="w-full sm:w-auto shrink-0 text-xs sm:text-sm"
                >
                  {showPasswordChange ? 'Cancel' : 'Change Password'}
                </Button>
              </div>

              {showPasswordChange && (
                <ChangePasswordPanel
                  userEmail={currentUser?.email || ''}
                  onClose={() => setShowPasswordChange(false)}
                />
              )}
            </div>
          )}
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* MFA Setup */}
      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Two-Factor Authentication</h2>
          <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
        </div>

        <div className="max-w-3xl">
          <div className="p-4 sm:p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isMfaEnabled ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500' : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {isMfaEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm sm:text-base">MFA is {isMfaEnabled ? 'Enabled' : 'Disabled'}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate max-w-full">
                    {isMfaEnabled ? `Protected via ${userData?.mfa_email || 'Gmail OTP'}` : 'Your account is not protected with MFA'}
                  </p>
                </div>
              </div>
              <Button
                variant={isMfaEnabled ? 'destructive' : 'default'}
                onClick={isMfaEnabled ? handleMfaDisable : () => setShowMfaSetup(true)}
                disabled={mfaLoading}
                className="w-full sm:w-auto shrink-0 text-xs sm:text-sm"
              >
                {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isMfaEnabled ? 'Disable' : 'Enable MFA'}
              </Button>
            </div>

            {showMfaSetup && !isMfaEnabled && (
              <div className="pt-4 border-t border-border mt-4">
                {!otpSent ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium">Email address for OTP</label>
                      <Input
                        type="email"
                        value={mfaEmail}
                        onChange={(e) => setMfaEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="max-w-md text-sm"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                      <Button
                        onClick={handleMfaSendOtp}
                        disabled={mfaLoading || !mfaEmail.includes('@')}
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
                      >
                        {mfaLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Send Code
                      </Button>
                      <Button variant="ghost" onClick={() => setShowMfaSetup(false)} className="w-full sm:w-auto text-xs sm:text-sm">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mfaDevOtp && (
                      <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          <span className="font-semibold">Dev mode:</span> OTP is{' '}
                          <span className="font-mono font-bold tracking-widest">{mfaDevOtp}</span>
                        </p>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium">Enter 6-digit code sent to {mfaEmail}</label>
                      <Input
                        type="text"
                        value={mfaOtp}
                        onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full sm:max-w-50 text-center text-lg tracking-widest font-mono"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                      <Button
                        onClick={handleMfaVerify}
                        disabled={mfaLoading || mfaOtp.length !== 6}
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
                      >
                        {mfaLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Verify & Enable
                      </Button>
                      <Button variant="outline" onClick={handleMfaSendOtp} disabled={mfaLoading} className="w-full sm:w-auto text-xs sm:text-sm">Resend</Button>
                      <Button variant="ghost" onClick={() => { setShowMfaSetup(false); setOtpSent(false); }} className="w-full sm:w-auto text-xs sm:text-sm">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* Active Session & Login Activity */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Sessions</h2>
          <p className="text-sm text-muted-foreground">Review your active session and recent sign-ins.</p>
        </div>

        <div className="max-w-3xl space-y-4">
          <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Laptop className="w-5 h-5 text-green-600 dark:text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Current Session</h3>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">Active Now</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{sessionInfo.browser} on {sessionInfo.platform}</p>
              <p className="text-xs text-muted-foreground mt-1">Started: {sessionInfo.sessionStart}</p>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
            {loginActivityLoading ? (
              <div className="flex items-center justify-center p-8 border border-dashed rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : loginActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl text-center">
                <Activity className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">No recorded activity</p>
                <p className="text-xs text-muted-foreground">Activity will be tracked on your next sign-in</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loginActivity.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border border-border/60 bg-card/40">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Fingerprint className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{event.method || 'Sign In'}</p>
                      <p className="text-xs text-muted-foreground">{event.browser} on {event.platform}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(event.login_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
