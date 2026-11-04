import { NextResponse } from 'next/server';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  SUBSCRIPTIONS_COLLECTION_ID,
  WEBHOOK_EVENTS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { getPlanPaidCredits, normalizePlan } from '@/lib/subscriptionPlans';
import { getDynamicPlanPaidCredits } from '@/lib/dynamicPlanService';
import { getCanonicalUserByEmail, updateUsersByEmail } from '@/lib/user-subscription-server';
import { fulfillCouponRedemption } from '@/lib/coupon-service';
import { verifyWebhookSignature, fetchRazorpayPayment, fetchRazorpayOrder } from '@/lib/payments/razorpay-client';
import { fulfillPaymentEntitlement } from '@/lib/payments/payment-fulfillment';
import { getTransactionByRazorpayOrderId } from '@/lib/payments/order-service';
import { PURCHASE_TYPES } from '@/lib/payments/payment-config';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || request.headers.get('X-Razorpay-Signature');

    // 1. Check for legacy manual verification attempts hitting webhook endpoint
    if (!signature) {
      let parsed = null;
      try {
        parsed = JSON.parse(rawBody);
      } catch {}

      if (parsed && parsed.razorpay_order_id && parsed.razorpay_payment_id) {
        return NextResponse.json(
          {
            error: 'Direct client payment verification at webhook endpoint is prohibited.',
            details: 'Client checkout verification has migrated to authenticated POST /api/razorpay/verify-checkout',
            success: false,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Missing Razorpay webhook signature header', success: false },
        { status: 400 }
      );
    }

    // 2. Strict webhook signature verification (fails closed if secret missing or signature invalid)
    const isValidSignature = verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      console.error('[RazorpayWebhook] Signature verification failed or webhook secret missing.');
      return NextResponse.json(
        { error: 'Invalid webhook signature', success: false },
        { status: 401 }
      );
    }

    // 3. Parse validated JSON body
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Malformed JSON payload', details: parseError.message },
        { status: 400 }
      );
    }

        const event = body.event;
    // SECURITY: Use only the x-razorpay-event-id header for deduplication.
    // Falling back to payment entity ID or Date.now() creates duplicate-event vulnerabilities.
    const eventId = request.headers.get('x-razorpay-event-id') || request.headers.get('X-Razorpay-Event-Id');
    if (!eventId) {
      console.error('[RazorpayWebhook] Missing x-razorpay-event-id header. Rejecting webhook.');
      return NextResponse.json(
        { error: 'Missing x-razorpay-event-id header. Webhook deduplication requires a stable event ID.', success: false },
        { status: 400 }
      );
    }
    const payload = body.payload;

    // 4. Webhook event deduplication
    try {
      const existingEvent = await databases.listDocuments(DB_ID, WEBHOOK_EVENTS_COLLECTION_ID, [
        Query.equal('event_id', eventId),
        Query.limit(1),
      ]);
      if (existingEvent.documents && existingEvent.documents.length > 0) {
        console.log(`[RazorpayWebhook] Event ${eventId} (${event}) already processed. Returning idempotent ok.`);
        return NextResponse.json({ status: 'ok', idempotent: true });
      }
    } catch {}

    // Record webhook event receipt — failure returns 500 so Razorpay retries
    try {
      await databases.createDocument(DB_ID, WEBHOOK_EVENTS_COLLECTION_ID, ID.unique(), {
        event_id: eventId,
        event_type: event,
        processed_at: new Date().toISOString(),
      });
    } catch (recordErr) {
      console.error('[RazorpayWebhook] CRITICAL: Failed to record webhook event in Appwrite:', recordErr.message);
      return NextResponse.json(
        { error: 'Webhook event storage failed. Razorpay should retry.', success: false },
        { status: 500 }
      );
    }

    // 5. Handle supported events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment?.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment?.entity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(payload.subscription?.entity, payload.payment?.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload.subscription?.entity);
        break;

      default:
        console.log('[RazorpayWebhook] Unhandled event:', event);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[RazorpayWebhook] Processing error:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payment) {
  if (!payment || !payment.id || !payment.order_id) return;

  const orderId = payment.order_id;
  const paymentId = payment.id;

  // Check if already fulfilled
  const existingSub = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
    Query.equal('razorpay_order_id', orderId),
    Query.equal('status', 'active'),
    Query.limit(1),
  ]).catch(() => ({ documents: [] }));

  if (existingSub.documents && existingSub.documents.length > 0) {
    return;
  }

  // Fetch actual order to establish authoritative product type & user
  let order;
  try {
    order = await fetchRazorpayOrder(orderId);
  } catch (err) {
    console.error('[Webhook] Failed fetching order from Razorpay:', err.message);
    return;
  }

  const internalTx = await getTransactionByRazorpayOrderId(orderId);
  // SECURITY: Appwrite internal transaction is the sole authority for purchase type and user identity.
  // We do NOT fall back to order.notes (attacker-controlled) or payment.email.
  if (!internalTx) {
    console.error('[Webhook] No internal transaction found for order ' + orderId + '. Cannot fulfill without ledger record.');
    return;
  }

  if (internalTx._unpersisted === true) {
    console.error('[Webhook] Internal transaction for order ' + orderId + ' was never durably persisted. Rejecting fulfillment.');
    return;
  }

  const actualPurchaseType = internalTx.purchase_type || null;
  const resolvedPlanType = internalTx.plan_type || null;
  const resolvedBillingCycle = internalTx.billing_cycle || 'monthly';
  const boundUserEmail = internalTx.user_email || null;

  if (!actualPurchaseType || !boundUserEmail) {
    console.error('[Webhook] Internal transaction for order ' + orderId + ' is missing purchase_type or user_email.');
    return;
  }

  await fulfillPaymentEntitlement({
    purchaseType: actualPurchaseType,
    userEmail: boundUserEmail,
    order,
    payment,
    internalTransaction: internalTx,
    planType: resolvedPlanType,
    billingCycle: resolvedBillingCycle,
  });
}

