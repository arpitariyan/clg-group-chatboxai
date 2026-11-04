import { NextResponse } from 'next/server';
import { withUser } from '@/lib/request-context';
import { validateCouponForCheckout } from '@/lib/coupon-service';

export const dynamic = 'force-dynamic';

export const POST = withUser(
  async function POST(request, ctx) {
    try {
      const body = await request.json().catch(() => ({}));
      const { code, planType = 'pro', billingCycle = 'monthly', currency = 'INR' } = body;

      if (!code || typeof code !== 'string') {
        return NextResponse.json(
          { valid: false, error: 'Please enter a valid coupon code.' },
          { status: 400 }
        );
      }

      // Fetch latest exchange rate if non-INR currency
      let exchangeRate = 1;
      if (currency !== 'INR') {
        try {
          const rateRes = await fetch('https://api.exchangerate-api.com/v4/latest/INR', { cache: 'no-store' });
          const rateData = await rateRes.json();
          exchangeRate = rateData?.rates?.[currency] || 1;
        } catch {
          exchangeRate = 1;
        }
      }

      // Authoritative server-side validation using the authenticated caller's email
      const validationResult = await validateCouponForCheckout({
        code,
        planType,
        billingCycle,
        userEmail: ctx.userEmail,
        currency,
        exchangeRate,
      });

      if (!validationResult.valid) {
        return NextResponse.json(
          {
            valid: false,
            error: validationResult.error || 'Coupon code is not valid for this purchase.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        valid: true,
        coupon: {
          code: validationResult.code,
          description: validationResult.description,
          discountType: validationResult.discountType,
          discountValue: validationResult.discountValue,
          applicablePlans: validationResult.applicablePlans,
          applicableBillingCycles: validationResult.applicableBillingCycles,
        },
        pricing: {
          currency: validationResult.currency,
          subtotalRupees: validationResult.subtotalRupees,
          discountRupees: validationResult.discountRupees,
          payableRupees: validationResult.payableRupees,
          subtotalPaise: validationResult.subtotalPaise,
          discountPaise: validationResult.discountPaise,
          payablePaise: validationResult.payablePaise,
          finalSubtotalSmallestUnit: validationResult.finalSubtotalSmallestUnit,
          finalDiscountSmallestUnit: validationResult.finalDiscountSmallestUnit,
          finalPayableSmallestUnit: validationResult.finalPayableSmallestUnit,
        },
      });
    } catch (error) {
      console.error('[CouponValidateAPI] Error:', error);
      return NextResponse.json(
        { valid: false, error: 'Failed to process coupon validation.' },
        { status: 500 }
      );
    }
  },
  { requireVerified: false }
);
