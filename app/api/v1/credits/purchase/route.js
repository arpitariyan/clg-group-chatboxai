import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { resolveRequestUserEmail, AuthError, authErrorResponse } from '@/lib/server-auth.js';
import { createPendingTransaction, attachRazorpayOrderId } from '@/lib/payments/order-service';
import { PURCHASE_TYPES } from '@/lib/payments/payment-config';

export async function POST(request) {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const userEmail = await resolveRequestUserEmail(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized. No valid Firebase token.' }, { status: 401 });
    }

    const { amount } = await request.json().catch(() => ({}));
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount)) {
      return NextResponse.json({ error: 'Invalid purchase amount.' }, { status: 400 });
    }

    const normalizedAmount = Number(parsedAmount.toFixed(2));
    if (normalizedAmount < 50) {
      return NextResponse.json({ error: 'Minimum API credit purchase is ₹50.' }, { status: 400 });
    }

    const amountMinorUnits = Math.round(normalizedAmount * 100);

    // Create durable internal pending transaction record
    const pendingTx = await createPendingTransaction({
      userEmail,
      purchaseType: PURCHASE_TYPES.API_CREDITS,
      productId: 'api_credits',
      originalAmountMinorUnits: amountMinorUnits,
      finalAmountMinorUnits: amountMinorUnits,
      currency: 'INR',
      metadata: { credits: normalizedAmount },
    });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const receipt = `api_${Date.now()}`.slice(0, 40);
    const order = await razorpay.orders.create({
      amount: amountMinorUnits,
      currency: 'INR',
      receipt,
      payment_capture: 1,
      notes: {
        internal_transaction_id: pendingTx.internal_transaction_id,
        type: 'api_credits',
        purchase_type: PURCHASE_TYPES.API_CREDITS,
        credits: normalizedAmount,
        credit_amount_inr: normalizedAmount,
        user_email: userEmail,
      },
    });

    await attachRazorpayOrderId(pendingTx.internal_transaction_id, order.id);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      purchase: {
        credits: normalizedAmount,
        amount: normalizedAmount,
        currency: 'INR',
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      internalTransactionId: pendingTx.internal_transaction_id,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'API credit purchase requires authentication.');
    }

    console.error('Error creating API credit purchase order:', error);
    const errorDescription = error?.error?.description || error?.error?.message || error?.message || 'Failed to create purchase order';
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return NextResponse.json(
      { error: errorDescription, details: error?.error || error?.message || null },
      { status: statusCode }
    );
  }
}
