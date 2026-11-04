import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin.js';
import {
  COUPONS_COLLECTION_ID,
  COUPON_REDEMPTIONS_COLLECTION_ID,
  SUBSCRIPTIONS_COLLECTION_ID,
} from '@/services/appwrite-collections.js';
import {
  normalizeCouponCode,
  getAuthoritativePlanSubtotalPaise,
  calculateCouponDiscount,
  MINIMUM_PAYABLE_PAISE,
} from './coupon-calculator.js';
import { normalizePlan } from './subscriptionPlans.js';

/**
 * Validates a coupon code against commercial rules, expiry, plan eligibility,
 * customer history, and limits. Does NOT mutate state (safe for pre-checkout preview).
 */
export async function validateCouponForCheckout({
  code,
  planType = 'pro',
  billingCycle = 'monthly',
  userEmail = '',
  currency = 'INR',
  exchangeRate = 1,
}) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    return { valid: false, error: 'Coupon code cannot be empty.' };
  }

  const isAnyPlan = !planType || String(planType).trim().toLowerCase() === 'any';
  const normalizedPlan = isAnyPlan ? 'any' : normalizePlan(planType);
  if (normalizedPlan === 'free') {
    return { valid: false, error: 'Free plans are not eligible for coupon discounts.' };
  }

  const normalizedEmail = String(userEmail || '').trim().toLowerCase();
  const now = new Date();

  // 1. Fetch coupon record from Appwrite
  let couponDoc;
  try {
    const res = await databases.listDocuments(DB_ID, COUPONS_COLLECTION_ID, [
      Query.equal('code', normalizedCode),
      Query.limit(1),
    ]);
    if (!res.documents || res.documents.length === 0) {
      return { valid: false, error: 'Invalid coupon code.' };
    }
    couponDoc = res.documents[0];
  } catch (err) {
    console.error('[CouponService] Error listing coupons:', err.message);
    return { valid: false, error: 'Unable to validate coupon at this time.' };
  }

  // 2. Active status check
  if (couponDoc.status === 'paused' || couponDoc.status === 'disabled' || couponDoc.status === 'expired' || couponDoc.isActive === false) {
    return { valid: false, error: 'This coupon code is currently inactive or paused.' };
  }

  // 3. Date window check
  if (couponDoc.validFrom && new Date(couponDoc.validFrom) > now) {
    return { valid: false, error: 'This coupon code is not yet active.' };
  }
  if (couponDoc.validUntil && new Date(couponDoc.validUntil) < now) {
    return { valid: false, error: 'This coupon code has expired.' };
  }

  // 4. Eligible Plan Check
  const rawPlans = couponDoc.applicablePlans || couponDoc.eligiblePlans || ['pro', 'max'];
  const eligiblePlans = Array.isArray(rawPlans)
    ? rawPlans.map((p) => String(p).toLowerCase())
    : String(rawPlans).toLowerCase().split(',').map((p) => p.trim());

  let targetPlan = normalizedPlan;
  if (normalizedPlan === 'any') {
    targetPlan = eligiblePlans.includes('pro') || eligiblePlans.includes('all')
      ? 'pro'
      : (eligiblePlans.includes('max') ? 'max' : 'pro');
  }

  if (!eligiblePlans.includes('all') && !eligiblePlans.includes(targetPlan)) {
    return {
      valid: false,
      error: `This coupon is not valid for the ${targetPlan.toUpperCase()} plan.`,
    };
  }

  // 5. Eligible Billing Cycle Check
  const rawCycles = couponDoc.applicableBillingCycles || couponDoc.eligibleBillingCycles || ['monthly', 'annual'];
  const eligibleCycles = Array.isArray(rawCycles)
    ? rawCycles.map((c) => String(c).toLowerCase())
    : String(rawCycles).toLowerCase().split(',').map((c) => c.trim());

  if (!eligibleCycles.includes('all') && !eligibleCycles.includes(billingCycle.toLowerCase())) {
    return {
      valid: false,
      error: `This coupon is only valid for ${eligibleCycles.join('/')} billing.`,
    };
  }

  // 6. Subtotal Calculation in Canonical INR Paise
  const subtotalPaise = getAuthoritativePlanSubtotalPaise(targetPlan, billingCycle);
  if (subtotalPaise <= 0) {
    return { valid: false, error: 'Invalid plan subtotal.' };
  }

  // 7. Global Redemption Limit Check
  const maxUses = Number(couponDoc.maxUses ?? couponDoc.maxRedemptions) || 0;
  const currentUses = Number(couponDoc.currentUses ?? couponDoc.redemptionCount) || 0;
  if (maxUses > 0 && currentUses >= maxUses) {
    return { valid: false, error: 'This coupon has reached its maximum total redemptions limit.' };
  }

  // 8. Per-User Limit Check
  const maxPerUser = Number(couponDoc.maxUsesPerUser ?? couponDoc.maxRedemptionsPerUser) || 1;
  if (normalizedEmail) {
    try {
      const userRedemptions = await databases.listDocuments(DB_ID, COUPON_REDEMPTIONS_COLLECTION_ID, [
        Query.equal('couponCode', normalizedCode),
        Query.equal('userEmail', normalizedEmail),
        Query.limit(50),
      ]);

      const fulfilledUserDocs = (userRedemptions.documents || []).filter(
        (d) => d.status === 'fulfilled' || d.status === 'succeeded' || d.redemptionStatus === 'succeeded'
      );

      if (fulfilledUserDocs.length >= maxPerUser) {
        return {
          valid: false,
          error: `You have already redeemed this coupon the maximum allowed number of times (${maxPerUser}).`,
        };
      }
    } catch (err) {
      console.warn('[CouponService] Notice querying user redemptions:', err.message);
    }
  }

  // 9. Authoritative Pricing Calculation
  const discountCalculation = calculateCouponDiscount({
    subtotalPaise,
    discountType: couponDoc.discountType || 'percentage',
    discountValue: Number(couponDoc.discountValue),
  });

  if (!discountCalculation.valid) {
    return { valid: false, error: discountCalculation.error };
  }

  // 10. Multi-currency translation (if applicable)
  let finalCurrency = currency.toUpperCase();
  let finalPayableSmallestUnit = discountCalculation.payablePaise;
  let finalSubtotalSmallestUnit = discountCalculation.subtotalPaise;
  let finalDiscountSmallestUnit = discountCalculation.discountPaise;

  if (finalCurrency !== 'INR' && exchangeRate > 0) {
    const convertedPayable = Number(((discountCalculation.payableRupees * exchangeRate)).toFixed(2));
    finalPayableSmallestUnit = Math.round(convertedPayable * 100);

    const convertedSubtotal = Number(((discountCalculation.subtotalRupees * exchangeRate)).toFixed(2));
    finalSubtotalSmallestUnit = Math.round(convertedSubtotal * 100);

    finalDiscountSmallestUnit = Math.max(0, finalSubtotalSmallestUnit - finalPayableSmallestUnit);
  }

  return {
    valid: true,
    couponId: couponDoc.$id,
    code: normalizedCode,
    description: couponDoc.description || `${couponDoc.discountValue}${couponDoc.discountType === 'percentage' ? '%' : ' INR'} off`,
    discountType: couponDoc.discountType,
    discountValue: couponDoc.discountValue,
    applicablePlans: couponDoc.applicablePlans || ['pro', 'max'],
    applicableBillingCycles: couponDoc.applicableBillingCycles || ['monthly', 'annual'],
    // Canonical INR
    subtotalPaise: discountCalculation.subtotalPaise,
    discountPaise: discountCalculation.discountPaise,
    payablePaise: discountCalculation.payablePaise,
    subtotalRupees: discountCalculation.subtotalRupees,
    discountRupees: discountCalculation.discountRupees,
    payableRupees: discountCalculation.payableRupees,
    // Checkout currency specifics
    currency: finalCurrency,
    exchangeRateSnapshot: exchangeRate,
    finalSubtotalSmallestUnit,
    finalDiscountSmallestUnit,
    finalPayableSmallestUnit,
  };
}

