import { NextResponse } from 'next/server';
import { withUser } from '@/lib/request-context';
import { verifyAndFulfillCheckout, PaymentSecurityError } from '@/lib/payments/payment-verification';
import { PURCHASE_TYPES } from '@/lib/payments/payment-config';

export const dynamic = 'force-dynamic';

/**
 * POST /api/website-builder/credits/verify-purchase
 * Authoritatively verifies Razorpay payment and grants website builder credits
 * Binds package and credit quantity strictly to server-side order/transaction, rejecting client tampering.
 */
export const POST = withUser(async function POST(request, ctx) {
    try {
        const body = await request.json().catch(() => ({}));
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = body;
        const email = ctx.assertEmail(body.email);

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !email) {
            return NextResponse.json(
                { error: 'Missing required payment verification data' },
                { status: 400 }
            );
        }

        // Authoritative verification strictly scoped to website_builder_credits
        // Notice: client-supplied packageId is intentionally NOT trusted to dictate credits
        const result = await verifyAndFulfillCheckout({
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            authenticatedUserEmail: email,
            expectedPurchaseType: PURCHASE_TYPES.WEBSITE_BUILDER_CREDITS,
        });

        return NextResponse.json({
            success: true,
            message: result.idempotent
                ? 'Credit purchase already processed.'
                : `Successfully added ${result.creditsGranted} credits to your account!`,
            credits: {
                purchased: result.totalPurchasedCredits,
                total: result.totalPurchasedCredits,
            },
            purchase: {
                credits: result.creditsGranted,
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
            }
        });

    } catch (error) {
        if (error instanceof PaymentSecurityError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: error.statusCode }
            );
        }

        console.error('Error verifying credit purchase:', error);
        return NextResponse.json(
            { error: 'Payment verification failed', details: error.message },
            { status: 500 }
        );
    }
});
