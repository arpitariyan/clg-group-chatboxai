import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  SUBSCRIPTIONS_COLLECTION_ID,
  CREDIT_TRANSACTIONS_COLLECTION_ID,
  API_CREDITS_COLLECTION_ID,
  API_CREDIT_TRANSACTIONS_COLLECTION_ID,
  WEBSITE_USER_CREDITS_COLLECTION_ID,
  WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID,
  PAYMENT_LEDGER_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { getPlanMonthlyCredits, getPlanPaidCredits, normalizePlan } from '@/lib/subscriptionPlans';
import { getDynamicPlanPaidCredits } from '@/lib/dynamicPlanService';
import { getCanonicalUserByEmail, updateUsersByEmail } from '@/lib/user-subscription-server';
import { fulfillCouponRedemption } from '@/lib/coupon-service';
import { addApiCreditsWithLock } from '@/lib/api-credits';
import { getOrCreateWebsiteCreditsDoc, recordWebsiteCreditTransaction } from '@/lib/website-builder-server-utils';
import { getDefaultWebsitePackageById, normalizeWebsiteCreditPackage } from '@/lib/website-credit-packages';
import { PURCHASE_TYPES, TRANSACTION_STATUS, fromMinorUnits } from './payment-config';

/**
 * Authoritative, centralized fulfillment service for verified Razorpay payments.
 */