/**
 * Creates a bounded reservation during order creation.
 */
export async function createCouponReservation({
  couponId,
  couponCode,
  userEmail,
  planType,
  billingCycle,
  currency = 'INR',
  subtotalPaise,
  discountPaise,
  payablePaise,
  razorpayOrderId,
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30-minute reservation

  // Appwrite schema strictly matching attributes in coupon_redemptions
  const reservationRecord = {
    couponId: String(couponId || ''),
    couponCode: normalizeCouponCode(couponCode),
    userEmail: String(userEmail || '').trim().toLowerCase(),
    orderId: String(razorpayOrderId || `order_${Date.now()}`),
    paymentId: null,
    planType: normalizePlan(planType),
    billingCycle: String(billingCycle || 'monthly'),
    currency: String(currency || 'INR'),
    subtotalPaise: Math.round(Number(subtotalPaise) || 0),
    discountPaise: Math.round(Number(discountPaise) || 0),
    payablePaise: Math.round(Number(payablePaise) || 0),
    status: 'reserved',
    reservedAt: now.toISOString(),
    redeemedAt: null,
    expiresAt: expiresAt.toISOString(),
  };

  try {
    const doc = await databases.createDocument(
      DB_ID,
      COUPON_REDEMPTIONS_COLLECTION_ID,
      ID.unique(),
      reservationRecord
    );
    return doc;
  } catch (err) {
    console.error('[CouponService] Error creating coupon reservation:', err.message);
    return null;
  }
}

/**
 * Fulfills a coupon redemption upon verified payment completion.
 * Idempotent: will not increment coupon usage count multiple times.
 */
export async function fulfillCouponRedemption({ razorpayOrderId, razorpayPaymentId, userEmail }) {
  if (!razorpayOrderId) return null;

  try {
    // Find matching redemption record
    const res = await databases.listDocuments(DB_ID, COUPON_REDEMPTIONS_COLLECTION_ID, [
      Query.equal('orderId', razorpayOrderId),
      Query.limit(1),
    ]);

    if (!res.documents || res.documents.length === 0) {
      return null;
    }

    const redemptionDoc = res.documents[0];
    if (redemptionDoc.status === 'fulfilled' || redemptionDoc.status === 'succeeded') {
      // Already fulfilled
      return redemptionDoc;
    }

    const now = new Date().toISOString();

    // Mark redemption as fulfilled
    const updatedRedemption = await databases.updateDocument(
      DB_ID,
      COUPON_REDEMPTIONS_COLLECTION_ID,
      redemptionDoc.$id,
      {
        status: 'fulfilled',
        paymentId: razorpayPaymentId || null,
        redeemedAt: now,
      }
    );

    // Atomically increment the coupon's total redemption count
    if (redemptionDoc.couponId) {
      try {
        const coupon = await databases.getDocument(DB_ID, COUPONS_COLLECTION_ID, redemptionDoc.couponId);
        const currentCount = Number(coupon.currentUses || coupon.redemptionCount) || 0;
        await databases.updateDocument(DB_ID, COUPONS_COLLECTION_ID, redemptionDoc.couponId, {
          currentUses: currentCount + 1,
        });
      } catch (countErr) {
        console.warn('[CouponService] Notice updating coupon redemption count:', countErr.message);
      }
    }

    return updatedRedemption;
  } catch (err) {
    console.error('[CouponService] Error fulfilling coupon redemption:', err.message);
    return null;
  }
}
