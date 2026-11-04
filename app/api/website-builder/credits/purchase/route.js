import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { databases, DB_ID } from '@/services/appwrite-admin';
import { WEBSITE_CREDIT_PACKAGES_COLLECTION_ID } from '@/services/appwrite-collections';
import {
    getDefaultWebsitePackageById,
    normalizeWebsiteCreditPackage,
} from '@/lib/website-credit-packages';
import { withUser } from '@/lib/request-context';
import { createPendingTransaction, attachRazorpayOrderId } from '@/lib/payments/order-service';
import { PURCHASE_TYPES } from '@/lib/payments/payment-config';

export const dynamic = 'force-dynamic';

/**
 * POST /api/website-builder/credits/purchase
 * Creates a Razorpay order for purchasing Website Builder credits
 */
export const POST = withUser(async function POST(request, ctx) {
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

        const body = await request.json();
        const { packageId } = body;
        const email = ctx.assertEmail(body.email);

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

        const amountMinorUnits = packageData.priceInr * 100;

        // Create durable internal pending transaction record
        const pendingTx = await createPendingTransaction({
            userId: ctx.user?.uid || null,
            userEmail: email,
            purchaseType: PURCHASE_TYPES.WEBSITE_BUILDER_CREDITS,
            packageId: packageData.id,
            packageCreditCount: packageData.credits,
            originalAmountMinorUnits: amountMinorUnits,
            finalAmountMinorUnits: amountMinorUnits,
            currency: 'INR',
            metadata: {
                packageDisplayName: packageData.displayName,
                credits: packageData.credits,
            },
        });

        const receipt = `wbc_${Date.now()}`.substring(0, 40);

        const order = await razorpay.orders.create({
            amount: amountMinorUnits,
            currency: 'INR',
            receipt: receipt,
            payment_capture: 1,
            notes: {
                internal_transaction_id: pendingTx.internal_transaction_id,
                type: 'website_credits',
                purchase_type: PURCHASE_TYPES.WEBSITE_BUILDER_CREDITS,
                package_id: packageData.id,
                credits: packageData.credits,
                user_email: email,
            }
        });

        await attachRazorpayOrderId(pendingTx.internal_transaction_id, order.id);

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
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            internalTransactionId: pendingTx.internal_transaction_id,
        });

    } catch (error) {
        console.error('Error creating credit purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to create purchase order', details: error.message },
            { status: 500 }
        );
    }
});
