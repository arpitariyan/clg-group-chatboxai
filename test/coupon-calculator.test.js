import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAuthoritativePlanSubtotalPaise,
  calculateCouponDiscount,
  normalizeCouponCode,
  MINIMUM_PAYABLE_PAISE,
} from '../lib/coupon-calculator.js';

describe('Authoritative Coupon Calculator — Master Prompt Specifications', () => {
  // Test Section 9.8 Exact Examples: 10% Percentage Discount
  test('Pro monthly 10% discount: subtotal ₹499.00, discount ₹49.90, final ₹449.10', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('pro', 'monthly');
    assert.equal(subtotalPaise, 49900, 'Pro monthly must equal 49,900 paise');

    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'percentage',
      discountValue: 10,
    });

    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 4990, 'Discount must be 4,990 paise');
    assert.equal(result.payablePaise, 44910, 'Payable must be 44,910 paise');
    assert.equal(result.discountRupees, 49.90);
    assert.equal(result.payableRupees, 449.10);
  });

  test('Pro annual 10% discount: subtotal ₹4,990.00, discount ₹499.00, final ₹4,491.00', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('pro', 'annual');
    assert.equal(subtotalPaise, 499000, 'Pro annual must equal 499,000 paise');

    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'percentage',
      discountValue: 10,
    });

    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 49900);
    assert.equal(result.payablePaise, 449100);
    assert.equal(result.discountRupees, 499.00);
    assert.equal(result.payableRupees, 4491.00);
  });

  test('Max monthly 10% discount: subtotal ₹1,999.00, discount ₹199.90, final ₹1,799.10', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('max', 'monthly');
    assert.equal(subtotalPaise, 199900, 'Max monthly must equal 199,900 paise');

    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'percentage',
      discountValue: 10,
    });

    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 19990);
    assert.equal(result.payablePaise, 179910);
    assert.equal(result.discountRupees, 199.90);
    assert.equal(result.payableRupees, 1799.10);
  });

  test('Max annual 10% discount: subtotal ₹19,990.00, discount ₹1,999.00, final ₹17,991.00', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('max', 'annual');
    assert.equal(subtotalPaise, 1999000, 'Max annual must equal 1,999,000 paise');

    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'percentage',
      discountValue: 10,
    });

    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 199900);
    assert.equal(result.payablePaise, 1799100);
    assert.equal(result.discountRupees, 1999.00);
    assert.equal(result.payableRupees, 17991.00);
  });

  // Test Section 9.8 Exact Examples: ₹100 Fixed Monetary Discount
  test('Pro monthly ₹100 fixed discount: subtotal ₹499.00, discount ₹100.00, final ₹399.00', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('pro', 'monthly');
    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'fixed',
      discountValue: 100,
    });

    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 10000);
    assert.equal(result.payablePaise, 39900);
    assert.equal(result.discountRupees, 100.00);
    assert.equal(result.payableRupees, 399.00);
  });

  test('Pro annual ₹100 fixed discount: subtotal ₹4,990.00, discount ₹100.00, final ₹4,890.00', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('pro', 'annual');
    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'fixed',
      discountValue: 100,
    });

    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 10000);
    assert.equal(result.payablePaise, 489000);
    assert.equal(result.discountRupees, 100.00);
    assert.equal(result.payableRupees, 4890.00);
  });

  test('Max monthly ₹100 fixed discount: subtotal ₹1,999.00, discount ₹100.00, final ₹1,899.00', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('max', 'monthly');
    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'fixed',
      discountValue: 100,
    });

    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 10000);
    assert.equal(result.payablePaise, 189900);
    assert.equal(result.discountRupees, 100.00);
    assert.equal(result.payableRupees, 1899.00);
  });

  test('Max annual ₹100 fixed discount: subtotal ₹19,990.00, discount ₹100.00, final ₹19,890.00', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('max', 'annual');
    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'fixed',
      discountValue: 100,
    });

    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 10000);
    assert.equal(result.payablePaise, 1989000);
    assert.equal(result.discountRupees, 100.00);
    assert.equal(result.payableRupees, 19890.00);
  });

  // Boundary & Validation Checks (Section 15.1)
  test('1% minimum percentage discount calculates accurately', () => {
    const subtotalPaise = 49900;
    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'percentage',
      discountValue: 1,
    });
    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 499);
    assert.equal(result.payablePaise, 49401);
  });

  test('15% percentage discount calculates accurately', () => {
    const subtotalPaise = 49900;
    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'percentage',
      discountValue: 15,
    });
    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 7485);
    assert.equal(result.payablePaise, 42415);
  });

  test('95% maximum percentage discount calculates accurately', () => {
    const subtotalPaise = 49900;
    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'percentage',
      discountValue: 95,
    });
    assert.equal(result.valid, true);
    assert.equal(result.discountPaise, 47405);
    assert.equal(result.payablePaise, 2495);
  });

  test('Zero percentage discount is rejected', () => {
    const result = calculateCouponDiscount({
      subtotalPaise: 49900,
      discountType: 'percentage',
      discountValue: 0,
    });
    assert.equal(result.valid, false);
  });

  test('Negative percentage discount is rejected', () => {
    const result = calculateCouponDiscount({
      subtotalPaise: 49900,
      discountType: 'percentage',
      discountValue: -15,
    });
    assert.equal(result.valid, false);
  });

  test('More than 95% percentage discount is rejected', () => {
    const result = calculateCouponDiscount({
      subtotalPaise: 49900,
      discountType: 'percentage',
      discountValue: 96,
    });
    assert.equal(result.valid, false);
    assert.match(result.error, /cannot exceed 95%/);
  });

  test('Fixed discount equal to subtotal is rejected (preventing free plan bypass)', () => {
    const result = calculateCouponDiscount({
      subtotalPaise: 49900,
      discountType: 'fixed',
      discountValue: 499,
    });
    assert.equal(result.valid, false);
    assert.match(result.error, /cannot equal or exceed/);
  });

  test('Fixed discount greater than subtotal is rejected', () => {
    const result = calculateCouponDiscount({
      subtotalPaise: 49900,
      discountType: 'fixed',
      discountValue: 600,
    });
    assert.equal(result.valid, false);
  });

  test('Coupon code normalization trims whitespace and converts to uppercase', () => {
    assert.equal(normalizeCouponCode('  save50  '), 'SAVE50');
    assert.equal(normalizeCouponCode('DiScOuNt10'), 'DISCOUNT10');
    assert.equal(normalizeCouponCode(''), '');
  });

  test('Free plan is not eligible for coupon discounts', () => {
    const subtotalPaise = getAuthoritativePlanSubtotalPaise('free', 'monthly');
    const result = calculateCouponDiscount({
      subtotalPaise,
      discountType: 'percentage',
      discountValue: 10,
    });
    assert.equal(result.valid, false);
  });
});
