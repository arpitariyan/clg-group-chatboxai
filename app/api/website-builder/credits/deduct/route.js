import { NextResponse } from 'next/server';
import { deductWebsiteCreditsWithLock } from '@/lib/website-builder-server-utils';

/**
 * POST /api/website-builder/credits/deduct
 * Deducts credits from user's account
 */
export async function POST(request) {
    try {
        const { email, amount } = await request.json();

        if (!email || !amount) {
            return NextResponse.json(
                { error: 'Email and amount are required' },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be greater than 0' },
                { status: 400 }
            );
        }

        const deductResult = await deductWebsiteCreditsWithLock(email, amount);

        if (!deductResult.success) {
            return NextResponse.json(
                {
                    error: deductResult.error || 'Insufficient credits',
                    credits: {
                        weekly: deductResult.weekly_credits,
                        purchased: deductResult.purchased_credits,
                        total: deductResult.total_credits
                    }
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Credits deducted successfully',
            credits: {
                weekly: deductResult.weekly_credits,
                purchased: deductResult.purchased_credits,
                total: deductResult.total_credits
            }
        });

    } catch (error) {
        console.error('Error in credits deduct endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
