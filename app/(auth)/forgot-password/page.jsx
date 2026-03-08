'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, AlertCircle, Moon, Sun, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    try {
      setError('');
      setMessage('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Password reset link has been sent to your email. Please check your inbox.');
      setEmail('');
    } catch (error) {
      setError('Failed to send reset email. Please check your email address.');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <Image src="/Chatboxai_logo_main.png" alt="ChatBox AI" width={140} height={70} className="mx-auto" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset your password</h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
              Enter your email to receive a reset link
            </p>
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

          {/* Success State */}
          {message ? (
            <div className="flex flex-col items-center text-center gap-4 py-3">
              <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-slate-700 dark:text-gray-200 font-medium text-sm leading-relaxed">{message}</p>
              </div>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-semibold mt-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          ) : (
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
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 cursor-pointer bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send Reset Link <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              {/* Back to Sign In */}
              <div className="text-center pt-1">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-gray-500 mt-5 px-4">
          Remember your password?{' '}
          <Link href="/sign-in" className="underline underline-offset-2 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}