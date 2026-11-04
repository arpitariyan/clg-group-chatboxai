import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  SUBSCRIPTIONS_COLLECTION_ID,
  API_CREDIT_TRANSACTIONS_COLLECTION_ID,
  WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID,
  USERS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import {
  verifyCheckoutHmac,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
} from './razorpay-client';
import {
  PURCHASE_TYPES,
  fromMinorUnits,
} from './payment-config';
import { getTransactionByRazorpayOrderId } from './order-service';
import { fulfillPaymentEntitlement } from './payment-fulfillment';

export class PaymentSecurityError extends Error {
  constructor(message, statusCode = 400, code = 'PAYMENT_VERIFICATION_FAILED') {
    super(message);
    this.name = 'PaymentSecurityError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Checks whether an order or payment has already fulfilled an entitlement.
 * Enforces permanent, multi-wallet idempotency.
 */
export async function isPaymentAlreadyFulfilled(orderId, paymentId) {
  // 1. Check Subscriptions
  try {
    const subRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
      Query.equal('razorpay_order_id', orderId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]);
    if (subRes.documents && subRes.documents.length > 0) return true;
  } catch {}

  // 2. Check API Credit Transactions
  try {
    const apiTxRes = await databases.listDocuments(DB_ID, API_CREDIT_TRANSACTIONS_COLLECTION_ID, [
      Query.equal('order_id', orderId),
      Query.equal('transaction_type', 'purchase'),
      Query.limit(1),
    ]);
    if (apiTxRes.documents && apiTxRes.documents.length > 0) return true;
  } catch {}

  // 3. Check Website Credit Transactions
  try {
    const webTxRes = await databases.listDocuments(DB_ID, WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID, [
      Query.equal('order_id', orderId),
      Query.equal('transaction_type', 'purchase'),
      Query.limit(1),
    ]);
    if (webTxRes.documents && webTxRes.documents.length > 0) return true;
  } catch {}

  return false;
}

/**
 * Validates checkout signature, queries Razorpay for actual payment status & order details,
 * verifies customer ownership, enforces cross-product segregation, and fulfills entitlement.
 */
export async function verifyAndFulfillCheckout({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  authenticatedUserEmail,
  authenticatedUserId = null,
  expectedPurchaseType = null,
}) {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new PaymentSecurityError('Missing required payment verification parameters', 400, 'MISSING_PAYMENT_DATA');
  }

  if (!authenticatedUserEmail) {
    throw new PaymentSecurityError('User must be authenticated to verify payments', 401, 'UNAUTHORIZED');
  }

  const normalizedUserEmail = authenticatedUserEmail.toLowerCase().trim();

  // Step 1: Verify checkout HMAC signature with constant-time equality
  const isValidHmac = verifyCheckoutHmac(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValidHmac) {
    throw new PaymentSecurityError('Payment signature verification failed', 400, 'INVALID_SIGNATURE');
  }

  // Step 2: Fetch actual Razorpay Payment entity
  let payment;
  try {
    payment = await fetchRazorpayPayment(razorpayPaymentId);
  } catch (err) {
    console.error('[PaymentSecurity] Failed to fetch payment from Razorpay:', err.message);
    throw new PaymentSecurityError(`Razorpay payment inquiry failed: ${err.message}`, 400, 'PAYMENT_FETCH_FAILED');
  }

  if (!payment) {
    throw new PaymentSecurityError('Payment not found on payment gateway', 404, 'PAYMENT_NOT_FOUND');
  }

  // Step 3: Fetch actual Razorpay Order entity
  let order;
  try {
    order = await fetchRazorpayOrder(razorpayOrderId);
  } catch (err) {
    console.error('[PaymentSecurity] Failed to fetch order from Razorpay:', err.message);
    throw new PaymentSecurityError(`Razorpay order inquiry failed: ${err.message}`, 400, 'ORDER_FETCH_FAILED');
  }

  if (!order) {
    throw new PaymentSecurityError('Order not found on payment gateway', 404, 'ORDER_NOT_FOUND');
  }

  // Step 4: Strict payment-order binding & captured status check
  if (payment.order_id !== razorpayOrderId) {
    throw new PaymentSecurityError(
      `Payment order mismatch: payment belongs to order ${payment.order_id}, not ${razorpayOrderId}`,
      400,
      'ORDER_MISMATCH'
    );
  }

  if (payment.status !== 'captured') {
    throw new PaymentSecurityError(
      `Payment is not captured. Current payment status: ${payment.status}`,
      400,
      'PAYMENT_NOT_CAPTURED'
    );
  }

  if (payment.amount !== order.amount) {
    throw new PaymentSecurityError(
      `Payment amount mismatch: payment was ${payment.amount} but order expected ${order.amount}`,
      400,
      'AMOUNT_MISMATCH'
    );
  }

  if (payment.currency !== order.currency) {
    throw new PaymentSecurityError(
      `Currency mismatch: payment was ${payment.currency} but order was ${order.currency}`,
      400,
      'CURRENCY_MISMATCH'
    );
  }

  if (payment.refund_status && payment.refund_status !== null) {
    throw new PaymentSecurityError(
      `Payment has been refunded (${payment.refund_status}). Entitlement cannot be granted.`,
      400,
      'PAYMENT_REFUNDED'
    );
  }

  // Step 5: Resolve authoritative internal transaction — Appwrite ledger is the SOLE authority
  const internalTx = await getTransactionByRazorpayOrderId(razorpayOrderId);

