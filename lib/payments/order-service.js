import crypto from 'crypto';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { PAYMENT_LEDGER_COLLECTION_ID, SUBSCRIPTIONS_COLLECTION_ID } from '@/services/appwrite-collections';
import { PURCHASE_TYPES, TRANSACTION_STATUS, toMinorUnits, validateCurrency } from './payment-config';

// 30-minute default order expiry
const ORDER_EXPIRY_MS = 30 * 60 * 1000;

/**
 * Creates an immutable pending checkout transaction record prior to calling Razorpay.
 */
export async function createPendingTransaction({
  userId = null,
  userEmail,
  purchaseType,
  productId = null,
  planType = null,
  billingCycle = null,
  packageId = null,
  packageCreditCount = 0,
  originalAmountMinorUnits,
  discountAmountMinorUnits = 0,
  finalAmountMinorUnits,
  currency = 'INR',
  couponId = null,
  couponCode = null,
  metadata = {},
}) {
  if (!userEmail) {
    throw new Error('User email is required for checkout transaction');
  }

  const normalizedEmail = userEmail.toLowerCase().trim();
  const validCurrency = validateCurrency(currency);

  if (!Object.values(PURCHASE_TYPES).includes(purchaseType)) {
    throw new Error(`Invalid purchase type: ${purchaseType}`);
  }

  if (!finalAmountMinorUnits || finalAmountMinorUnits <= 0) {
    throw new Error('Final payable amount must be greater than zero');
  }

  const internalTransactionId = `cbx_${purchaseType.slice(0, 4)}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ORDER_EXPIRY_MS);

  const transactionDoc = {
    internal_transaction_id: internalTransactionId,
    user_id: userId || '',
    user_email: normalizedEmail,
    purchase_type: purchaseType,
    product_id: productId || planType || packageId || purchaseType,
    plan_type: planType || '',
    billing_cycle: billingCycle || '',
    package_id: packageId || '',
    package_credit_count: Number(packageCreditCount) || 0,
    original_amount_minor_units: Number(originalAmountMinorUnits) || finalAmountMinorUnits,
    discount_amount_minor_units: Number(discountAmountMinorUnits) || 0,
    final_amount_minor_units: Number(finalAmountMinorUnits),
    currency: validCurrency,
    coupon_id: couponId || '',
    coupon_code_reference: couponCode || '',
    razorpay_order_id: '',
    razorpay_payment_id: '',
    payment_status: TRANSACTION_STATUS.PENDING,
    fulfillment_status: TRANSACTION_STATUS.PENDING,
    metadata: JSON.stringify(metadata || {}),
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  let doc;
  try {
    doc = await databases.createDocument(
      DB_ID,
      PAYMENT_LEDGER_COLLECTION_ID,
      ID.unique(),
      transactionDoc
    );
  } catch (err) {
    // SECURITY: Payment ledger write MUST succeed before any Razorpay order is created.
    // Failing open (_unpersisted) would allow order creation without a durable audit trail.
    console.error('[PaymentLedger] CRITICAL: Failed to persist pending transaction to payment_ledger:', err.message);
    throw new Error(
      'Payment ledger unavailable. Cannot create order without a durable transaction record. ' +
      'Please try again. If this persists, contact support.'
    );
  }
  return { ...transactionDoc, $id: doc.$id };
}

/**
 * Links a Razorpay order ID to the pending internal transaction
 */
export async function attachRazorpayOrderId(transactionId, razorpayOrderId) {
  if (!transactionId || !razorpayOrderId) {
    throw new Error('attachRazorpayOrderId: transactionId and razorpayOrderId are required');
  }

  let listRes;
  try {
    listRes = await databases.listDocuments(DB_ID, PAYMENT_LEDGER_COLLECTION_ID, [
      Query.equal('internal_transaction_id', transactionId),
      Query.limit(1),
    ]);
  } catch (err) {
    console.error('[PaymentLedger] CRITICAL: Failed to query payment_ledger for transactionId:', transactionId, err.message);
    throw new Error('Payment ledger query failed during Razorpay order attachment. Order creation aborted.');
  }

  if (!listRes.documents || listRes.documents.length === 0) {
    console.error('[PaymentLedger] CRITICAL: No pending transaction found for transactionId:', transactionId);
    throw new Error('Pending transaction not found in payment ledger. Order creation aborted.');
  }

  try {
    await databases.updateDocument(
      DB_ID,
      PAYMENT_LEDGER_COLLECTION_ID,
      listRes.documents[0].$id,
      {
        razorpay_order_id: razorpayOrderId,
      }
    );
  } catch (err) {
    // SECURITY: If we cannot attach the Razorpay order ID to the internal transaction,
    // the ledger is incomplete. The Razorpay order has already been created at this point,
    // so we log a critical alert for reconciliation but do not roll back.
    console.error('[PaymentLedger] CRITICAL: Failed to attach razorpay_order_id to transaction:', transactionId, '—', err.message);
    throw new Error('Payment ledger update failed: could not link Razorpay order ID to internal transaction.');
  }
}

/**
 * Retrieves the authoritative internal transaction for a Razorpay Order ID
 */
export async function getTransactionByRazorpayOrderId(razorpayOrderId) {
  if (!razorpayOrderId) return null;

  try {
    const listRes = await databases.listDocuments(DB_ID, PAYMENT_LEDGER_COLLECTION_ID, [
      Query.equal('razorpay_order_id', razorpayOrderId),
      Query.limit(1),
    ]);

    if (listRes.documents && listRes.documents.length > 0) {
      return listRes.documents[0];
    }
  } catch (err) {
    console.warn('[PaymentLedger] Query error fetching transaction by order ID:', err.message);
  }

  return null;
}
