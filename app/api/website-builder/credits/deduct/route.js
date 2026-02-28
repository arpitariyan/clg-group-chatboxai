import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

/**
 * POST /api/website-builder/credits/deduct
 * Deducts credits from user's account
 */
export async function POST(request) {
    try {
        const { email, amount, description } = await request.json();

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

        // Deduct credits using the database function
        const { data: result, error: deductError } = await supabase
            .rpc('deduct_website_credits', {
                p_user_email: email,
                p_amount: amount,
                p_description: description || 'Website builder operation'
            });

        if (deductError) {
            console.error('Error deducting credits:', deductError);
            return NextResponse.json(
                { error: 'Failed to deduct credits', details: deductError.message },
                { status: 500 }
            );
        }

        const deductResult = result[0];

        if (!deductResult.success) {
            return NextResponse.json(
                {
                    error: deductResult.message,
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
