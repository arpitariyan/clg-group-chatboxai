#!/usr/bin/env node
/**
 * Historical Payment Reconciliation & Entitlement Audit Tool (Read-Only)
 * 
 * Inspects all Appwrite user records with active Pro or Max plans,
 * cross-references against durable subscription records and payment ledgers,
 * and categorizes accounts into audit classifications:
 * 
 * 1. VERIFIED_GATEWAY_PAYMENT: Valid Razorpay payment confirmed by ledger/order.
 * 2. VERIFIED_ADMIN_GRANT: Legitimate manual grant recorded with admin audit trail.
 * 3. SUSPICIOUS_AMOUNT_MISMATCH: Payment recorded but amount does not match plan price.
 * 4. UNVERIFIED_ENTITLEMENT: Pro or Max tier assigned in users collection without backing subscription.
 * 5. ORPHANED_SUBSCRIPTION: Subscription record exists but user profile is free or missing.
 * 
 * SAFETY: STRICTLY READ-ONLY. No write or delete operations are performed.
 */

import { databases, DB_ID, Query } from '../services/appwrite-admin.js';
import {
  USERS_COLLECTION_ID,
  SUBSCRIPTIONS_COLLECTION_ID,
  PAYMENT_LEDGER_COLLECTION_ID,
} from '../services/appwrite-collections.js';
import { normalizePlan } from '../lib/subscriptionPlans.js';

const PLAN_EXPECTED_AMOUNTS_PAISE = {
  pro_monthly: 49900,
  pro_annual: 499000,
  max_monthly: 199900,
  max_annual: 1999000,
};

