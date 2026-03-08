'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  User, 
  Shield, 
  HelpCircle, 
  Moon, 
  Sun, 
  Monitor, 
  Palette, 
  Globe, 
  Crown,
  Zap,
  Calendar,
  CreditCard,
  Trash2,
  AlertTriangle,
  Bug,
  FileText,
  X,
  Check,
  Loader2,
  Mail,
  Clock3,
  Fingerprint,
  Info,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Bell,
  Zap as MotionIcon,
  Key,
  Lock,
  LogOut,
  Activity,
  Laptop,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Wifi,
  ClipboardList
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { updateProfile } from 'firebase/auth';
import {
  DEFAULT_GENERAL_PREFS,
  applyAccentToDocument,
  applyGeneralPreferencesToDocument,
  loadGeneralPreferences,
  saveGeneralPreferences,
  setGeneralPreference,
} from '@/lib/user-preferences';

const SettingsModal = ({ isOpen, onClose }) => {
  const { currentUser, logout } = useAuth();
  const userContext = useUser();
  
  // Debug logging
  console.log('SettingsModal userContext:', userContext);
  
  const { 
    userData, 
    updateUserData = async () => {
      console.warn('updateUserData fallback called - context may not be available');
    }, 
    refreshUserData = async () => {},
    plan = 'free', 
    credits = 0, 
    isPro = false, 
    isSpecialAccount = false 
  } = userContext || {};
  
  const { isDarkMode, toggleTheme, setThemeMode } = useTheme();
  
  // Form states
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bugReport, setBugReport] = useState({ title: '', description: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [generalPrefs, setGeneralPrefs] = useState(DEFAULT_GENERAL_PREFS);
  
  // MFA states
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  // Local optimistic override: null = use DB value, true/false = instant UI update
  const [mfaEnabledLocal, setMfaEnabledLocal] = useState(null);

  // Derived MFA status — prefers the local optimistic value so the UI
  // updates instantly after enable/disable without waiting for a DB re-fetch.
  const isMfaEnabled = mfaEnabledLocal !== null ? mfaEnabledLocal : !!userData?.mfa_enabled;

  // Password reset states
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

  // MFA dev OTP (shown in UI during development when SMTP isn't configured)
  const [devOtp, setDevOtp] = useState('');

  // Login activity (fetched from API)
  const [loginActivity, setLoginActivity] = useState([]);
  const [loginActivityLoading, setLoginActivityLoading] = useState(false);
  const [loginActivityFetched, setLoginActivityFetched] = useState(false);

  // Session info — accurate UA parsing
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
  
  // Subscription states - use the new hook
  const subscription = useSubscription(currentUser?.email);
  
  // Determine effective subscription status
  const effectiveSubscription = {
    plan: subscription.effectivePlan || plan,
    isPro: subscription.isPro || isPro,
    isActive: subscription.isActive,
    credits: credits || 0,
    monthlyCredits: subscription.monthlyCredits,
    monthlyPrice: subscription.monthlyPrice,
    statusMessage: subscription.statusMessage,
    daysRemaining: subscription.details?.daysRemaining,
    endDate: subscription.details?.endDate,
    loading: subscription.loading
  };

  // Handle theme change
  const handleThemeChange = (theme) => {
    if (setThemeMode) {
      setThemeMode(theme);
      return;
    }

    if (theme === 'system') {
      return;
    } else {
      const isDark = theme === 'dark';
      if (isDark !== isDarkMode) {
        toggleTheme();
      }
    }
  };

  // Handle accent color change
  const handleAccentColorChange = async (color) => {
    if (!updateUserData) {
      console.error('updateUserData function not available');
      return;
    }
    
    try {
      await updateUserData({ accent_color: color });
      applyAccentToDocument(color);
      setSuccessMessage('Accent color updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update accent color:', error);
    }
  };

  // Handle language change
  const handleLanguageChange = async (language) => {
    if (!updateUserData) {
      console.error('updateUserData function not available');
      return;
    }
    
    try {
      await updateUserData({ language });
      setSuccessMessage('Language updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  const updateGeneralPreference = (key, value) => {
    setGeneralPrefs((prev) => {
      const next = setGeneralPreference(key, value);
      try {
        applyGeneralPreferencesToDocument(next);
      } catch (error) {
        console.warn('Failed to apply general settings:', error);
      }
      return next;
    });
  };

  const resetGeneralSettings = async () => {
    setPreferencesLoading(true);
    try {
      const resetPrefs = { ...DEFAULT_GENERAL_PREFS };
      setGeneralPrefs(resetPrefs);
      saveGeneralPreferences(resetPrefs);
      applyGeneralPreferencesToDocument(resetPrefs);

      if (setThemeMode) {
        setThemeMode('light');
      } else if (isDarkMode) {
        toggleTheme();
      }

      await updateUserData({
        accent_color: 'violet',
        language: 'en',
      });
      applyAccentToDocument('violet');

      setSuccessMessage('General settings restored to defaults.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to reset general settings:', error);
      setSuccessMessage('Could not reset all settings. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setPreferencesLoading(false);
    }
  };

  // Handle MFA setup - send OTP
  const handleMfaSendOtp = async () => {
    if (!mfaEmail || !mfaEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setMfaLoading(true);
      setDevOtp('');
      const response = await fetch('/api/auth/send-mfa-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: mfaEmail,
          userEmail: currentUser.email 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setSuccessMessage(data.message || 'OTP sent! Please check your inbox.');
        setTimeout(() => setSuccessMessage(''), 5000);
        // Show devOTP in UI during development when SMTP isn't configured
        if (data.devOTP) setDevOtp(data.devOTP);
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('MFA OTP send error:', error);
      alert(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  // Handle MFA verification
  const handleMfaVerify = async () => {
    if (!mfaOtp || mfaOtp.length !== 6) {
      alert('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setMfaLoading(true);

      // Pass enableMfa:true so the server atomically updates
      // mfa_enabled=true in Appwrite (admin SDK) before responding.
      const response = await fetch('/api/auth/verify-mfa-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: mfaOtp,
          email: mfaEmail,
          userEmail: currentUser.email,
          enableMfa: true,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      // Instantly flip local state so the badge turns green NOW.
      setMfaEnabledLocal(true);

      // Also persist to DB (which will update UserContext properly now via our merge fix)
      const result = await updateUserData({ mfa_enabled: true, mfa_email: mfaEmail });
      // console.log('=== MFA DEBUG ===');
      // console.log('updateUserData result:', result);
      // console.log('result.mfa_enabled:', result?.mfa_enabled);
      // console.log('userData after update:', userData);

      setSuccessMessage('MFA enabled successfully! Your account is now more secure. 🛡️');
      setShowMfaSetup(false);
      setMfaEmail('');
      setMfaOtp('');
      setOtpSent(false);
      setDevOtp('');
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (error) {
      console.error('MFA verification error:', error);
      alert(error.message || 'OTP verification failed. Please try again.');
      setMfaOtp('');
    } finally {
      setMfaLoading(false);
    }
  };

  // Handle MFA disable
  const handleMfaDisable = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return;
    }

    try {
      setLoading(true);
      // Instantly flip local state so the badge turns grey NOW.
      setMfaEnabledLocal(false);
      await updateUserData({ mfa_enabled: false, mfa_email: null });
      setSuccessMessage('MFA disabled successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('MFA disable error:', error);
      alert('Failed to disable MFA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle MFA toggle - main function called by UI
  const handleMFAToggle = async () => {
    if (isMfaEnabled) {
      handleMfaDisable();
    } else {
      setShowMfaSetup(true);
    }
  };

  // Handle navigation to help pages
  const handleNavigateToPage = (path) => {
    window.open(path, '_blank');
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;

    try {
      setLoading(true);
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email })
      });

      if (response.ok) {
        await logout();
        onClose();
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle bug report submission
  const handleBugReportSubmit = async (e) => {
    e.preventDefault();
    if (!bugReport.title.trim() || !bugReport.description.trim()) return;

    try {
      setLoading(true);
      const response = await fetch('/api/support/bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bugReport.title,
          description: bugReport.description,
          user_email: currentUser.email
        })
      });

      if (response.ok) {
        setBugReport({ title: '', description: '' });
        setSuccessMessage('Bug report submitted successfully. Thanks for helping us improve!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        throw new Error('Failed to submit bug report');
      }
    } catch (error) {
      console.error('Bug report submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const accentColors = [
    { name: 'Violet', value: 'violet', color: 'bg-violet-500' },
    { name: 'Blue', value: 'blue', color: 'bg-blue-500' },
    { name: 'Emerald', value: 'emerald', color: 'bg-emerald-500' },
    { name: 'Amber', value: 'amber', color: 'bg-amber-500' },
    { name: 'Rose', value: 'rose', color: 'bg-rose-500' },
    { name: 'Indigo', value: 'indigo', color: 'bg-indigo-500' }
  ];

  useEffect(() => {
    setDisplayNameInput((userData?.name || currentUser?.displayName || '').trim());
  }, [isOpen, userData?.name, currentUser?.displayName]);

  // Refresh user data from DB every time the modal opens — ensures the Security
  // tab always shows the latest mfa_enabled status, not stale cached state.
  // When modal closes, reset local optimistic state so next open uses fresh DB data.
  useEffect(() => {
    if (!isOpen) {
      setMfaEnabledLocal(null); // Reset on close: fall back to DB value next time
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;

    try {
      const prefs = loadGeneralPreferences();
      setGeneralPrefs(prefs);
      applyGeneralPreferencesToDocument(prefs);
    } catch (error) {
      console.warn('Failed to load general settings from localStorage:', error);
      setGeneralPrefs(DEFAULT_GENERAL_PREFS);
    }
  }, [isOpen]);

  // Fetch login activity when modal opens (lazy — only once per session)
  useEffect(() => {
    if (!isOpen || loginActivityFetched || !currentUser?.email) return;
    const fetchActivity = async () => {
      setLoginActivityLoading(true);
      try {
        const res = await fetch(`/api/auth/login-activity?email=${encodeURIComponent(currentUser.email)}`);
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
  }, [isOpen, currentUser?.email, loginActivityFetched]);

  const handleDisplayNameSave = async () => {
    const nextName = displayNameInput.trim();

    if (!nextName) {
      setSuccessMessage('Display Name cannot be empty.');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    if (nextName.length > 120) {
      setSuccessMessage('Display Name must be 120 characters or less.');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    if (!updateUserData) {
      console.error('updateUserData function not available');
      return;
    }

    try {
      setProfileLoading(true);
      const updatedProfile = await updateUserData({ name: nextName });
      if (currentUser) {
        try {
          await updateProfile(currentUser, { displayName: nextName });
          await currentUser.reload();
        } catch (firebaseError) {
          console.warn('Failed to sync Firebase displayName:', firebaseError);
        }
      }
      await refreshUserData();
      setDisplayNameInput((updatedProfile?.name || nextName).trim());
      setSuccessMessage('Display Name updated successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update display name:', error);
      setSuccessMessage('Failed to update Display Name. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setProfileLoading(false);
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
    if (providerId === 'phone') return 'Phone Number';
    return providerId;
  };

  const providers = currentUser?.providerData?.length
    ? currentUser.providerData
    : currentUser?.providerId
      ? [{ providerId: currentUser.providerId, uid: currentUser.uid, email: currentUser.email }]
      : [];

  const primaryProvider = providers[0]?.providerId || null;
  const loginMethodText = primaryProvider
    ? getProviderLabel(primaryProvider)
    : 'Not available';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[oklch(0.209_0_0)]">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6" />
              <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
            </div>
            {/* <Button onClick={onClose} variant="ghost" size="sm" className="p-2">
              <X className="w-4 h-4" />
            </Button> */}
          </div>
          <DialogDescription>
            Manage your account preferences, security settings, and more
          </DialogDescription>
        </DialogHeader>

        {successMessage && (
          <div className="bg-green-50 dark:bg-[oklch(0.2478_0_0)] border border-green-200 dark:border-green-600 rounded-lg p-3 mb-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-green-700 dark:text-green-300 text-sm">{successMessage}</span>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 dark:bg-[oklch(0.209_0_0)]">
          <Tabs defaultValue="general" className="space-y-6 ">
            <TabsList className="grid w-full grid-cols-4 dark:bg-[oklch(0.2478_0_0)]">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Help
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-6 ">
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 ">
                    <Palette className="w-5 h-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize how ChatBox AI looks and feels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Selection */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Theme</h4>
                    <div className="flex gap-2">
                      <Button
                        variant={isDarkMode ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleThemeChange('light')}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Sun className="w-4 h-4" />
                        Light
                      </Button>
                      <Button
                        variant={isDarkMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleThemeChange('dark')}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Moon className="w-4 h-4" />
                        Dark
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleThemeChange('system')}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Monitor className="w-4 h-4" />
                        System
                      </Button>
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Accent Color</h4>
                    <div className="flex gap-2 flex-wrap">
                      {accentColors.map((color) => (
                        <Button
                          key={color.value}
                          variant={userData?.accent_color === color.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAccentColorChange(color.value)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div className={`w-3 h-3 rounded-full ${color.color}`} />
                          {color.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Language</h4>
                    <div className="flex gap-2">
                      <Button
                        variant={userData?.language === 'en' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleLanguageChange('en')}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Globe className="w-4 h-4" />
                        English
                      </Button>
                      <Button
                        variant={userData?.language === 'hi' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleLanguageChange('hi')}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Globe className="w-4 h-4" />
                        हिंदी
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 bg-gray-50 dark:bg-[oklch(0.2478_0_0)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Current Look</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Theme: {isDarkMode ? 'Dark' : 'Light'}</Badge>
                      <Badge variant="outline">Accent: {userData?.accent_color || 'violet'}</Badge>
                      <Badge variant="outline">Language: {userData?.language === 'hi' ? 'Hindi' : 'English'}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5" />
                    Experience
                  </CardTitle>
                  <CardDescription>
                    Personal behavior settings for your workspace experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium">Compact Layout</p>
                      <p className="text-xs text-muted-foreground">Denser spacing for more content on screen</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={generalPrefs.compactMode ? 'default' : 'outline'}
                      onClick={() => updateGeneralPreference('compactMode', !generalPrefs.compactMode)}
                      className="cursor-pointer"
                    >
                      {generalPrefs.compactMode ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <MotionIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Reduced Motion</p>
                        <p className="text-xs text-muted-foreground">Minimize animations for focused use</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={generalPrefs.reducedMotion ? 'default' : 'outline'}
                      onClick={() => updateGeneralPreference('reducedMotion', !generalPrefs.reducedMotion)}
                      className="cursor-pointer"
                    >
                      {generalPrefs.reducedMotion ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Sound Effects</p>
                        <p className="text-xs text-muted-foreground">Play interaction sounds for alerts and actions</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={generalPrefs.soundEffects ? 'default' : 'outline'}
                      onClick={() => updateGeneralPreference('soundEffects', !generalPrefs.soundEffects)}
                      className="cursor-pointer"
                    >
                      {generalPrefs.soundEffects ? 'On' : 'Off'}
                    </Button>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetGeneralSettings}
                      disabled={preferencesLoading}
                      className="cursor-pointer"
                    >
                      {preferencesLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore Defaults
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-6">
              {/* Account Details */}
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Account Details
                  </CardTitle>
                  <CardDescription>
                    Profile information and authentication details for your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Display Name</h4>
                    <p className="text-xs text-muted-foreground">
                      Set your public display name. You can change it anytime.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        placeholder="Enter your display name"
                        maxLength={120}
                        className="sm:max-w-md"
                      />
                      <Button
                        type="button"
                        onClick={handleDisplayNameSave}
                        disabled={profileLoading || !displayNameInput.trim()}
                        className="cursor-pointer"
                      >
                        {profileLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Name'
                        )}
                      </Button>
                    </div>
                    {!userData?.name && !currentUser?.displayName && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        You do not have a Display Name set yet. Please add one.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-[oklch(0.2478_0_0)] border">
                      <p className="text-xs text-muted-foreground">Display Name</p>
                      <p className="font-medium mt-1">{userData?.name || currentUser?.displayName || 'Not set'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-[oklch(0.2478_0_0)] border">
                      <p className="text-xs text-muted-foreground">Email Address</p>
                      <p className="font-medium mt-1 break-all">{currentUser?.email || 'Not available'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-[oklch(0.2478_0_0)] border">
                      <p className="text-xs text-muted-foreground">Email Verification</p>
                      <div className="mt-1">
                        <Badge variant={currentUser?.emailVerified ? 'default' : 'secondary'}>
                          {currentUser?.emailVerified ? 'Verified' : 'Not Verified'}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-[oklch(0.2478_0_0)] border">
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <p className="font-mono text-xs mt-1 break-all">{currentUser?.uid || 'Not available'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Fingerprint className="w-4 h-4" />
                      Login and Access
                    </h4>
                    <div className="space-y-3">
                      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 p-3 border rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Primary Login Method</span>
                        </div>
                        <Badge variant="outline">{loginMethodText}</Badge>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 p-3 border rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock3 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Account Created</span>
                        </div>
                        <span className="text-sm text-right wrap-break-word sm:max-w-[55%]">{formatDateTime(currentUser?.metadata?.creationTime)}</span>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 p-3 border rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock3 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Last Sign-in</span>
                        </div>
                        <span className="text-sm text-right wrap-break-word sm:max-w-[55%]">{formatDateTime(currentUser?.metadata?.lastSignInTime)}</span>
                      </div>
                    </div>
                  </div>

                  {providers.length > 1 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Linked Sign-in Providers
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {providers.map((provider) => (
                          <Badge key={`${provider.providerId}-${provider.uid || provider.email || 'provider'}`} variant="secondary">
                            {getProviderLabel(provider.providerId)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Plan Information */}
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {effectiveSubscription.isPro ? <Crown className="w-5 h-5 text-amber-500" /> : <Zap className="w-5 h-5" />}
                    Subscription Plan
                  </CardTitle>
                  <CardDescription>
                    Manage your current plan and billing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {effectiveSubscription.loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading subscription details...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-[oklch(0.2478_0_0)] rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {effectiveSubscription.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                            </h3>
                            <Badge variant={effectiveSubscription.plan === 'pro' ? "default" : "secondary"}>
                              {effectiveSubscription.isActive && effectiveSubscription.plan === 'pro' ? 'Active' : 'Current'}
                            </Badge>
                            {isSpecialAccount && (
                              <Badge variant="outline" className="text-amber-600">
                                Special Account
                              </Badge>
                            )}
                            {effectiveSubscription.daysRemaining > 0 && effectiveSubscription.daysRemaining <= 7 && (
                              <Badge variant="destructive" className="text-xs">
                                Expires in {effectiveSubscription.daysRemaining} days
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {effectiveSubscription.credits.toLocaleString()} credits remaining this month
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {effectiveSubscription.monthlyCredits.toLocaleString()} credits per month
                          </p>
                          {effectiveSubscription.endDate && effectiveSubscription.plan === 'pro' && (
                            <p className="text-xs text-muted-foreground">
                              {effectiveSubscription.isActive ? 
                                `Expires: ${new Date(effectiveSubscription.endDate).toLocaleDateString()}` :
                                `Expired: ${new Date(effectiveSubscription.endDate).toLocaleDateString()}`
                              }
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ₹{effectiveSubscription.monthlyPrice.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">per month</p>
                        </div>
                      </div>

                      {/* Pro Plan Management Options */}
                      {/* {effectiveSubscription.isPro && !isSpecialAccount && (
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="cursor-pointer">
                            <Calendar className="w-4 h-4 mr-2" />
                            Manage Billing
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 cursor-pointer">
                            <X className="w-4 h-4 mr-2" />
                            Cancel Subscription
                          </Button>
                        </div>
                      )} */}

                      {/* Special Account Status */}
                      {isSpecialAccount && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                              Special Account - Permanent Pro Access
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Upgrade Button for Free Users */}
                      {!effectiveSubscription.isPro && !isSpecialAccount && (
                        <Button 
                          className="w-full cursor-pointer bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                          onClick={() => {
                            onClose(); // Close settings modal
                            // You can trigger the packages modal here if needed
                          }}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade to Pro
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Account Deletion */}
              <Card className="border-red-200 dark:border-red-800 dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader >
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Permanently delete your account and all associated data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showDeleteConfirm ? (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  ) : (
                    <div className="space-y-4 p-4 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-600">This action cannot be undone</h4>
                          <p className="text-sm text-muted-foreground">
                            This will permanently delete your account, subscription, and all associated data.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Type "DELETE" to confirm:
                        </label>
                        <Input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder="DELETE"
                          className="font-mono"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirm !== 'DELETE' || loading}
                          className="flex-1 cursor-pointer"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Delete Forever
                        </Button>
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirm('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">

              {/* Security Overview */}
              {/* <Card className="dark:bg-[oklch(0.2478_0_0)] border-0 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-[oklch(0.2478_0_0)] dark:to-[oklch(0.22_0.02_240)]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                    Security Overview
                  </CardTitle>
                  <CardDescription>
                    Your account security status at a glance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${
                      currentUser?.emailVerified
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    }`}>
                      {currentUser?.emailVerified
                        ? <ShieldCheck className="w-6 h-6 text-green-500" />
                        : <ShieldAlert className="w-6 h-6 text-amber-500" />}
                      <p className="text-xs font-medium text-center">{currentUser?.emailVerified ? 'Email Verified' : 'Email Not Verified'}</p>
                    </div>
                    <div className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${
                      isMfaEnabled
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700'
                    }`}>
                      {isMfaEnabled
                        ? <ShieldCheck className="w-6 h-6 text-green-500" />
                        : <ShieldOff className="w-6 h-6 text-slate-400" />}
                      <p className="text-xs font-medium text-center">{isMfaEnabled ? 'MFA Active' : 'MFA Inactive'}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <Wifi className="w-6 h-6 text-green-500" />
                      <p className="text-xs font-medium text-center">Session Secure</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Security Checklist</h4>
                    {[
                      { label: 'Email address verified', done: !!currentUser?.emailVerified },
                      { label: 'Two-factor authentication (MFA) enabled', done: isMfaEnabled },
                      { label: 'Signed in with a trusted provider', done: !!currentUser?.providerData?.length },
                      { label: 'Account is active and in good standing', done: true },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        {item.done
                          ? <Check className="w-4 h-4 text-green-500 shrink-0" />
                          : <X className="w-4 h-4 text-amber-400 shrink-0" />}
                        <span className={`text-sm ${item.done ? '' : 'text-muted-foreground'}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card> */}

              {/* Multi-Factor Authentication */}
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5" />
                    Multi-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security with Gmail OTP verification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg border">
                    <div className="flex items-center gap-3">
                      {isMfaEnabled
                        ? <ShieldCheck className="w-8 h-8 text-green-500" />
                        : <ShieldOff className="w-8 h-8 text-slate-400" />}
                      <div>
                        <h3 className="font-semibold text-sm">MFA Status</h3>
                        <p className="text-xs text-muted-foreground">
                          {isMfaEnabled
                            ? `Protected via ${userData?.mfa_email || 'Gmail OTP'}`
                            : 'Your account is not protected with MFA'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isMfaEnabled ? 'default' : 'secondary'}>
                      {isMfaEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  {!isMfaEnabled && !showMfaSetup && (
                    <Button onClick={handleMFAToggle} className="cursor-pointer" disabled={loading}>
                      <Shield className="w-4 h-4 mr-2" />
                      Enable MFA
                    </Button>
                  )}

                  {isMfaEnabled && (
                    <Button onClick={handleMFAToggle} className="cursor-pointer" disabled={loading} variant="destructive">
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldOff className="w-4 h-4 mr-2" />}
                      Disable MFA
                    </Button>
                  )}

                  {showMfaSetup && !isMfaEnabled && (
                    <div className="space-y-4 p-4 border rounded-lg bg-blue-50/30 dark:bg-blue-900/10">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <h4 className="font-medium text-sm">Setup Multi-Factor Authentication</h4>
                      </div>

                      {!otpSent ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Email address for OTP verification:</label>
                            <Input
                              type="email"
                              value={mfaEmail}
                              onChange={(e) => setMfaEmail(e.target.value)}
                              placeholder="your-email@example.com"
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">We&apos;ll send a 6-digit one-time code to this address.</p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleMfaSendOtp} disabled={mfaLoading || !mfaEmail.includes('@')} className="cursor-pointer">
                              {mfaLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                              Send OTP
                            </Button>
                            <Button variant="outline" onClick={() => { setShowMfaSetup(false); setMfaEmail(''); setDevOtp(''); }} className="cursor-pointer">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">6-digit OTP sent to <span className="font-semibold">{mfaEmail}</span>:</label>
                            <Input
                              type="text"
                              value={mfaOtp}
                              onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="123456"
                              className="w-full text-center text-lg tracking-widest font-mono"
                              maxLength={6}
                            />
                            <p className="text-xs text-muted-foreground">Check your inbox and enter the 6-digit code below.</p>
                            {/* Dev-only OTP hint — shown when SMTP isn't configured */}
                            {devOtp && (
                              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-md">
                                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                  <span className="font-semibold">Dev mode:</span> OTP is <span className="font-mono font-bold tracking-widest">{devOtp}</span> (email not sent — configure SMTP_USER/SMTP_PASS)
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={handleMfaVerify} disabled={mfaLoading || mfaOtp.length !== 6} className="cursor-pointer">
                              {mfaLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                              Verify & Enable
                            </Button>
                            <Button variant="outline" onClick={handleMfaSendOtp} disabled={mfaLoading} className="cursor-pointer">
                              Resend OTP
                            </Button>
                            <Button variant="outline" onClick={() => { setShowMfaSetup(false); setOtpSent(false); setMfaEmail(''); setMfaOtp(''); setDevOtp(''); }} className="cursor-pointer">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Password & Authentication */}
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Password & Authentication
                  </CardTitle>
                  <CardDescription>
                    Manage your login credentials and sign-in methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Login Method Info */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[oklch(0.22_0_0)] border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Current Sign-in Method</span>
                      </div>
                      <Badge variant="outline">{loginMethodText}</Badge>
                    </div>
                  </div>

                  {/* Password Reset */}
                  {(primaryProvider === 'password' || !primaryProvider) && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium">Password Reset</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Send a password reset link to your registered email address.</p>
                      </div>
                      {passwordResetSent ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          <p className="text-sm text-green-700 dark:text-green-300">Password reset email sent! Check your inbox.</p>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          disabled={passwordResetLoading}
                          onClick={async () => {
                            try {
                              setPasswordResetLoading(true);
                              const { sendPasswordResetEmail, getAuth } = await import('firebase/auth');
                              const auth = getAuth();
                              await sendPasswordResetEmail(auth, currentUser.email);
                              setPasswordResetSent(true);
                              setTimeout(() => setPasswordResetSent(false), 30000);
                            } catch (err) {
                              console.error('Password reset error:', err);
                            } finally {
                              setPasswordResetLoading(false);
                            }
                          }}
                        >
                          {passwordResetLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                          Send Password Reset Email
                        </Button>
                      )}
                    </div>
                  )}

                  {primaryProvider === 'google.com' && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          You sign in with Google. To change your password, manage it through your Google account settings.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Linked Providers */}
                  {providers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Fingerprint className="w-4 h-4" />
                        Linked Sign-in Providers
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {providers.map((provider) => (
                          <Badge key={`${provider.providerId}-${provider.uid || provider.email || 'p'}`} variant="secondary">
                            {getProviderLabel(provider.providerId)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Session */}
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Laptop className="w-5 h-5" />
                    Current Session
                  </CardTitle>
                  <CardDescription>
                    Details about your active browser session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[oklch(0.22_0_0)] border">
                      <p className="text-xs text-muted-foreground">Browser</p>
                      <p className="text-sm font-medium mt-0.5">{sessionInfo.browser}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[oklch(0.22_0_0)] border">
                      <p className="text-xs text-muted-foreground">Platform</p>
                      <p className="text-sm font-medium mt-0.5">{sessionInfo.platform}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[oklch(0.22_0_0)] border">
                      <p className="text-xs text-muted-foreground">Session Started</p>
                      <p className="text-sm font-medium mt-0.5">{sessionInfo.sessionStart}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[oklch(0.22_0_0)] border">
                      <p className="text-xs text-muted-foreground">Connection</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                        <p className="text-sm font-medium">Secure (HTTPS)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Login Activity */}
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Login Activity
                  </CardTitle>
                  <CardDescription>
                    Recent account sign-in history from tracked sessions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Current active session — always shown */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[oklch(0.22_0_0)] border">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">{sessionInfo.browser} on {sessionInfo.platform}</p>
                      <p className="text-xs text-muted-foreground">{sessionInfo.sessionStart}</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-300 shrink-0">Active</Badge>
                  </div>

                  {/* Real activity from Appwrite */}
                  {loginActivityLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading activity...</span>
                    </div>
                  ) : loginActivity.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-1 text-muted-foreground">
                      <Activity className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No recorded logins yet.</p>
                      <p className="text-xs opacity-70">Activity is tracked after your next sign-in.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {loginActivity.map((event, idx) => {
                        const methodLabel = {
                          google: 'Google Sign-In',
                          email_password: 'Email & Password',
                          email_signup: 'Account Created',
                          unknown: 'Unknown',
                        }[event.method] || event.method || 'Sign-In';

                        return (
                          <div key={event.$id || idx} className="flex items-start gap-3 p-3 rounded-lg border">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{methodLabel}</p>
                              <p className="text-xs text-muted-foreground">
                                {event.browser || 'Unknown'} on {event.platform || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {event.login_at ? formatDateTime(event.login_at) : '—'}
                              </p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-xs">Past</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      If you notice unfamiliar activity, reset your password immediately.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Help & Support */}
            <TabsContent value="help" className="space-y-6">
              {/* Bug Report */}
              {/* <Card className="dark:bg-[oklch(0.2478_0_0)]"> */}
                {/* <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bug className="w-5 h-5" />
                    Report a Bug
                  </CardTitle>
                  <CardDescription>
                    Help us improve by reporting issues you encounter
                  </CardDescription>
                </CardHeader> */}
                {/* <CardContent>
                  <form onSubmit={handleBugReportSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="bug-title" className="text-sm font-medium">
                        Bug Title *
                      </label>
                      <Input
                        id="bug-title"
                        value={bugReport.title}
                        onChange={(e) => setBugReport(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Briefly describe the issue"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="bug-description" className="text-sm font-medium">
                        Description *
                      </label>
                      <textarea
                        id="bug-description"
                        value={bugReport.description}
                        onChange={(e) => setBugReport(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Provide detailed steps to reproduce the bug..."
                        className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        required
                      />
                    </div>
                    <Button type="submit" className="cursor-pointer" disabled={loading || !bugReport.title.trim() || !bugReport.description.trim()}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Bug className="w-4 h-4 mr-2" />
                      )}
                      Submit Bug Report
                    </Button>
                  </form>
                </CardContent> */}
              {/* </Card> */}

              {/* Help Resources */}
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Help Resources
                  </CardTitle>
                  <CardDescription>
                    Get help and learn more about ChatBox AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start cursor-pointer"
                    onClick={() => handleNavigateToPage('/help-center')}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help Center
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start cursor-pointer"
                    onClick={() => handleNavigateToPage('/terms-conditions')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Terms & Conditions
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start cursor-pointer"
                    onClick={() => handleNavigateToPage('/privacy-policy')}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy Policy
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;