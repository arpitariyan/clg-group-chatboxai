'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Trash2, AlertTriangle, Loader2, Sparkles, Copy, Check } from '@/components/ui/animated-icon';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useSubscription } from '@/hooks/useSubscription';
import { updateProfile } from 'firebase/auth';
import { toast } from '@/lib/alert';
import { authFetch } from '@/lib/auth-fetch';
import { getPlanAnnualPrice, getPlanDisplayName, getPlanMonthlyPrice, getPlanPaidCredits, normalizePlan } from '@/lib/subscriptionPlans';

export default function AccountSettings() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const { userData, updateUserData, refreshUserData, plan = 'free', credits = 0, paidCredits = 0, isPro = false, isSpecialAccount = false } = useUser() || {};
  
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopyUid = () => {
    if (!currentUser?.uid) return;
    navigator.clipboard.writeText(currentUser.uid);
    setCopiedUid(true);
    toast.success('User ID copied to clipboard');
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const subscription = useSubscription(
    currentUser?.email,
    `${userData?.plan || ''}|${userData?.subscription_start_date || ''}|${userData?.subscription_end_date || ''}|${userData?.credits || ''}`
  );

  const resolvedPlan = subscription.loading
    ? normalizePlan(userData?.plan || plan)
    : normalizePlan(subscription.effectivePlan || userData?.plan || plan);

  const isPaidPlan = resolvedPlan === 'pro' || resolvedPlan === 'max';

  // Both wallets are tracked separately and shown independently in the UI.
  // Daily free credits (5,000/day) — applies to ALL plans, used for free-tier models.
  const dailyFreeCredits = userData?.credits ?? credits ?? 0;
  // Monthly paid credits — only Pro/Max plans; used for paid-tier models.
  const monthlyPaidCredits = userData?.paid_credits ?? paidCredits ?? 0;
  // Allocation that paid credits reset to on the next billing cycle.
  const paidResetAllocation = getPlanPaidCredits(resolvedPlan);
  // TODO: pull this from getPlanDailyCredits('free') once a helper exists in subscriptionPlans.js
  const FREE_DAILY_ALLOCATION = 5000;

  const effectiveSubscription = {
    plan: resolvedPlan,
    isPro: resolvedPlan === 'pro',
    isMax: resolvedPlan === 'max',
    isActive: subscription.loading ? resolvedPlan !== 'free' : subscription.isActive,
    dailyFreeCredits,
    monthlyPaidCredits,
    paidResetAllocation,
    isPaidPlan,
    monthlyPrice: getPlanMonthlyPrice(resolvedPlan),
    annualPrice: getPlanAnnualPrice(resolvedPlan),
    statusMessage: subscription.statusMessage,
    daysRemaining: subscription.details?.daysRemaining,
    endDate: subscription.details?.endDate,
    loading: subscription.loading
  };

  const currentPlanLabel = getPlanDisplayName(effectiveSubscription.plan);

  useEffect(() => {
    setDisplayNameInput((userData?.name || currentUser?.displayName || '').trim());
  }, [userData?.name, currentUser?.displayName]);

  const handleDisplayNameSave = async () => {
    const nextName = displayNameInput.trim();
    if (!nextName) return toast.error('Display Name cannot be empty.');
    if (nextName.length > 120) return toast.error('Display Name must be 120 characters or less.');

    try {
      setProfileLoading(true);
      if (updateUserData) {
        await updateUserData({ name: nextName });
      }
      if (currentUser) {
        try {
          await updateProfile(currentUser, { displayName: nextName });
          await currentUser.reload();
        } catch (error) {
          console.warn('Failed to sync Firebase displayName:', error);
        }
      }
      if (refreshUserData) await refreshUserData();
      setDisplayNameInput(nextName);
      toast.success('Display Name updated');
    } catch (error) {
      console.error('Failed to update display name:', error);
      toast.error('Failed to update Display Name.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    try {
      setLoading(true);
      const response = await authFetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser?.email })
      });

      if (response.ok) {
        await logout();
        window.location.href = '/';
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Profile Section */}
      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Profile</h2>
          <p className="text-sm text-muted-foreground">Manage your personal information and display name.</p>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-3">
            <label className="text-sm font-medium">Display Name</label>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-xl">
              <Input
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Enter your display name"
                maxLength={120}
                className="flex-1 text-sm h-10"
              />
              <Button
                onClick={handleDisplayNameSave}
                disabled={profileLoading || !displayNameInput.trim()}
                className="w-full sm:w-auto text-xs sm:text-sm h-10 shrink-0"
              >
                {profileLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl">
            <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs space-y-1">
              <p className="text-xs sm:text-sm text-muted-foreground">Email Address</p>
              <p className="font-medium text-sm sm:text-base break-all">{currentUser?.email || 'Not available'}</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-muted-foreground">User ID</p>
                {currentUser?.uid && (
                  <button
                    onClick={handleCopyUid}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {copiedUid ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <p className="font-mono text-xs sm:text-sm break-all text-muted-foreground">{currentUser?.uid || 'Not available'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* Subscription Section */}
      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Subscription</h2>
          <p className="text-sm text-muted-foreground">Manage your current plan and billing details.</p>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs max-w-3xl">
          {effectiveSubscription.loading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading details...</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 sm:gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    {effectiveSubscription.isMax ? <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" /> : effectiveSubscription.isPro ? <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" /> : <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />}
                    <h3 className="text-base sm:text-lg font-semibold">
                      {currentPlanLabel}
                    </h3>
                    <Badge variant={effectiveSubscription.isPro || effectiveSubscription.isMax ? "default" : "secondary"} className="rounded-full px-2.5 py-0.5 text-xs">
                      {effectiveSubscription.isActive && (effectiveSubscription.isPro || effectiveSubscription.isMax) ? 'Active' : 'Current'}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3">
                    {/* Paid-model credits */}
                    {(effectiveSubscription.isPaidPlan || effectiveSubscription.monthlyPaidCredits > 0) && (
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-xs sm:text-sm font-medium text-foreground">
                          {effectiveSubscription.monthlyPaidCredits.toLocaleString()} paid-model credits remaining
                        </p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          {effectiveSubscription.isPaidPlan
                            ? `Resets to ${effectiveSubscription.paidResetAllocation.toLocaleString()} next billing cycle`
                            : 'Preserved from previous subscription (available until balance reaches zero)'}
                        </p>
                      </div>
                    )}

                    {/* Free-model credits */}
                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-xs sm:text-sm font-medium text-foreground">
                        {effectiveSubscription.dailyFreeCredits.toLocaleString()} free-model credits remaining
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">
                        Resets to 5,000 daily
                      </p>
                    </div>
                  </div>

                  {isSpecialAccount && (
                    <Badge variant="outline" className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-xs">
                      Special Account Access
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-baseline gap-2 md:block md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight">₹{effectiveSubscription.monthlyPrice.toLocaleString()}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground"> / month</span>
                  {effectiveSubscription.annualPrice ? (
                    <p className="text-xs text-muted-foreground block mt-0.5">₹{effectiveSubscription.annualPrice.toLocaleString()}/year</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row pt-5 sm:pt-6">
                <Button onClick={() => router.push('/pricing')} className="w-full sm:w-auto text-xs sm:text-sm">
                  {effectiveSubscription.isPro || effectiveSubscription.isMax ? 'Upgrade plan' : 'Choose a plan'}
                </Button>
                <Button variant="outline" asChild className="w-full sm:w-auto text-xs sm:text-sm">
                  <Link href="/pricing">View plans</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* Danger Zone */}
      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium text-red-600 dark:text-red-500 mb-1">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
        </div>

        <div className="max-w-xl">
          {!showDeleteConfirm ? (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          ) : (
            <div className="p-4 sm:p-5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 space-y-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm sm:text-base text-red-600 dark:text-red-500">This action cannot be undone</h4>
                  <p className="text-xs sm:text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                    This will permanently delete your account, subscription, and all associated data.
                  </p>
                </div>
              </div>
              <div className="space-y-2 pt-1">
                <label className="text-xs sm:text-sm font-medium text-red-900 dark:text-red-200">
                  Type "DELETE" to confirm
                </label>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono bg-white dark:bg-black/20 border-red-200 dark:border-red-800 focus-visible:ring-red-500 text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || loading}
                  className="w-full sm:flex-1 text-xs sm:text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Delete Forever
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirm('');
                  }}
                  className="w-full sm:flex-1 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
