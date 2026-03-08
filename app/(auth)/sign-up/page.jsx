'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Moon, Sun, ArrowRight, Check, X } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

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

  const { signup, signInWithGoogle } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

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
      { strength: 3, label: 'Good', color: 'bg-violet-500' },
      { strength: 4, label: 'Strong', color: 'bg-violet-600' },
    ];
    return levels[strength];
  };

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: 'At least 8 characters' },
    { met: /[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password), text: 'Upper and lowercase letters' },
    { met: /\d/.test(formData.password), text: 'At least one number' },
    { met: /[^a-zA-Z\d]/.test(formData.password), text: 'At least one special character' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      router.push('/app');
    } catch (error) {
      setError('Failed to create account. Email may already be in use.');
      console.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setError('');
      setLoading(true);
      const result = await signInWithGoogle();
      if (result?.user) {
        router.push('/app');
      } else {
        throw new Error('Google sign-up did not return a user');
      }
    } catch (error) {
      setError('Failed to sign up with Google');
      console.error('Google sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 py-10">
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create an account</h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Start your AI-powered journey today</p>
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

          {/* Google Sign-Up */}
          <Button
            onClick={handleGoogleSignUp}
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
            <span className="text-xs text-slate-400 dark:text-gray-500 font-medium">or sign up with email</span>
            <div className="flex-1 border-t border-slate-200 dark:border-gray-700" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="pl-10 h-11 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className="pl-10 h-11 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a strong password"
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

              {/* Password Strength */}
              {formData.password && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                      />
                    </div>
                    {passwordStrength.label && (
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400 w-10 text-right">
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-1.5 text-xs">
                        {req.met
                          ? <Check className="w-3 h-3 text-violet-600 dark:text-violet-400 shrink-0" />
                          : <X className="w-3 h-3 text-slate-300 dark:text-gray-600 shrink-0" />
                        }
                        <span className={req.met ? 'text-violet-700 dark:text-violet-400' : 'text-slate-400 dark:text-gray-500'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className="pl-10 pr-11 h-11 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-slate-500 dark:text-gray-400 mt-5">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-gray-500 mt-5 px-4">
          By signing up, you agree to our{' '}
          <Link href="/terms-conditions" className="underline underline-offset-2 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}