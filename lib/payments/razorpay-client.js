import crypto from 'crypto';
import Razorpay from 'razorpay';

let _razorpayInstance = null;

/**
 * Returns a configured Razorpay client instance.
 * Fails closed if credentials are not configured.
 */
export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error('Razorpay payment gateway credentials are not configured.');
    error.code = 'PAYMENT_CONFIG_ERROR';
    error.status = 500;
    throw error;
  }

  if (!_razorpayInstance) {
    _razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return _razorpayInstance;
}

/**
 * Verifies Razorpay checkout HMAC signature (order_id|payment_id)
 * Uses constant-time comparison to prevent timing attacks.
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature
 * @returns {boolean}
 */
export function verifyCheckoutHmac(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  try {
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature against raw payload
 * Strictly fails closed if RAZORPAY_WEBHOOK_SECRET is missing.
 * @param {string|Buffer} rawBody
 * @param {string} signature
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[RazorpaySecurity] RAZORPAY_WEBHOOK_SECRET is missing in environment. Failing closed.');
    return false;
  }

  if (!rawBody || !signature) return false;

  try {
    const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Fetches order details directly from Razorpay API
 * @param {string} orderId
 */
export async function fetchRazorpayOrder(orderId) {
  if (!orderId) throw new Error('Order ID is required');
  const client = getRazorpayClient();
  return client.orders.fetch(orderId);
}

/**
 * Fetches payment details directly from Razorpay API
 * @param {string} paymentId
 */
export async function fetchRazorpayPayment(paymentId) {
  if (!paymentId) throw new Error('Payment ID is required');
  const client = getRazorpayClient();
  return client.payments.fetch(paymentId);
}
