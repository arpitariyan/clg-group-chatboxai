/**
 * Payment and Entitlement Configuration
 * Authoritative enumerations, currency validation, and minor-unit conversions.
 */

export const PURCHASE_TYPES = Object.freeze({
  SUBSCRIPTION_PRO: 'subscription_pro',
  SUBSCRIPTION_MAX: 'subscription_max',
  API_CREDITS: 'api_credits',
  WEBSITE_BUILDER_CREDITS: 'website_builder_credits',
});

export const ALL_PURCHASE_TYPES = Object.freeze(Object.values(PURCHASE_TYPES));

export const TRANSACTION_STATUS = Object.freeze({
  PENDING: 'pending',
  VERIFIED: 'verified',
  FULFILLED: 'fulfilled',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  RECONCILIATION_REQUIRED: 'reconciliation_required',
});

export const ALLOWED_CURRENCIES = Object.freeze(['INR', 'USD', 'EUR', 'GBP']);
export const DEFAULT_CURRENCY = 'INR';

/**
 * Normalizes and validates plan type to canonical purchase type
 * @param {string} planType - 'pro' | 'max' | 'free'
 * @returns {string|null}
 */
export function planTypeToPurchaseType(planType) {
  const normalized = String(planType || '').toLowerCase().trim();
  if (normalized === 'pro') return PURCHASE_TYPES.SUBSCRIPTION_PRO;
  if (normalized === 'max') return PURCHASE_TYPES.SUBSCRIPTION_MAX;
  return null;
}

/**
 * Converts major currency units to integer minor units (paise/cents)
 * Prevents floating point inaccuracies.
 * @param {number|string} amount
 * @param {string} currency
 * @returns {number}
 */
export function toMinorUnits(amount, currency = 'INR') {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid payment amount: ${amount}`);
  }
  // All supported currencies (INR, USD, EUR, GBP) have 2 decimal places (100 minor units per major unit)
  return Math.round(num * 100);
}

/**
 * Converts integer minor units (paise/cents) to major units
 * @param {number} minorUnits
 * @returns {number}
 */
export function fromMinorUnits(minorUnits) {
  const num = Number(minorUnits);
  if (!Number.isFinite(num)) return 0;
  return Number((num / 100).toFixed(2));
}

/**
 * Validates currency against allowed list
 * @param {string} currency
 * @returns {string}
 */
export function validateCurrency(currency = 'INR') {
  const code = String(currency || 'INR').toUpperCase().trim();
  if (!ALLOWED_CURRENCIES.includes(code)) {
    throw new Error(`Unsupported currency '${code}'. Allowed: ${ALLOWED_CURRENCIES.join(', ')}`);
  }
  return code;
}
