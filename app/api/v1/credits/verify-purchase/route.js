import { NextResponse } from 'next/server';
import { resolveRequestUserEmail, AuthError, authErrorResponse } from '@/lib/server-auth.js';
import { ensureApiCreditStorageReady } from '@/lib/appwrite-api-credits-bootstrap.js';
import { verifyAndFulfillCheckout, PaymentSecurityError } from '@/lib/payments/payment-verification';
import { PURCHASE_TYPES } from '@/lib/payments/payment-config';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await ensureApiCreditStorageReady();

    const userEmail = await resolveRequestUserEmail(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized. No valid Firebase token.' }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json().catch(() => ({}));

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required payment verification data' }, { status: 400 });
    }

    // Authoritative payment verification strictly scoped to api_credits
    const result = await verifyAndFulfillCheckout({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      authenticatedUserEmail: userEmail,
      expectedPurchaseType: PURCHASE_TYPES.API_CREDITS,
    });

    return NextResponse.json({
      success: true,
      message: result.idempotent
        ? 'API credit purchase already processed.'
        : `Successfully added ₹${result.creditsGranted} API credits to your account!`,
      credits: {
        total: result.newBalance,
        purchased: result.newBalance,
      },
      purchase: {
        credits: result.creditsGranted,
        amount: result.creditsGranted,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'API credit purchase verification requires authentication.');
    }

    if (error instanceof PaymentSecurityError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('Error verifying API credit purchase:', error);
    const errorDescription = error?.error?.description || error?.error?.message || error?.message || 'Payment verification failed';
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return NextResponse.json(
      { error: errorDescription, details: error?.error || error?.message || null },
      { status: statusCode }
    );
  }
}
