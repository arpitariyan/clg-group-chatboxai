import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLANS,
  normalizePlanDocument,
  getDynamicPlanPrice,
  getDynamicPlanPaidCredits,
  getDynamicPlanDailyCredits,
} from '../lib/dynamicPlanService.js';

describe('Renewal Dynamic Plan Service & Pricing Tests', () => {
  test('DEFAULT_PLANS has all 3 required plans', () => {
    assert.ok(DEFAULT_PLANS.free);
    assert.ok(DEFAULT_PLANS.pro);
    assert.ok(DEFAULT_PLANS.max);

    assert.equal(DEFAULT_PLANS.free.monthly_price, 0);
    assert.equal(DEFAULT_PLANS.pro.monthly_price, 499);
    assert.equal(DEFAULT_PLANS.pro.annual_price, 4990);
    assert.equal(DEFAULT_PLANS.max.monthly_price, 1999);
    assert.equal(DEFAULT_PLANS.max.annual_price, 19990);
  });

  test('normalizePlanDocument parses and sanitizes plan document', () => {
    const raw = {
      plan_id: 'pro',
      name: 'Pro Standard',
      monthly_price: 549,
      annual_price: 5490,
      features: JSON.stringify(['Feature 1', 'Feature 2']),
    };

    const normalized = normalizePlanDocument(raw);
    assert.equal(normalized.plan_id, 'pro');
    assert.equal(normalized.monthly_price, 549);
    assert.equal(normalized.annual_price, 5490);
    assert.deepEqual(normalized.features, ['Feature 1', 'Feature 2']);
  });

  test('getDynamicPlanPrice returns correct base amounts for monthly and annual cycles', async () => {
    // When live Appwrite or fallback is queried
    const proMonthly = await getDynamicPlanPrice('pro', 'monthly');
    const proAnnual = await getDynamicPlanPrice('pro', 'annual');
    const maxMonthly = await getDynamicPlanPrice('max', 'monthly');
    const maxAnnual = await getDynamicPlanPrice('max', 'annual');
    const freeMonthly = await getDynamicPlanPrice('free', 'monthly');

    assert.equal(typeof proMonthly, 'number');
    assert.ok(proMonthly > 0, 'Pro monthly price must be positive number');
    assert.equal(typeof proAnnual, 'number');
    assert.ok(proAnnual > proMonthly, 'Pro annual price must be larger than monthly');

    assert.equal(typeof maxMonthly, 'number');
    assert.ok(maxMonthly > proMonthly, 'Max monthly price must be larger than pro monthly');
    assert.equal(typeof maxAnnual, 'number');
    assert.ok(maxAnnual > maxMonthly, 'Max annual price must be larger than max monthly');

    assert.equal(freeMonthly, 0, 'Free plan price must be 0');
  });

  test('getDynamicPlanPaidCredits returns authoritative monthly paid credits', async () => {
    const proCredits = await getDynamicPlanPaidCredits('pro');
    const maxCredits = await getDynamicPlanPaidCredits('max');
    const freeCredits = await getDynamicPlanPaidCredits('free');

    assert.equal(freeCredits, 0, 'Free plan receives 0 paid credits');
    assert.ok(proCredits >= 30000, 'Pro plan receives at least 30,000 paid credits');
    assert.ok(maxCredits >= 150000, 'Max plan receives at least 150,000 paid credits');
  });

  test('getDynamicPlanDailyCredits returns authoritative daily credits', async () => {
    const proDaily = await getDynamicPlanDailyCredits('pro');
    const maxDaily = await getDynamicPlanDailyCredits('max');
    const freeDaily = await getDynamicPlanDailyCredits('free');

    assert.ok(proDaily >= 5000, 'Pro daily credits >= 5000');
    assert.ok(maxDaily >= 5000, 'Max daily credits >= 5000');
    assert.ok(freeDaily >= 5000, 'Free daily credits >= 5000');
  });
});
