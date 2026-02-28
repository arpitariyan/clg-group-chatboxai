import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/services/supabase';

/**
 * POST /api/website-builder/credits/verify-purchase
 * Verifies Razorpay payment and adds credits to user account
 */
export async function POST(request) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            packageId,
            email
        } = await request.json();

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId || !email) {
            return NextResponse.json(
                { error: 'Missing required payment verification data' },
                { status: 400 }
            );
        }

        // Check Razorpay key secret
        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.error('RAZORPAY_KEY_SECRET not configured');
            return NextResponse.json(
                { error: 'Payment verification configuration error' },
                { status: 500 }
            );
        }

        // Verify payment signature
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            console.error('Payment signature verification failed');
            return NextResponse.json(
                { error: 'Payment signature verification failed' },
                { status: 400 }
            );
        }

        // Fetch package details
        const { data: packageData, error: packageError } = await supabase
            .from('website_credit_packages')
            .select('*')
            .eq('id', packageId)
            .single();

        if (packageError || !packageData) {
            return NextResponse.json(
                { error: 'Invalid package' },
                { status: 400 }
            );
        }

        // Add purchased credits to user account
        const { data: result, error: addError } = await supabase
            .rpc('add_purchased_credits', {
                p_user_email: email,
                p_amount: packageData.credits,
                p_description: `Purchased ${packageData.credits} credits - Order: ${razorpay_order_id}`
            });

        if (addError) {
            console.error('Error adding purchased credits:', addError);
            return NextResponse.json(
                { error: 'Failed to add credits', details: addError.message },
                { status: 500 }
            );
        }

        const addResult = result[0];

        if (!addResult.success) {
            return NextResponse.json(
                { error: addResult.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully added ${packageData.credits} credits to your account!`,
            credits: {
                weekly: addResult.weekly_credits,
                purchased: addResult.purchased_credits,
                total: addResult.total_credits
            },
            purchase: {
                credits: packageData.credits,
                amount: packageData.price_inr,
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id
            }
        });

    } catch (error) {
        console.error('Error verifying credit purchase:', error);
        return NextResponse.json(
            { error: 'Payment verification failed', details: error.message },
            { status: 500 }
        );
    }
}
