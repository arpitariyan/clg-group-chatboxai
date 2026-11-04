import { NextResponse } from 'next/server';
import { AuthError, authErrorResponse, resolveRequestUserEmail } from '@/lib/server-auth.js';
import { getApiCreditsDoc, getApiCreditTransactions } from '@/lib/api-credits.js';

/**
 * GET /api/v1/credits
 * ══════════════════════════════════════════════════════════════════════
 * Returns the API credit balance for the authenticated user.
 *
 * This endpoint is part of the API Key Service and is COMPLETELY
 * SEPARATE from the subscription credit system used for Search and
 * Deep Research. API credits are purchased independently and stored
 * in the `api_credits` collection — NOT in the users collection.
 *
 * Response:
 * {
 *   "success": true,
 *   "balance": {
 *     "credits": 5000.25,
 *     "currency": "api_credits"
 *   },
 *   "transactions": [...]
 * }
 */
export async function GET(request) {
  try {
    const userEmail = await resolveRequestUserEmail(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized. No valid Firebase token.' }, { status: 401 });
    }

    // ── API Key Service: Read from `api_credits` collection ONLY ──
    // This is completely separate from the subscription credit system.
    const apiCreditsDoc = await getApiCreditsDoc(userEmail);
    const balance = Number(apiCreditsDoc?.balance_credits ?? 0);

    // Fetch recent API credit transactions
    let transactions = [];
    try {
      transactions = await getApiCreditTransactions(userEmail, 10);
    } catch (txErr) {
      console.warn('[v1/credits] Failed to fetch API credit transactions (non-fatal):', txErr?.message);
    }

    return NextResponse.json({
      success: true,
      balance: {
        credits: balance,
        currency: 'api_credits',
      },
      transactions: transactions.map((tx) => ({
        id: tx.$id,
        amount: Number(tx.amount ?? 0),
        transaction_type: tx.transaction_type || 'usage',
        balance_before: Number(tx.balance_before ?? 0),
        balance_after: Number(tx.balance_after ?? 0),
        endpoint: tx.endpoint || '',
        created_at: tx.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'API credit lookup requires authentication.');
    }
    console.error('Error loading API credits:', error);
    return NextResponse.json({ error: error.message || 'Failed to load API credits.' }, { status: 500 });
  }
}