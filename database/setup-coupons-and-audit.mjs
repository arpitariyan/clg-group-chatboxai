/**
 * Idempotent Appwrite Setup Script for Coupons, Redemptions, and Admin Audit Logs
 * 
 * Usage:
 *   node database/setup-coupons-and-audit.mjs
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Client, Databases } from 'node-appwrite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env.local');
config({ path: envPath });

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'http://localhost/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'main';

if (!projectId || !apiKey) {
  console.error('❌ Error: APPWRITE_PROJECT_ID and APPWRITE_API_KEY environment variables are required in .env.local');
  process.exit(1);
}

console.log('🚀 Initializing Appwrite Collections for Coupons & Audit Logs...');
console.log(`📍 Endpoint: ${endpoint}`);
console.log(`🗂️  Database ID: ${databaseId}`);

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

async function ensureCollection(collectionId, name) {
  try {
    const col = await databases.getCollection(databaseId, collectionId);
    console.log(`  ✓ Collection "${collectionId}" exists`);
    return col;
  } catch (err) {
    if (err.code === 404) {
      console.log(`  + Creating collection "${collectionId}" (${name})...`);
      return await databases.createCollection(databaseId, collectionId, name, [], true);
    }
    throw err;
  }
}

async function ensureStringAttribute(collectionId, key, size, required = false, defaultValue = null, array = false) {
  try {
    await databases.getAttribute(databaseId, collectionId, key);
    // Attribute exists
  } catch (err) {
    if (err.code === 404) {
      console.log(`    + Adding string attribute: ${key} (size ${size}, required: ${required})`);
      await databases.createStringAttribute(databaseId, collectionId, key, size, required, defaultValue, array);
      await new Promise(r => setTimeout(r, 600));
    } else {
      console.warn(`    ! Notice checking attribute ${key}:`, err.message);
    }
  }
}

async function ensureIntegerAttribute(collectionId, key, required = false, min = null, max = null, defaultValue = null) {
  try {
    await databases.getAttribute(databaseId, collectionId, key);
  } catch (err) {
    if (err.code === 404) {
      console.log(`    + Adding integer attribute: ${key} (required: ${required})`);
      await databases.createIntegerAttribute(databaseId, collectionId, key, required, min, max, defaultValue);
      await new Promise(r => setTimeout(r, 600));
    } else {
      console.warn(`    ! Notice checking attribute ${key}:`, err.message);
    }
  }
}

async function setupCoupons() {
  console.log('\n[1/3] Setting up "coupons" collection...');
  const colId = 'coupons';
  await ensureCollection(colId, 'Coupons & Promotional Offers');

  await ensureStringAttribute(colId, 'code', 32, true);
  await ensureStringAttribute(colId, 'discountType', 20, true);
  await ensureIntegerAttribute(colId, 'discountValue', true, 1, 10000000);
  await ensureStringAttribute(colId, 'applicablePlans', 20, false, null, true);
  await ensureStringAttribute(colId, 'applicableBillingCycles', 20, false, null, true);
  await ensureIntegerAttribute(colId, 'maxUses', false);
  await ensureIntegerAttribute(colId, 'currentUses', false, 0, null, 0);
  await ensureIntegerAttribute(colId, 'maxUsesPerUser', false, 1, null, 1);
  await ensureStringAttribute(colId, 'validFrom', 64, false);
  await ensureStringAttribute(colId, 'validUntil', 64, false);
  await ensureStringAttribute(colId, 'status', 20, false, 'active');
  await ensureStringAttribute(colId, 'description', 500, false);
  await ensureStringAttribute(colId, 'createdBy', 255, false);
  await ensureStringAttribute(colId, 'createdAt', 64, false);
  console.log('  ✓ "coupons" collection attributes configured.');
}

async function setupCouponRedemptions() {
  console.log('\n[2/3] Setting up "coupon_redemptions" collection...');
  const colId = 'coupon_redemptions';
  await ensureCollection(colId, 'Coupon Redemptions Ledger');

  await ensureStringAttribute(colId, 'couponId', 64, true);
  await ensureStringAttribute(colId, 'couponCode', 32, true);
  await ensureStringAttribute(colId, 'userEmail', 255, true);
  await ensureStringAttribute(colId, 'orderId', 64, true);
  await ensureStringAttribute(colId, 'paymentId', 64, false);
  await ensureStringAttribute(colId, 'planType', 20, true);
  await ensureStringAttribute(colId, 'billingCycle', 20, true);
  await ensureStringAttribute(colId, 'currency', 10, false, 'INR');
  await ensureIntegerAttribute(colId, 'subtotalPaise', true);
  await ensureIntegerAttribute(colId, 'discountPaise', true);
  await ensureIntegerAttribute(colId, 'payablePaise', true);
  await ensureStringAttribute(colId, 'status', 20, false, 'reserved');
  await ensureStringAttribute(colId, 'reservedAt', 64, true);
  await ensureStringAttribute(colId, 'redeemedAt', 64, false);
  await ensureStringAttribute(colId, 'expiresAt', 64, true);
  console.log('  ✓ "coupon_redemptions" collection attributes configured.');
}

async function setupAdminAuditLogs() {
  console.log('\n[3/3] Setting up "admin_audit_logs" collection...');
  const colId = 'admin_audit_logs';
  await ensureCollection(colId, 'Administrative Audit Logs');

  await ensureStringAttribute(colId, 'actorEmail', 255, true);
  await ensureStringAttribute(colId, 'action', 64, true);
  await ensureStringAttribute(colId, 'targetType', 64, true);
  await ensureStringAttribute(colId, 'targetId', 255, true);
  await ensureStringAttribute(colId, 'reason', 1000, true);
  await ensureStringAttribute(colId, 'details', 65535, true);
  await ensureStringAttribute(colId, 'status', 20, false, 'success');
  await ensureStringAttribute(colId, 'createdAt', 64, true);
  console.log('  ✓ "admin_audit_logs" collection attributes configured.');
}

async function run() {
  try {
    await setupCoupons();
    await setupCouponRedemptions();
    await setupAdminAuditLogs();
    console.log('\n🎉 Successfully verified and configured all Appwrite collections!\n');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
  }
}

run();