export async function fulfillPaymentEntitlement({
  purchaseType,
  userEmail,
  order,
  payment,
  internalTransaction = null,
  planType = null,
  billingCycle = 'monthly',
  packageId = null,
}) {
  const normalizedEmail = userEmail.toLowerCase().trim();
  const paymentId = payment.id;
  const orderId = order.id;
  const amountPaidMinor = payment.amount;
  const currency = payment.currency || 'INR';
  const now = new Date();

  // 1. Subscription Fulfillment (Pro / Max)
  if (purchaseType === PURCHASE_TYPES.SUBSCRIPTION_PRO || purchaseType === PURCHASE_TYPES.SUBSCRIPTION_MAX) {
    const targetPlan = purchaseType === PURCHASE_TYPES.SUBSCRIPTION_MAX ? 'max' : 'pro';
    const normalizedPlan = normalizePlan(targetPlan);

    // Dynamic credits lookup with fallback
    const dynamicCredits = await getDynamicPlanPaidCredits(normalizedPlan);
    const planPaidCredits = dynamicCredits !== undefined && dynamicCredits !== null && !isNaN(dynamicCredits)
      ? dynamicCredits
      : getPlanPaidCredits(normalizedPlan);

    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    if (billingCycle === 'annual') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 12);
    } else {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    }

    const { user: existingUser } = await getCanonicalUserByEmail({ email: normalizedEmail });
    let updatedUser;

    if (!existingUser) {
      // Create new user record with paid plan
      const newUser = {
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        plan: normalizedPlan,
        credits: 5000,
        paid_credits: planPaidCredits,
        last_monthly_reset: now.toISOString().split('T')[0],
        subscription_start_date: subscriptionStartDate.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString(),
        mfa_enabled: false,
        accent_color: 'violet',
        language: 'en',
      };
      updatedUser = await databases.createDocument(DB_ID, USERS_COLLECTION_ID, ID.unique(), newUser);
    } else {
      const currentPaidCredits = Math.max(0, Number(existingUser.paid_credits ?? 0));
      const rolloverPaidCredits = currentPaidCredits + planPaidCredits;

      const updatedDocs = await updateUsersByEmail(normalizedEmail, {
        plan: normalizedPlan,
        credits: existingUser.credits ?? 5000,
        paid_credits: rolloverPaidCredits,
        last_monthly_reset: now.toISOString().split('T')[0],
        subscription_start_date: subscriptionStartDate.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString(),
      });
      updatedUser = updatedDocs[0] || existingUser;
    }

    // Record subscription row
    const subRecord = await databases.createDocument(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, ID.unique(), {
      user_email: normalizedEmail,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      plan_type: normalizedPlan,
      billing_cycle: billingCycle,
      amount: amountPaidMinor,
      currency: currency,
      status: 'active',
      start_date: subscriptionStartDate.toISOString(),
      end_date: subscriptionEndDate.toISOString(),
      created_at: now.toISOString(),
    });

    // Record credit transaction
    try {
      await databases.createDocument(DB_ID, CREDIT_TRANSACTIONS_COLLECTION_ID, ID.unique(), {
        userEmail: normalizedEmail,
        amount: planPaidCredits,
        type: 'subscription_allotment',
        description: `Verified ${normalizedPlan.toUpperCase()} subscription purchase (${billingCycle})`,
        timestamp: now.toISOString(),
      });
    } catch (credErr) {
      console.warn('[Fulfillment] Notice recording credit transaction:', credErr.message);
    }

    // Fulfill coupon redemption if coupon applied
    try {
      await fulfillCouponRedemption({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        userEmail: normalizedEmail,
      });
    } catch (couponErr) {
      console.warn('[Fulfillment] Notice finalizing coupon redemption:', couponErr.message);
    }

    // Update payment ledger if present
    if (internalTransaction?.$id) {
      await databases.updateDocument(DB_ID, PAYMENT_LEDGER_COLLECTION_ID, internalTransaction.$id, {
        razorpay_payment_id: paymentId,
        payment_status: TRANSACTION_STATUS.VERIFIED,
        fulfillment_status: TRANSACTION_STATUS.FULFILLED,
      }).catch(() => null);
    }

    return {
      success: true,
      purchaseType,
      plan: normalizedPlan,
      billingCycle,
      paidCreditsGranted: planPaidCredits,
      subscriptionId: subRecord.$id,
      user: {
        email: updatedUser.email,
        plan: normalizedPlan,
        credits: updatedUser.credits,
        paid_credits: updatedUser.paid_credits,
      },
    };
  }

  // 2. API Credits Fulfillment
  if (purchaseType === PURCHASE_TYPES.API_CREDITS) {
    const orderAmountMajor = fromMinorUnits(amountPaidMinor);
    const result = await addApiCreditsWithLock(normalizedEmail, orderAmountMajor, {
      transactionType: 'purchase',
      orderId: orderId,
      paymentId: paymentId,
      endpoint: 'api-credits',
      costUsd: '',
      meta: {
        orderAmount: orderAmountMajor,
        currency,
        displayCurrency: currency,
      },
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to credit API wallet');
    }

    if (internalTransaction?.$id) {
      await databases.updateDocument(DB_ID, PAYMENT_LEDGER_COLLECTION_ID, internalTransaction.$id, {
        razorpay_payment_id: paymentId,
        payment_status: TRANSACTION_STATUS.VERIFIED,
        fulfillment_status: TRANSACTION_STATUS.FULFILLED,
      }).catch(() => null);
    }

    return {
      success: true,
      purchaseType,
      creditsGranted: orderAmountMajor,
      newBalance: result.balance_credits,
    };
  }

  // 3. Website Builder Credits Fulfillment
  if (purchaseType === PURCHASE_TYPES.WEBSITE_BUILDER_CREDITS) {
    let pkg = getDefaultWebsitePackageById(packageId);
    if (!pkg && packageId) {
      try {
        const pkgDoc = await databases.getDocument(DB_ID, WEBSITE_CREDIT_PACKAGES_COLLECTION_ID, packageId);
        pkg = normalizeWebsiteCreditPackage(pkgDoc);
      } catch {
        // Fallback to default
      }
    }

    // SECURITY: Credit count must come from the durable internal transaction or verified package.
    // Never fall back to a hardcoded default — this could grant credits for free.
    const creditsFromPkg = pkg && pkg.credits ? Number(pkg.credits) : 0;
    const creditsFromTx = internalTransaction && internalTransaction.package_credit_count
      ? Number(internalTransaction.package_credit_count)
      : 0;
    const creditsToAdd = creditsFromPkg || creditsFromTx;

    if (!creditsToAdd || creditsToAdd <= 0) {
      throw new Error(
        'Website Builder credit fulfillment failed: could not determine credit count for package ' +
        (packageId || 'unknown') + '. No fallback credits will be granted.'
      );
    }

    const creditsDoc = await getOrCreateWebsiteCreditsDoc(normalizedEmail);
    const newPurchased = (creditsDoc.purchased_credits || 0) + creditsToAdd;

    await databases.updateDocument(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, creditsDoc.$id, {
      purchased_credits: newPurchased,
    });

    await recordWebsiteCreditTransaction({
      userEmail: normalizedEmail,
      amount: creditsToAdd,
      transactionType: 'purchase',
      orderId: orderId,
      packageId: packageId || pkg?.id || 'standard',
    });

    if (internalTransaction?.$id) {
      await databases.updateDocument(DB_ID, PAYMENT_LEDGER_COLLECTION_ID, internalTransaction.$id, {
        razorpay_payment_id: paymentId,
        payment_status: TRANSACTION_STATUS.VERIFIED,
        fulfillment_status: TRANSACTION_STATUS.FULFILLED,
      }).catch(() => null);
    }

    return {
      success: true,
      purchaseType,
      creditsGranted: creditsToAdd,
      totalPurchasedCredits: newPurchased,
    };
  }

  throw new Error(`Unhandled purchase type for fulfillment: ${purchaseType}`);
}
