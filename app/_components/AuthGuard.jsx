'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, Moon, Sun, Sparkles, Bot, Shield, Zap } from 'lucide-react';

export default function AuthGuard({ children }) {
  const { currentUser, loading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-violet-200 dark:border-violet-800 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin"></div>
          </div>
          <p className="text-violet-600 dark:text-violet-400 font-medium">Loading ChatBox AI...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-linear-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 p-4 z-50 transition-colors duration-300">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,var(--color-violet-600),transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_80%,var(--color-violet-400),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,var(--color-purple-600),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,var(--color-purple-400),transparent_50%)]" />
        </div>

        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="absolute top-6 right-6 z-10 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 backdrop-blur-sm"
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5 text-gray-600" />
          )}
        </Button>

        <div className="relative text-center max-w-lg mx-auto z-10">
          {/* Logo and Header */}
          <div className="mb-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-linear-to-r from-violet-600 to-purple-600 rounded-full blur-xl opacity-20 dark:opacity-30 transform scale-110" />
              <Image 
                src="/Chatboxai_logo_main.png" 
                alt="ChatBox AI" 
                width={180} 
                height={90}
                className="relative mx-auto drop-shadow-lg"
              />
            </div>
            
            <h1 className="text-3xl font-bold bg-linear-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Welcome to ChatBox AI
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">
              Your intelligent AI companion awaits
            </p>
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-violet-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Secure Authentication Required</span>
              <Shield className="w-4 h-4 text-purple-500" />
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-8 transition-colors duration-300">
            {/* Lock Icon */}
            <div className="w-20 h-20 bg-linear-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-violet-200 dark:border-violet-700">
              <Lock className="w-10 h-10 text-violet-600 dark:text-violet-400" />
            </div>
            
            {/* Message */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              To access your personalized AI experience and start conversations, 
              please sign in to your account or create a new one.
            </p>
            
            {/* Action Buttons */}
            <div className="space-y-4 mb-8">
              <Link href="/sign-in">
                <Button className="w-full h-12 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/25">
                  <span>Sign In to Continue</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <Link href="/sign-up">
                <Button 
                  variant="outline" 
                  className="w-full h-12 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-violet-300 dark:hover:border-violet-500 font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] text-gray-700 dark:text-gray-200"
                >
                  Create New Account
                </Button>
              </Link>
            </div>

            {/* Quick Access */}
            {/* <div className="text-center">
              <Link 
                href="/forgot-password" 
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors duration-200"
              >
                Forgot your password?
              </Link>
            </div> */}
          </div>
          
          {/* Features Preview */}
         

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trusted by thousands of users worldwide
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}