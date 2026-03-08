import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { databases, DB_ID } from '@/services/appwrite-admin';
import {
    WEBSITE_CREDIT_PACKAGES_COLLECTION_ID,
    WEBSITE_USER_CREDITS_COLLECTION_ID
} from '@/services/appwrite-collections';
import { getOrCreateWebsiteCreditsDoc, recordWebsiteCreditTransaction } from '@/lib/website-builder-server-utils';
import {
    getDefaultWebsitePackageById,
    normalizeWebsiteCreditPackage,
} from '@/lib/website-credit-packages';

async function addPurchasedCredits(userEmail, amount, orderId, packageId) {
    const credits = await getOrCreateWebsiteCreditsDoc(userEmail);
    const newPurchasedCredits = (credits.purchased_credits || 0) + amount;

    const updated = await databases.updateDocument(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, credits.$id, {
        purchased_credits: newPurchasedCredits
    });

    await recordWebsiteCreditTransaction({
        userEmail,
        amount,
        transactionType: 'purchase',
        orderId,
        packageId
    });

    return {
        success: true,
        purchased_credits: updated.purchased_credits,
        weekly_credits: updated.weekly_credits,
        total_credits: (updated.weekly_credits || 0) + updated.purchased_credits
    };
}

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

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId || !email) {
            return NextResponse.json(
                { error: 'Missing required payment verification data' },
                { status: 400 }
            );
        }

        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.error('RAZORPAY_KEY_SECRET not configured');
            return NextResponse.json(
                { error: 'Payment verification configuration error' },
                { status: 500 }
            );
        }

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

        // Resolve package details from default catalog first, then DB fallback.
        let packageData = getDefaultWebsitePackageById(packageId);
        if (!packageData) {
            try {
                const pkgDoc = await databases.getDocument(DB_ID, WEBSITE_CREDIT_PACKAGES_COLLECTION_ID, packageId);
                packageData = normalizeWebsiteCreditPackage(pkgDoc);
            } catch {
                return NextResponse.json(
                    { error: 'Invalid package' },
                    { status: 400 }
                );
            }
        }

        if (!packageData.isActive || packageData.credits <= 0 || packageData.priceInr <= 0) {
            return NextResponse.json(
                { error: 'Invalid package' },
                { status: 400 }
            );
        }

        const addResult = await addPurchasedCredits(
            email,
            packageData.credits,
            razorpay_order_id,
            packageId
        );

        if (!addResult.success) {
            return NextResponse.json(
                { error: addResult.error },
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
                amount: packageData.priceInr,
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