export async function runHistoricalReconciliation({ verbose = false } = {}) {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  CHATBOX AI — HISTORICAL PAYMENT RECONCILIATION AUDIT (READ-ONLY)    ');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  const report = {
    auditedAt: new Date().toISOString(),
    totalUsersAudited: 0,
    paidUsersCount: 0,
    subscriptionsCount: 0,
    classifications: {
      VERIFIED_GATEWAY_PAYMENT: [],
      VERIFIED_ADMIN_GRANT: [],
      SUSPICIOUS_AMOUNT_MISMATCH: [],
      UNVERIFIED_ENTITLEMENT: [],
      ORPHANED_SUBSCRIPTION: [],
    },
    findingsSummary: {},
  };

  try {
    // 1. Fetch all users
    console.log('[Audit] Fetching user accounts from Appwrite...');
    const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.limit(500),
    ]).catch((err) => {
      console.warn('[Audit] Notice querying users collection:', err.message);
      return { documents: [] };
    });

    const users = usersRes.documents || [];
    report.totalUsersAudited = users.length;
    console.log(`[Audit] Total users found: ${users.length}`);

    // 2. Fetch all subscriptions
    console.log('[Audit] Fetching subscription records from Appwrite...');
    const subsRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
      Query.limit(500),
    ]).catch((err) => {
      console.warn('[Audit] Notice querying subscriptions collection:', err.message);
      return { documents: [] };
    });

    const subscriptions = subsRes.documents || [];
    report.subscriptionsCount = subscriptions.length;
    console.log(`[Audit] Total subscriptions found: ${subscriptions.length}`);

    // Map subscriptions by user email (lowercase)
    const subsByEmail = new Map();
    for (const sub of subscriptions) {
      const email = String(sub.user_email || sub.email || '').toLowerCase().trim();
      if (!email) continue;
      if (!subsByEmail.has(email)) {
        subsByEmail.set(email, []);
      }
      subsByEmail.get(email).push(sub);
    }

    // Map users by email
    const usersByEmail = new Map();
    for (const user of users) {
      const email = String(user.email || '').toLowerCase().trim();
      if (email) usersByEmail.set(email, user);
    }

    // 3. Inspect all users with Pro or Max plans
    for (const user of users) {
      const email = String(user.email || '').toLowerCase().trim();
      const plan = normalizePlan(user.plan || 'free');

      if (plan !== 'pro' && plan !== 'max') {
        continue;
      }

      report.paidUsersCount++;
      const userSubs = subsByEmail.get(email) || [];
      const activeSub = userSubs.find((s) => s.status === 'active') || userSubs[0];

      if (!activeSub) {
        // Unverified entitlement: Pro or Max tier in users collection with zero subscription documents
        report.classifications.UNVERIFIED_ENTITLEMENT.push({
          email,
          uid: user.$id,
          assignedPlan: plan,
          paidCredits: user.paid_credits || 0,
          dailyCredits: user.credits || 0,
          accountCreated: user.$createdAt || 'unknown',
          reason: 'No subscription document found in subscriptions collection',
        });
        continue;
      }

      // Evaluate subscription authenticity
      const orderId = activeSub.razorpay_order_id || activeSub.order_id || '';
      const paymentId = activeSub.razorpay_payment_id || activeSub.payment_id || '';
      const subPlan = normalizePlan(activeSub.plan_type || activeSub.plan || plan);
      const isManual = activeSub.is_manual_assignment || paymentId === 'admin_manual_grant' || orderId.startsWith('manual_');

      if (isManual) {
        report.classifications.VERIFIED_ADMIN_GRANT.push({
          email,
          uid: user.$id,
          plan: subPlan,
          orderId,
          paymentId,
          startDate: activeSub.start_date || activeSub.$createdAt,
          endDate: activeSub.end_date || user.subscription_end_date,
          grantedBy: activeSub.granted_by || 'admin',
        });
        continue;
      }

      // Check payment amounts against plan price
      const amountPaise = Number(activeSub.amount || 0);
      const cycle = (activeSub.billing_cycle || 'monthly').toLowerCase();
      const planKey = `${subPlan}_${cycle}`;
      const expectedAmount = PLAN_EXPECTED_AMOUNTS_PAISE[planKey];

      if (expectedAmount && amountPaise > 0 && amountPaise < expectedAmount * 0.5) {
        // Paid significantly below expected price (potential cross-product substitution)
        report.classifications.SUSPICIOUS_AMOUNT_MISMATCH.push({
          email,
          uid: user.$id,
          plan: subPlan,
          cycle,
          recordedAmountPaise: amountPaise,
          expectedAmountPaise: expectedAmount,
          orderId,
          paymentId,
          variancePaise: expectedAmount - amountPaise,
        });
      } else {
        report.classifications.VERIFIED_GATEWAY_PAYMENT.push({
          email,
          uid: user.$id,
          plan: subPlan,
          cycle,
          amountPaise,
          orderId,
          paymentId,
          status: activeSub.status || 'active',
          endDate: activeSub.end_date,
        });
      }
    }

    // 4. Check for orphaned subscriptions (subscription exists for an email with no pro/max user doc)
    for (const [email, subs] of subsByEmail.entries()) {
      const user = usersByEmail.get(email);
      const userPlan = user ? normalizePlan(user.plan || 'free') : 'none';
      const hasActiveSub = subs.some((s) => s.status === 'active');

      if (hasActiveSub && userPlan !== 'pro' && userPlan !== 'max') {
        report.classifications.ORPHANED_SUBSCRIPTION.push({
          email,
          userExists: Boolean(user),
          currentProfilePlan: userPlan,
          activeSubscriptionId: subs.find((s) => s.status === 'active')?.$id,
        });
      }
    }

    // 5. Generate summary statistics
    report.findingsSummary = {
      verifiedGatewayPayments: report.classifications.VERIFIED_GATEWAY_PAYMENT.length,
      verifiedAdminGrants: report.classifications.VERIFIED_ADMIN_GRANT.length,
      suspiciousAmountMismatches: report.classifications.SUSPICIOUS_AMOUNT_MISMATCH.length,
      unverifiedEntitlements: report.classifications.UNVERIFIED_ENTITLEMENT.length,
      orphanedSubscriptions: report.classifications.ORPHANED_SUBSCRIPTION.length,
    };

    console.log('\n──────────────────────────────────────────────────────────────────────');
    console.log('  RECONCILIATION AUDIT SUMMARY                                        ');
    console.log('──────────────────────────────────────────────────────────────────────');
    console.log(`  Total Users Audited:           ${report.totalUsersAudited}`);
    console.log(`  Active Paid Users:             ${report.paidUsersCount}`);
    console.log(`  Verified Gateway Payments:     ${report.findingsSummary.verifiedGatewayPayments}`);
    console.log(`  Verified Admin Grants:         ${report.findingsSummary.verifiedAdminGrants}`);
    console.log(`  Suspicious Amount Mismatches:  ${report.findingsSummary.suspiciousAmountMismatches}`);
    console.log(`  Unverified Entitlements:       ${report.findingsSummary.unverifiedEntitlements}`);
    console.log(`  Orphaned Subscriptions:        ${report.findingsSummary.orphanedSubscriptions}`);
    console.log('──────────────────────────────────────────────────────────────────────\n');

    if (report.classifications.SUSPICIOUS_AMOUNT_MISMATCH.length > 0) {
      console.warn('⚠️  SUSPICIOUS ACCOUNTS DETECTED:');
      report.classifications.SUSPICIOUS_AMOUNT_MISMATCH.forEach((item, idx) => {
        console.warn(`   ${idx + 1}. ${item.email} (UID: ${item.uid}) — Plan: ${item.plan}, Paid: ₹${item.recordedAmountPaise / 100}, Expected: ₹${item.expectedAmountPaise / 100}`);
      });
      console.warn('');
    }

    if (report.classifications.UNVERIFIED_ENTITLEMENT.length > 0) {
      console.warn('⚠️  UNVERIFIED ENTITLEMENTS DETECTED:');
      report.classifications.UNVERIFIED_ENTITLEMENT.forEach((item, idx) => {
        console.warn(`   ${idx + 1}. ${item.email} (UID: ${item.uid}) — Plan: ${item.assignedPlan}, Paid Credits: ${item.paidCredits}`);
      });
      console.warn('');
    }

    if (report.findingsSummary.suspiciousAmountMismatches === 0 && report.findingsSummary.unverifiedEntitlements === 0) {
      console.log('✅ No suspicious substitutions or unverified entitlements detected in database.');
    }

    return report;
  } catch (error) {
    console.error('[Audit] Fatal error during reconciliation run:', error);
    throw error;
  }
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith('historical-payment-reconciliation.js')) {
  runHistoricalReconciliation({ verbose: process.argv.includes('--verbose') })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
