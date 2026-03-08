import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { databases, DB_ID } from '@/services/appwrite-admin';
import { WEBSITE_CREDIT_PACKAGES_COLLECTION_ID } from '@/services/appwrite-collections';
import {
    getDefaultWebsitePackageById,
    normalizeWebsiteCreditPackage,
} from '@/lib/website-credit-packages';

/**
 * POST /api/website-builder/credits/purchase
 * Creates a Razorpay order for purchasing credits
 */
export async function POST(request) {
    try {
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

        // Resolve package details from default catalog first, then DB fallback.
        let packageData = getDefaultWebsitePackageById(packageId);
        if (!packageData) {
            try {
                const pkgDoc = await databases.getDocument(DB_ID, WEBSITE_CREDIT_PACKAGES_COLLECTION_ID, packageId);
                packageData = normalizeWebsiteCreditPackage(pkgDoc);
            } catch {
                return NextResponse.json(
                    { error: 'Invalid package selected' },
                    { status: 400 }
                );
            }
        }

        if (!packageData.isActive || packageData.credits <= 0 || packageData.priceInr <= 0) {
            return NextResponse.json(
                { error: 'Invalid package selected' },
                { status: 400 }
            );
        }

        const receipt = `wbc_${Date.now()}`.substring(0, 40);

        const order = await razorpay.orders.create({
            amount: packageData.priceInr * 100,
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
                priceInr: packageData.priceInr,
                displayName: packageData.displayName
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
