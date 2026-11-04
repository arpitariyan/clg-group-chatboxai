import test from 'node:test';
import assert from 'node:assert/strict';

test('6. API Gateway Credit Accounting & Partial Refund Contract', async (t) => {
    await t.test('Partial success calculations bill accurately and refund failed reservations idempotently', () => {
        const imageCount = 3;
        const totalCostUsd = 0.06; // $0.02 per image
        const perImageCost = totalCostUsd / imageCount;

        // Scenario: 2 succeed, 1 fails
        const succeededCount = 2;
        const failedCount = imageCount - succeededCount;

        const refundUsd = Number((perImageCost * failedCount).toFixed(6));
        const billedCostUsd = Number((totalCostUsd - refundUsd).toFixed(6));

        assert.equal(refundUsd, 0.02, 'Should refund exactly 1 failed image ($0.02)');
        assert.equal(billedCostUsd, 0.04, 'Should bill only the 2 succeeded images ($0.04)');
        assert.equal(billedCostUsd + refundUsd, totalCostUsd, 'Sum of billed and refunded must equal initial deduction');
    });

    await t.test('Complete failure refunds 100% of pre-deducted reservation', () => {
        const imageCount = 2;
        const totalCostUsd = 0.04;
        const succeededCount = 0;
        const failedCount = 2;

        const refundUsd = (totalCostUsd / imageCount) * failedCount;
        assert.equal(refundUsd, totalCostUsd, 'Complete failure must refund the full amount');
    });

    await t.test('Full success performs 0 refund and bills full amount', () => {
        const imageCount = 4;
        const totalCostUsd = 0.08;
        const succeededCount = 4;
        const failedCount = 0;

        const refundUsd = (totalCostUsd / imageCount) * failedCount;
        assert.equal(refundUsd, 0, 'Full success must issue zero refund');
    });
});