  // SECURITY: If no internal transaction exists, reject immediately.
  // We do NOT fall back to Razorpay order.notes — notes are attacker-controlled.
  if (!internalTx) {
    throw new PaymentSecurityError(
      'No authoritative internal transaction found for this order. Cannot verify payment without a durable ledger record.',
      400,
      'NO_INTERNAL_TRANSACTION'
    );
  }

  // SECURITY: Reject transactions that were never durably written to Appwrite.
  if (internalTx._unpersisted === true) {
    throw new PaymentSecurityError(
      'Internal transaction was not durably persisted. Payment cannot be fulfilled without a verified ledger record.',
      400,
      'UNPERSISTED_TRANSACTION'
    );
  }

  const actualPurchaseType = internalTx.purchase_type || null;
  const resolvedPlanType = internalTx.plan_type || null;
  const resolvedBillingCycle = internalTx.billing_cycle || 'monthly';
  const resolvedPackageId = internalTx.package_id || null;
  const boundUserEmail = internalTx.user_email || null;
  const boundUserId = internalTx.user_id || null;

  if (!actualPurchaseType) {
    throw new PaymentSecurityError(
      'Internal transaction is missing purchase_type. Payment ledger record is incomplete.',
      400,
      'UNKNOWN_PURCHASE_TYPE'
    );
  }

  // Step 5a: Three-way amount comparison — internalTx === razorpayOrder === razorpayPayment
  // All values are already integer minor units (paise). No floating point.
  const internalAmountMinor = Number(internalTx.final_amount_minor_units);
  const orderAmountMinor = Number(order.amount);
  const paymentAmountMinor = Number(payment.amount);

  if (internalAmountMinor !== orderAmountMinor) {
    throw new PaymentSecurityError(
      `Three-way amount mismatch: internal ledger expected ${internalAmountMinor} paise, Razorpay order shows ${orderAmountMinor} paise.`,
      400,
      'AMOUNT_LEDGER_MISMATCH'
    );
  }

  if (internalAmountMinor !== paymentAmountMinor) {
    throw new PaymentSecurityError(
      `Three-way amount mismatch: internal ledger expected ${internalAmountMinor} paise, Razorpay payment captured ${paymentAmountMinor} paise.`,
      400,
      'AMOUNT_PAYMENT_MISMATCH'
    );
  }

  // Step 5b: Three-way currency comparison
  const internalCurrency = (internalTx.currency || 'INR').toUpperCase();
  const orderCurrency = (order.currency || '').toUpperCase();
  const paymentCurrency = (payment.currency || '').toUpperCase();

  if (internalCurrency !== orderCurrency) {
    throw new PaymentSecurityError(
      `Currency mismatch: internal ledger has ${internalCurrency}, Razorpay order has ${orderCurrency}.`,
      400,
      'CURRENCY_LEDGER_MISMATCH'
    );
  }

  if (internalCurrency !== paymentCurrency) {
    throw new PaymentSecurityError(
      `Currency mismatch: internal ledger has ${internalCurrency}, Razorpay payment has ${paymentCurrency}.`,
      400,
      'CURRENCY_PAYMENT_MISMATCH'
    );
  }

  // Step 6: Enforce route-specific cross-product segregation
  // expectedPurchaseType must be provided by every route — null means the caller forgot to set it.
  if (!expectedPurchaseType) {
    throw new PaymentSecurityError(
      'Route security error: expectedPurchaseType not specified. Each verification route must declare its allowed purchase type.',
      500,
      'MISSING_EXPECTED_PURCHASE_TYPE'
    );
  }

  const allowedTypes = Array.isArray(expectedPurchaseType) ? expectedPurchaseType : [expectedPurchaseType];
  if (!allowedTypes.includes(actualPurchaseType)) {
    throw new PaymentSecurityError(
      `Cross-product substitution rejected. Order was created for '${actualPurchaseType}', but this route only accepts: ${allowedTypes.join(', ')}.`,
      400,
      'CROSS_PRODUCT_SUBSTITUTION_ATTEMPT'
    );
  }

  // Step 7: Enforce user identity ownership — Firebase UID is primary, email is secondary
  if (authenticatedUserId && boundUserId && boundUserId !== '' && boundUserId !== authenticatedUserId) {
    throw new PaymentSecurityError(
      `Ownership verification failed (UID). Order belongs to UID ${boundUserId}, not ${authenticatedUserId}.`,
      403,
      'ORDER_OWNERSHIP_MISMATCH_UID'
    );
  }

  if (boundUserEmail) {
    const cleanBoundEmail = boundUserEmail.toLowerCase().trim();
    if (cleanBoundEmail !== normalizedUserEmail) {
      throw new PaymentSecurityError(
        `Ownership verification failed (email). Order belongs to ${cleanBoundEmail}, not ${normalizedUserEmail}.`,
        403,
        'ORDER_OWNERSHIP_MISMATCH'
      );
    }
  }

  // Step 8: Permanent Idempotency check
  const alreadyFulfilled = await isPaymentAlreadyFulfilled(razorpayOrderId, razorpayPaymentId);
  if (alreadyFulfilled) {
    console.log(`[PaymentSecurity] Order ${razorpayOrderId} already fulfilled. Returning idempotent response.`);
    return {
      success: true,
      message: 'Payment already verified and fulfilled',
      idempotent: true,
      purchaseType: actualPurchaseType,
    };
  }

  // Step 9: Authoritative Fulfillment
  const fulfillmentResult = await fulfillPaymentEntitlement({
    purchaseType: actualPurchaseType,
    userEmail: normalizedUserEmail,
    order,
    payment,
    internalTransaction: internalTx,
    planType: resolvedPlanType,
    billingCycle: resolvedBillingCycle,
    packageId: resolvedPackageId,
  });

  return fulfillmentResult;
}