async function handlePaymentFailed(payment) {
  if (!payment?.order_id) return;

  const subsRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
    Query.equal('razorpay_order_id', payment.order_id),
    Query.limit(10),
  ]).catch(() => ({ documents: [] }));

  for (const sub of subsRes.documents || []) {
    if (sub.status !== 'active') {
      await databases.updateDocument(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, sub.$id, { status: 'failed' }).catch(() => {});
    }
  }
}

async function handleSubscriptionCharged(subscription, payment) {
  if (!subscription?.id) return;

  const subRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
    Query.equal('razorpay_subscription_id', subscription.id),
    Query.limit(1),
  ]).catch(() => ({ documents: [] }));

  const subscriptionRecord = subRes.documents?.[0];
  if (!subscriptionRecord) return;

  const targetEmail = subscriptionRecord.user_email;
  const planType = normalizePlan(subscriptionRecord.plan_type || 'pro');

  const subscriptionStartDate = new Date();
  const subscriptionEndDate = new Date();
  subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

  const { user } = await getCanonicalUserByEmail({ email: targetEmail });
  if (user?.$id) {
    const currentPaidCredits = Math.max(0, Number(user.paid_credits ?? 0));
    const dynamicCredits = await getDynamicPlanPaidCredits(planType);
    const planPaidCredits = dynamicCredits !== undefined && dynamicCredits !== null && !isNaN(dynamicCredits)
      ? dynamicCredits
      : getPlanPaidCredits(planType);
    const rolloverPaidCredits = currentPaidCredits + planPaidCredits;

    await updateUsersByEmail(targetEmail, {
      plan: planType,
      credits: user.credits ?? 5000,
      paid_credits: rolloverPaidCredits,
      last_monthly_reset: new Date().toISOString().split('T')[0],
      subscription_start_date: subscriptionStartDate.toISOString(),
      subscription_end_date: subscriptionEndDate.toISOString(),
    });
  }
}

async function handleSubscriptionCancelled(subscription) {
  if (!subscription?.id) return;

  const subRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
    Query.equal('razorpay_subscription_id', subscription.id),
    Query.limit(1),
  ]).catch(() => ({ documents: [] }));

  const subscriptionRecord = subRes.documents?.[0];
  if (!subscriptionRecord) return;

  // Downgrade user cleanly upon confirmed cancellation without secret email bypasses
  const { user } = await getCanonicalUserByEmail({ email: subscriptionRecord.user_email });
  if (user?.$id) {
    await updateUsersByEmail(subscriptionRecord.user_email, {
      plan: 'free',
      credits: 5000,
      last_monthly_reset: new Date().toISOString().split('T')[0],
    });
  }

  const allSubRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
    Query.equal('razorpay_subscription_id', subscription.id),
    Query.limit(100),
  ]).catch(() => ({ documents: [] }));

  for (const sub of allSubRes.documents || []) {
    await databases.updateDocument(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, sub.$id, { status: 'cancelled' }).catch(() => {});
  }
}
