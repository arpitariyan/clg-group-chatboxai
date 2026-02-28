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
      { strength: 3, label: 'Good', color: 'bg-emerald-500' },
      { strength: 4, label: 'Strong', color: 'bg-emerald-600' }
    ];

    return levels[strength];
  };

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: 'At least 8 characters' },
    { met: /[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password), text: 'Upper and lowercase letters' },
    { met: /\d/.test(formData.password), text: 'At least one number' },
    { met: /[^a-zA-Z\d]/.test(formData.password), text: 'At least one special character' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-x-hidden">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="cursor-pointer fixed top-4 right-4 sm:top-6 sm:right-6 z-50 rounded-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-all"
      >
        {isDarkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
      </Button>

      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6 sm:mb-8 px-2">
          {/* <div className="mb-4 sm:mb-6">
            <Image src="/Chatboxai_logo_main.png" alt="ChatBox AI" width={140} height={70} className="mx-auto sm:w-40 sm:h-20" />
          </div> */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Start your AI-powered journey today</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input id="fullName" name="fullName" type="text" value={formData.fullName} onChange={handleInputChange} placeholder="John Doe" className="pl-9 sm:pl-10 h-11 sm:h-12 text-sm sm:text-base bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg" required />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className="pl-9 sm:pl-10 h-11 sm:h-12 text-sm sm:text-base bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg" required />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleInputChange} placeholder="Create a strong password" className="pl-9 sm:pl-10 pr-10 sm:pr-12 h-11 sm:h-12 text-sm sm:text-base bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
              
              {formData.password && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: `${(passwordStrength.strength / 4) * 100}%` }} />
                    </div>
                    {passwordStrength.label && <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{passwordStrength.label}</span>}
                  </div>
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {req.met ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3 h-3 text-gray-400" />}
                        <span className={req.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm your password" className="pl-9 sm:pl-10 pr-10 sm:pr-12 h-11 sm:h-12 text-sm sm:text-base bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full cursor-pointer h-11 sm:h-12 text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm sm:text-base">Creating account...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2"><span className="text-sm sm:text-base">Create Account</span><ArrowRight className="w-4 h-4" /></div>
              )}
            </Button>
          </form>

          <div className="my-5 sm:my-6 flex items-center gap-3 sm:gap-4">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600" />
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600" />
          </div>

          <Button onClick={handleGoogleSignUp} disabled={loading} variant="outline" className="w-full cursor-pointer h-11 sm:h-12 text-sm sm:text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium shadow-sm hover:shadow-md transition-all">
            <FcGoogle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /><span className="text-sm sm:text-base">Continue with Google</span>
          </Button>

          <div className="mt-5 sm:mt-6 text-center">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Already have an account? </span>
            <Link href="/sign-in" className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">Sign in</Link>
          </div>
        </div>

        <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4 sm:mt-6 px-2">
          By signing up, you agree to our <Link href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms</Link> and <Link href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}