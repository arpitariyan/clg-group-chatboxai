'use client';

import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';

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
    plan = 'free', 
    credits = 0, 
    isPro = false, 
    isSpecialAccount = false 
  } = userContext || {};
  
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Form states
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bugReport, setBugReport] = useState({ title: '', description: '' });
  const [successMessage, setSuccessMessage] = useState('');
  
  // MFA states
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  
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
    if (theme === 'system') {
      // For system theme, you'd need to implement system preference detection
      toggleTheme(); // For now, just toggle
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

  // Handle MFA setup - send OTP
  const handleMfaSendOtp = async () => {
    if (!mfaEmail || !mfaEmail.includes('@gmail.com')) {
      alert('Please enter a valid Gmail address');
      return;
    }

    try {
      setMfaLoading(true);
      const response = await fetch('/api/auth/send-mfa-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: mfaEmail,
          userEmail: currentUser.email 
        })
      });

      if (response.ok) {
        setOtpSent(true);
        setSuccessMessage('OTP sent to your Gmail address. Please check your inbox.');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (error) {
      console.error('MFA OTP send error:', error);
      alert('Failed to send OTP. Please try again.');
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
      const response = await fetch('/api/auth/verify-mfa-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: mfaOtp,
          email: mfaEmail,
          userEmail: currentUser.email
        })
      });

      if (response.ok) {
        await updateUserData({ 
          mfa_enabled: true,
          mfa_email: mfaEmail 
        });
        setSuccessMessage('MFA enabled successfully! Your account is now more secure.');
        setShowMfaSetup(false);
        setMfaEmail('');
        setMfaOtp('');
        setOtpSent(false);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        throw new Error('Invalid OTP');
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      alert('Invalid OTP. Please try again.');
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
      await updateUserData({ 
        mfa_enabled: false,
        mfa_email: null 
      });
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
    if (userData?.mfa_enabled) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-[oklch(0.209_0_0)]">
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

        <div className="flex-1 overflow-y-auto dark:bg-[oklch(0.209_0_0)]">
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
                  {/* <div className="space-y-3">
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
                  </div> */}

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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-6">
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
              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                {/* <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Multi-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account with Gmail OTP verification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-[oklch(0.2478_0_0)] rounded-lg">
                    <div>
                      <h3 className="font-semibold">MFA Status</h3>
                      <p className="text-sm text-muted-foreground">
                        {userData?.mfa_enabled ? `MFA is enabled with ${userData?.mfa_email || 'Gmail'}` : 'MFA is not enabled'}
                      </p>
                    </div>
                    <Badge variant={userData?.mfa_enabled ? "default" : "secondary"}>
                      {userData?.mfa_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  {!userData?.mfa_enabled && !showMfaSetup && (
                    <Button
                      onClick={handleMFAToggle}
                      className="cursor-pointer"
                      disabled={loading}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Enable MFA
                    </Button>
                  )}

                  {userData?.mfa_enabled && (
                    <Button
                      onClick={handleMFAToggle}
                      className="cursor-pointer"
                      disabled={loading}
                      variant="destructive"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Shield className="w-4 h-4 mr-2" />
                      )}
                      Disable MFA
                    </Button>
                  )}

              
                  {showMfaSetup && !userData?.mfa_enabled && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium">Setup Multi-Factor Authentication</h4>
                      
                      {!otpSent ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Enter Gmail address for OTP verification:
                            </label>
                            <Input
                              type="email"
                              value={mfaEmail}
                              onChange={(e) => setMfaEmail(e.target.value)}
                              placeholder="your-email@gmail.com"
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              We'll send a 6-digit verification code to this Gmail address
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleMfaSendOtp}
                              disabled={mfaLoading || !mfaEmail.includes('@gmail.com')}
                              className="cursor-pointer"
                            >
                              {mfaLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Shield className="w-4 h-4 mr-2" />
                              )}
                              Send OTP
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowMfaSetup(false);
                                setMfaEmail('');
                              }}
                              className="cursor-pointer"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Enter the 6-digit OTP sent to {mfaEmail}:
                            </label>
                            <Input
                              type="text"
                              value={mfaOtp}
                              onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="123456"
                              className="w-full text-center text-lg tracking-widest"
                              maxLength={6}
                            />
                            <p className="text-xs text-muted-foreground">
                              Please check your Gmail inbox and enter the verification code
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleMfaVerify}
                              disabled={mfaLoading || mfaOtp.length !== 6}
                              className="cursor-pointer"
                            >
                              {mfaLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              Verify & Enable MFA
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleMfaSendOtp}
                              disabled={mfaLoading}
                              className="cursor-pointer"
                            >
                              Resend OTP
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowMfaSetup(false);
                                setOtpSent(false);
                                setMfaEmail('');
                                setMfaOtp('');
                              }}
                              className="cursor-pointer"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent> */}
              </Card>

              <Card className="dark:bg-[oklch(0.2478_0_0)]">
                <CardHeader>
                  <CardTitle>Password & Authentication</CardTitle>
                  <CardDescription>
                    Manage your login credentials
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full cursor-pointer">
                    Reset Password
                  </Button>
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