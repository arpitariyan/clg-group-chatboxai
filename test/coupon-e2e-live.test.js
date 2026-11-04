import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Client, Databases, ID, Query } from 'node-appwrite';
import {
  validateCouponForCheckout,
  createCouponReservation,
  fulfillCouponRedemption,
} from '../lib/coupon-service.js';
import { COUPONS_COLLECTION_ID, COUPON_REDEMPTIONS_COLLECTION_ID } from '../services/appwrite-collections.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://localhost/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main';

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

test('End-to-End Live Appwrite Coupon Creation, Validation, Reservation and Fulfillment', async (t) => {
  const testCode = `TESTLIVE${Date.now().toString().slice(-4)}`;
  let createdCouponId = null;
  const testOrderId = `order_live_${Date.now()}`;
  const testUserEmail = 'live_test_user@example.com';

  await t.test('1. Create coupon in live Appwrite collection with correct attributes', async () => {
    const couponRecord = {
      code: testCode,
      discountType: 'percentage',
      discountValue: 20,
      applicablePlans: ['pro', 'max'],
      applicableBillingCycles: ['monthly', 'annual'],
      maxUses: 50,
      currentUses: 0,
      maxUsesPerUser: 1,
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString(),
      status: 'active',
      description: 'Live test 20% discount coupon',
      createdBy: 'admin_test@chatboxai.com',
      createdAt: new Date().toISOString(),
    };

    const doc = await databases.createDocument(
      databaseId,
      COUPONS_COLLECTION_ID,
      ID.unique(),
      couponRecord
    );

    assert.ok(doc.$id, 'Coupon document ID should be generated');
    assert.equal(doc.code, testCode);
    assert.equal(doc.discountValue, 20);
    createdCouponId = doc.$id;
  });

  await t.test('2. Validate coupon for checkout on Pro Monthly', async () => {
    const quote = await validateCouponForCheckout({
      code: testCode,
      planType: 'pro',
      billingCycle: 'monthly',
      userEmail: testUserEmail,
      currency: 'INR',
    });

    assert.equal(quote.valid, true, `Quote should be valid: ${quote.error}`);
    assert.equal(quote.subtotalPaise, 49900, 'Pro monthly subtotal should be ₹499 (49,900 paise)');
    assert.equal(quote.discountPaise, 9980, '20% discount on 49,900 should be 9,980 paise (₹99.80)');
    assert.equal(quote.payablePaise, 39920, 'Final payable should be 39,920 paise (₹399.20)');
  });

  await t.test('3. Create coupon reservation during order creation', async () => {
    const quote = await validateCouponForCheckout({
      code: testCode,
      planType: 'pro',
      billingCycle: 'monthly',
      userEmail: testUserEmail,
      currency: 'INR',
    });

    const reservation = await createCouponReservation({
      couponId: createdCouponId,
      couponCode: testCode,
      userEmail: testUserEmail,
      planType: 'pro',
      billingCycle: 'monthly',
      currency: 'INR',
      subtotalPaise: quote.subtotalPaise,
      discountPaise: quote.discountPaise,
      payablePaise: quote.payablePaise,
      razorpayOrderId: testOrderId,
    });

    assert.ok(reservation, 'Reservation should be successfully written to Appwrite');
    assert.equal(reservation.status, 'reserved');
    assert.equal(reservation.orderId, testOrderId);
  });

  await t.test('4. Fulfill coupon redemption upon simulated payment success', async () => {
    const fulfilled = await fulfillCouponRedemption({
      razorpayOrderId: testOrderId,
      razorpayPaymentId: `pay_live_${Date.now()}`,
      userEmail: testUserEmail,
    });

    assert.ok(fulfilled, 'Fulfillment should succeed');
    assert.equal(fulfilled.status, 'fulfilled');

    // Check that the coupon usage count incremented in Appwrite
    const updatedCoupon = await databases.getDocument(databaseId, COUPONS_COLLECTION_ID, createdCouponId);
    assert.equal(updatedCoupon.currentUses, 1, 'Coupon currentUses should be incremented to 1');
  });

  await t.test('5. Enforce max per user limit after fulfillment', async () => {
    const secondAttempt = await validateCouponForCheckout({
      code: testCode,
      planType: 'pro',
      billingCycle: 'monthly',
      userEmail: testUserEmail,
      currency: 'INR',
    });

    assert.equal(secondAttempt.valid, false, 'Should be rejected because user already redeemed it');
    assert.match(secondAttempt.error, /already redeemed/i);
  });

  await t.test('6. Teardown: Clean up test documents from Appwrite', async () => {
    // Delete test coupon
    if (createdCouponId) {
      await databases.deleteDocument(databaseId, COUPONS_COLLECTION_ID, createdCouponId);
    }
    // Delete test redemption
    const redRes = await databases.listDocuments(databaseId, COUPON_REDEMPTIONS_COLLECTION_ID, [
      Query.equal('orderId', testOrderId),
      Query.limit(10),
    ]);
    for (const doc of redRes.documents) {
      await databases.deleteDocument(databaseId, COUPON_REDEMPTIONS_COLLECTION_ID, doc.$id);
    }
  });
});
