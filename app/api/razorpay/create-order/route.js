import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getPlanAnnualPrice, getPlanMonthlyPrice, normalizePlan } from '@/lib/subscriptionPlans';
import { getDynamicPlanPrice } from '@/lib/dynamicPlanService';
import { withUser } from '@/lib/request-context';
import { validateCouponForCheckout, createCouponReservation } from '@/lib/coupon-service';
import { createPendingTransaction, attachRazorpayOrderId } from '@/lib/payments/order-service';
import { planTypeToPurchaseType, validateCurrency } from '@/lib/payments/payment-config';

export const dynamic = 'force-dynamic';

export const POST = withUser(async function POST(request, ctx) {
  try {
    // Check if Razorpay credentials are configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      return NextResponse.json(
        { 
          error: 'Payment system configuration error',
          details: 'Razorpay credentials are not properly configured'
        },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const body = await request.json();
    const {
      amount,
      currency = 'INR',
      receipt,
      planType = 'pro',
      billingCycle = 'monthly',
      couponCode,
    } = body;

    const userEmail = ctx.assertEmail(body.userEmail);
    const normalizedPlan = normalizePlan(planType);

    if (normalizedPlan === 'free') {
      return NextResponse.json({ error: 'Cannot purchase the free plan' }, { status: 400 });
    }

    const validatedCurrency = validateCurrency(currency);
    const dynamicPrice = await getDynamicPlanPrice(normalizedPlan, billingCycle);
    const planPrice = dynamicPrice !== undefined && dynamicPrice !== null && !isNaN(dynamicPrice)
      ? dynamicPrice
      : (billingCycle === 'annual' ? getPlanAnnualPrice(normalizedPlan) : getPlanMonthlyPrice(normalizedPlan));
    const expectedBaseAmount = Math.round(planPrice * 100);

    // Validate user email
    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Resolve exchange rate if currency is not INR
    let exchangeRate = 1;
    if (validatedCurrency !== 'INR') {
      try {
        const rateRes = await fetch('https://api.exchangerate-api.com/v4/latest/INR', { cache: 'no-store' });
        const rateData = await rateRes.json();
        if (rateData?.rates?.[validatedCurrency]) {
          exchangeRate = rateData.rates[validatedCurrency];
        } else {
          throw new Error('Exchange rate unavailable');
        }
      } catch (rateErr) {
        return NextResponse.json(
          { error: `Unable to obtain accurate exchange rate for ${validatedCurrency}. Please try again later.` },
          { status: 503 }
        );
      }
    }

    // Process coupon validation & authoritative calculation
    let couponQuote = null;
    let expectedAmountInSmallestUnit = validatedCurrency === 'INR'
      ? expectedBaseAmount
      : Math.round(planPrice * exchangeRate * 100);

    if (couponCode && String(couponCode).trim()) {
      couponQuote = await validateCouponForCheckout({
        code: couponCode,
        planType: normalizedPlan,
        billingCycle,
        userEmail,
        currency: validatedCurrency,
        exchangeRate,
      });

      if (!couponQuote.valid) {
        return NextResponse.json(
          { error: couponQuote.error || 'The applied coupon code is invalid or expired.' },
          { status: 400 }
        );
      }

      expectedAmountInSmallestUnit = couponQuote.finalPayableSmallestUnit;
    }

    // Verify amount bounds (at least ₹1 / 100 smallest units)
    if (expectedAmountInSmallestUnit < 100) {
      expectedAmountInSmallestUnit = 100;
    }

    const purchaseType = planTypeToPurchaseType(normalizedPlan);

    // Create durable internal pending transaction before order creation
    const pendingTx = await createPendingTransaction({
      userId: ctx.user?.uid || null,
      userEmail,
      purchaseType,
      planType: normalizedPlan,
      billingCycle,
      originalAmountMinorUnits: expectedBaseAmount,
      discountAmountMinorUnits: couponQuote ? (expectedBaseAmount - expectedAmountInSmallestUnit) : 0,
      finalAmountMinorUnits: expectedAmountInSmallestUnit,
      currency: validatedCurrency,
      couponId: couponQuote?.couponId || null,
      couponCode: couponQuote?.code || null,
    });

    // Generate receipt (must be under 40 characters)
    let finalReceipt = receipt;
    if (!finalReceipt) {
      finalReceipt = `${normalizedPlan.slice(0, 3)}_${billingCycle.slice(0, 3)}_${Date.now()}`;
    }
    if (finalReceipt.length > 40) {
      finalReceipt = finalReceipt.substring(0, 40);
    }

    // Create Razorpay order with server-authoritative payable amount
    const order = await razorpay.orders.create({
      amount: expectedAmountInSmallestUnit,
      currency: validatedCurrency,
      receipt: finalReceipt,
      payment_capture: 1, // Auto capture payment
      notes: {
        internal_transaction_id: pendingTx.internal_transaction_id,
        type: purchaseType,
        purchase_type: purchaseType,
        planType: normalizedPlan,
        billingCycle,
        userEmail,
        couponCode: couponQuote ? couponQuote.code : '',
        discountPaise: couponQuote ? couponQuote.discountPaise : 0,
        originalSubtotalPaise: expectedBaseAmount,
      },
    });

    // Attach Razorpay order ID to internal pending transaction
    await attachRazorpayOrderId(pendingTx.internal_transaction_id, order.id);

    // Create reservation for limited coupon redemptions
    if (couponQuote) {
      await createCouponReservation({
        couponId: couponQuote.couponId,
        couponCode: couponQuote.code,
        userEmail,
        planType: normalizedPlan,
        billingCycle,
        currency: validatedCurrency,
        subtotalPaise: couponQuote.subtotalPaise,
        discountPaise: couponQuote.discountPaise,
        payablePaise: couponQuote.payablePaise,
        razorpayOrderId: order.id,
        exchangeRateSnapshot: exchangeRate,
      });
    }

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      created_at: order.created_at,
      couponApplied: Boolean(couponQuote),
      couponCode: couponQuote ? couponQuote.code : null,
      discountAmount: couponQuote ? couponQuote.finalDiscountSmallestUnit : 0,
      internalTransactionId: pendingTx.internal_transaction_id,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create payment order',
        details: error?.error || null,
        success: false 
      },
      { status: 500 }
    );
  }
});
