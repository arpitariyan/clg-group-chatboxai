/**
 * ChatboxAI — Balance API
 * GET /api/credits/balance
 *
 * Returns the combined credit balance for the authenticated user.
 * The UI always shows a single "Credits Remaining" number.
 * The `breakdown` field is optional transparency for the Settings page.
 *
 * Response:
 * {
 *   "creditsRemaining": 34280,
 *   "breakdown": {
 *     "dailyFreeCredits": 4280,
 *     "monthlyPaidCredits": 30000,
 *     "dailyResetAt": "2026-07-28T00:00:00Z",
 *     "billingResetAt": "2026-08-15T00:00:00Z"
 *   },
 *   "plan": "pro"
 * }
 */

import { NextResponse } from 'next/server';
import { AuthError, authErrorResponse, resolveRequestUserEmail } from '@/lib/server-auth';
import { getUserCreditDocByEmail, getDualWalletBalance } from '@/lib/credit-engine';

export async function GET(request) {
  try {
    const userEmail = await resolveRequestUserEmail(request);
    const userDoc = await getUserCreditDocByEmail(userEmail);
    const userId = userDoc?.$id;
    const balance = userId
      ? await getDualWalletBalance(userId)
      : { creditsRemaining: 0, dailyFreeCredits: 0, monthlyPaidCredits: 0, plan: 'free', billingDate: 1 };

    // Calculate next daily reset (midnight UTC tonight)
    const now = new Date();
    const nextMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    // Calculate next billing reset based on billingDate
    const billingDay = balance.billingDate || 1;
    const today = now.getUTCDate();
    let billingMonth = now.getUTCMonth();
    let billingYear = now.getUTCFullYear();
    if (today >= billingDay) {
      billingMonth += 1; // next month
    }
    if (billingMonth > 11) { billingMonth = 0; billingYear += 1; }
    const nextBillingReset = new Date(Date.UTC(billingYear, billingMonth, billingDay));

    return NextResponse.json({
      success: true,
      creditsRemaining: balance.creditsRemaining,
      plan: balance.plan,
      breakdown: {
        dailyFreeCredits: balance.dailyFreeCredits,
        monthlyPaidCredits: balance.monthlyPaidCredits,
        dailyResetAt: nextMidnightUTC.toISOString(),
        billingResetAt: nextBillingReset.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'Authentication required.');
    }
    console.error('[Credits Balance API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load credits balance.' },
      { status: 500 }
    );
  }
}
