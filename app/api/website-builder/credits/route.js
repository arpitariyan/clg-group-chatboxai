import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

/**
 * GET /api/website-builder/credits
 * Fetches the current user's website builder credit balance
 */
export async function GET(request) {
    try {
        // Get user email from query params
        const url = new URL(request.url);
        const userEmail = url.searchParams.get('email');

        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 400 }
            );
        }

        // Get user's plan status
        const { data: userData, error: userError } = await supabase
            .from('Users')
            .select('plan, email')
            .eq('email', userEmail)
            .single();

        if (userError || !userData) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const isPro = userData.plan === 'pro';

        // Get or create user credits (will auto-reset if week expired)
        const { data: credits, error: creditsError } = await supabase
            .rpc('get_or_create_user_credits', {
                p_user_email: userEmail,
                p_is_pro: isPro
            });

        if (creditsError) {
            console.error('Error fetching credits:', creditsError);
            return NextResponse.json(
                { error: 'Failed to fetch credits', details: creditsError.message },
                { status: 500 }
            );
        }

        const creditData = credits[0];

        return NextResponse.json({
            success: true,
            credits: {
                weekly: creditData.weekly_credits,
                purchased: creditData.purchased_credits,
                total: creditData.total_credits,
                weekStartDate: creditData.week_start_date,
                isPro: creditData.is_pro
            }
        });

    } catch (error) {
        console.error('Error in credits GET endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
