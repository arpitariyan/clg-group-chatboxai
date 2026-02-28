import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { supabase } from '@/services/supabase';

/**
 * POST /api/website-builder/credits/purchase
 * Creates a Razorpay order for purchasing credits
 */
export async function POST(request) {
    try {
        // Check Razorpay credentials
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('Razorpay credentials not configured');
            return NextResponse.json(
                { error: 'Payment system not configured' },
                { status: 500 }
            );
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const { packageId, email } = await request.json();

        if (!packageId || !email) {
            return NextResponse.json(
                { error: 'Package ID and email are required' },
                { status: 400 }
            );
        }

        // Fetch package details
        const { data: packageData, error: packageError } = await supabase
            .from('website_credit_packages')
            .select('*')
            .eq('id', packageId)
            .eq('is_active', true)
            .single();

        if (packageError || !packageData) {
            return NextResponse.json(
                { error: 'Invalid package selected' },
                { status: 400 }
            );
        }

        // Create receipt (max 40 characters)
        const receipt = `wbc_${Date.now()}`.substring(0, 40);

        // Create Razorpay order (amount in paisa)
        const order = await razorpay.orders.create({
            amount: packageData.price_inr * 100, // Convert rupees to paisa
            currency: 'INR',
            receipt: receipt,
            payment_capture: 1,
            notes: {
                package_id: packageId,
                credits: packageData.credits,
                user_email: email,
                type: 'website_credits'
            }
        });

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            },
            package: {
                id: packageData.id,
                credits: packageData.credits,
                priceInr: packageData.price_inr,
                displayName: packageData.display_name
            },
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Error creating credit purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to create purchase order', details: error.message },
            { status: 500 }
        );
    }
}
