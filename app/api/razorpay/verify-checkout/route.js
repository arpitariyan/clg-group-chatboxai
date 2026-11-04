import { NextResponse } from 'next/server';
import { withUser } from '@/lib/request-context';
import { verifyAndFulfillCheckout, PaymentSecurityError } from '@/lib/payments/payment-verification';

export const dynamic = 'force-dynamic';

/**
 * POST /api/razorpay/verify-checkout
 * Dedicated, authenticated subscription checkout verification endpoint.
 * Strictly verifies Razorpay signature, order amount, payment capture, and customer ownership.
 */
export const POST = withUser(async function POST(request, ctx) {
  try {
    const body = await request.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment verification parameters' },
        { status: 400 }
      );
    }

    const authenticatedEmail = ctx.user.email;
    if (!authenticatedEmail) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Valid customer session required.' },
        { status: 401 }
      );
    }

    // Process authoritative server-side checkout verification
    // SECURITY: expectedPurchaseType is mandatory. This route only accepts subscription products.
    // Cross-product substitution (e.g. attempting to verify an API credit order here) is strictly rejected.
    const result = await verifyAndFulfillCheckout({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      authenticatedUserEmail: authenticatedEmail,
      authenticatedUserId: ctx.user.uid || null,
      expectedPurchaseType: ['subscription_pro', 'subscription_max'],
    });

    return NextResponse.json({
      success: true,
      message: result.idempotent
        ? 'Payment already verified and active'
        : `Successfully activated ${String(result.plan || 'paid').toUpperCase()} subscription`,
      ...result,
    });
  } catch (error) {
    if (error instanceof PaymentSecurityError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    console.error('[VerifyCheckout] Unexpected checkout verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Payment verification failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
});
