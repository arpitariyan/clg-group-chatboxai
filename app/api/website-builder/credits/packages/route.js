import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

/**
 * GET /api/website-builder/credits/packages
 * Fetches all available credit packages
 */
export async function GET() {
    try {
        const { data: packages, error } = await supabase
            .from('website_credit_packages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching credit packages:', error);
            return NextResponse.json(
                { error: 'Failed to fetch credit packages', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            packages: packages.map(pkg => ({
                id: pkg.id,
                credits: pkg.credits,
                priceInr: pkg.price_inr,
                displayName: pkg.display_name
            }))
        });

    } catch (error) {
        console.error('Error in packages GET endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
