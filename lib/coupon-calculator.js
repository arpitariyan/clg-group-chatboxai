/**
 * Authoritative Subscription Price & Coupon Calculator for ChatBox AI
 * 
 * Rules:
 * - All monetary arithmetic is performed in integer minor units (paise for INR).
 * - Pro Monthly = ₹499 (49,900 paise)
 * - Pro Annual = ₹4,990 (499,000 paise)
 * - Max Monthly = ₹1,999 (199,900 paise)
 * - Max Annual = ₹19,990 (1,999,000 paise)
 * - Percentage discounts: 1% to 95%. Round half-up to integer paise.
 * - Fixed discounts: Must leave at least minimum payable paise (100 paise = ₹1).
 * - Rejects 0%, negative, >95% or fixed discounts that zero out the bill.
 */

import {
  getPlanMonthlyPrice,
  getPlanAnnualPrice,
  normalizePlan,
  isPaidPlan,
} from './subscriptionPlans.js';

export const MINIMUM_PAYABLE_PAISE = 100; // ₹1.00 minimum for Razorpay transaction processing
export const MIN_PERCENT_DISCOUNT = 1;
export const MAX_PERCENT_DISCOUNT = 95;

/**
 * Normalizes a coupon code to canonical uppercase trimmed string.
 * @param {string} code
 * @returns {string}
 */
export function normalizeCouponCode(code = '') {
  return String(code || '')
    .trim()
    .toUpperCase();
}

/**
 * Returns the verified base plan subtotal in integer paise for a given plan and billing cycle.
 * @param {string} planType - 'pro' or 'max'
 * @param {string} billingCycle - 'monthly' or 'annual'
 * @returns {number} Subtotal in INR paise
 */
export function getAuthoritativePlanSubtotalPaise(planType = 'pro', billingCycle = 'monthly') {
  const normalizedPlan = normalizePlan(planType);
  if (!isPaidPlan(normalizedPlan)) {
    return 0;
  }

  const priceRupees = billingCycle === 'annual'
    ? getPlanAnnualPrice(normalizedPlan)
    : getPlanMonthlyPrice(normalizedPlan);

  return Math.round(priceRupees * 100);
}

/**
 * Calculate coupon discount and payable amounts in integer paise.
 * 
 * @param {object} params
 * @param {number} params.subtotalPaise - Base plan price in paise
 * @param {string} params.discountType - 'percentage' or 'fixed'
 * @param {number} params.discountValue - Percentage (1-95) or Fixed INR Rupees
 * @returns {{
 *   valid: boolean,
 *   subtotalPaise: number,
 *   discountPaise: number,
 *   payablePaise: number,
 *   subtotalRupees: number,
 *   discountRupees: number,
 *   payableRupees: number,
 *   error?: string
 * }}
 */
export function calculateCouponDiscount({ subtotalPaise, discountType, discountValue }) {
  if (typeof subtotalPaise !== 'number' || isNaN(subtotalPaise) || subtotalPaise <= 0) {
    return {
      valid: false,
      error: 'Invalid subtotal amount. Free plans are not eligible for discounts.',
      subtotalPaise: 0,
      discountPaise: 0,
      payablePaise: 0,
      subtotalRupees: 0,
      discountRupees: 0,
      payableRupees: 0,
    };
  }

  const numVal = Number(discountValue);
  if (isNaN(numVal) || numVal <= 0) {
    return {
      valid: false,
      error: 'Discount value must be greater than zero.',
      subtotalPaise,
      discountPaise: 0,
      payablePaise: subtotalPaise,
      subtotalRupees: subtotalPaise / 100,
      discountRupees: 0,
      payableRupees: subtotalPaise / 100,
    };
  }

  let discountPaise = 0;

  if (discountType === 'percentage') {
    if (numVal < MIN_PERCENT_DISCOUNT) {
      return {
        valid: false,
        error: `Percentage discount must be at least ${MIN_PERCENT_DISCOUNT}%.`,
        subtotalPaise,
        discountPaise: 0,
        payablePaise: subtotalPaise,
        subtotalRupees: subtotalPaise / 100,
        discountRupees: 0,
        payableRupees: subtotalPaise / 100,
      };
    }
    if (numVal > MAX_PERCENT_DISCOUNT) {
      return {
        valid: false,
        error: `Percentage discount cannot exceed ${MAX_PERCENT_DISCOUNT}%.`,
        subtotalPaise,
        discountPaise: 0,
        payablePaise: subtotalPaise,
        subtotalRupees: subtotalPaise / 100,
        discountRupees: 0,
        payableRupees: subtotalPaise / 100,
      };
    }

    // discountPaise = Math.round(subtotalPaise * percent / 100)
    discountPaise = Math.round((subtotalPaise * numVal) / 100);
  } else if (discountType === 'fixed') {
    // Fixed discount value is configured in INR Rupees, convert to paise
    const fixedPaise = Math.round(numVal * 100);

    if (fixedPaise >= subtotalPaise) {
      return {
        valid: false,
        error: `Fixed discount (₹${numVal}) cannot equal or exceed the plan price (₹${subtotalPaise / 100}).`,
        subtotalPaise,
        discountPaise: 0,
        payablePaise: subtotalPaise,
        subtotalRupees: subtotalPaise / 100,
        discountRupees: 0,
        payableRupees: subtotalPaise / 100,
      };
    }

    // Ensure at least MINIMUM_PAYABLE_PAISE remains
    discountPaise = Math.min(fixedPaise, subtotalPaise - MINIMUM_PAYABLE_PAISE);
  } else {
    return {
      valid: false,
      error: `Invalid discount type: "${discountType}". Supported types are "percentage" and "fixed".`,
      subtotalPaise,
      discountPaise: 0,
      payablePaise: subtotalPaise,
      subtotalRupees: subtotalPaise / 100,
      discountRupees: 0,
      payableRupees: subtotalPaise / 100,
    };
  }

  // Final payable calculation
  let payablePaise = subtotalPaise - discountPaise;
  if (payablePaise < MINIMUM_PAYABLE_PAISE) {
    payablePaise = MINIMUM_PAYABLE_PAISE;
    discountPaise = subtotalPaise - MINIMUM_PAYABLE_PAISE;
  }

  return {
    valid: true,
    subtotalPaise,
    discountPaise,
    payablePaise,
    subtotalRupees: Number((subtotalPaise / 100).toFixed(2)),
    discountRupees: Number((discountPaise / 100).toFixed(2)),
    payableRupees: Number((payablePaise / 100).toFixed(2)),
  };
}
