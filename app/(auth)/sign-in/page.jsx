'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Moon, Sun, ArrowRight } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signInWithGoogle } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      router.push('/app');
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
        router.push('/app');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      {/* Theme Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="cursor-pointer absolute top-6 right-6 rounded-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-all"
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-amber-500" />
        ) : (
          <Moon className="h-5 w-5 text-gray-700" />
        )}
      </Button>

      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <Image 
              src="/Chatboxai_logo_main.png" 
              alt="ChatBox AI" 
              width={160} 
              height={80}
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to continue your AI journey
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-12 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-400 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-12 h-12 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-400 rounded-lg"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link 
                href="/forgot-password" 
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer h-12 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600" />
          </div>

          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full cursor-pointer h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
          >
            <FcGoogle className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
            <Link 
              href="/sign-up" 
              className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          By signing in, you agree to our{' '}
          <Link href="#" className="text-violet-600 dark:text-violet-400 hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="#" className="text-violet-600 dark:text-violet-400 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}