import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  COUPONS_COLLECTION_ID,
  COUPON_REDEMPTIONS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { verifyAdminRequest } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.errorResponse;

  try {
    const { couponId } = await params;
    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const coupon = await databases.getDocument(DB_ID, COUPONS_COLLECTION_ID, couponId);

    let redemptions = [];
    try {
      const redRes = await databases.listDocuments(DB_ID, COUPON_REDEMPTIONS_COLLECTION_ID, [
        Query.equal('couponId', couponId),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]);
      redemptions = redRes.documents || [];
    } catch {
      // redemptions collection may be empty
    }

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.$id,
        $id: coupon.$id,
        ...coupon,
      },
      redemptions,
    });
  } catch (error) {
    console.error('Error fetching coupon details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupon details', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.errorResponse;

  try {
    const { couponId } = await params;
    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const existing = await databases.getDocument(DB_ID, COUPONS_COLLECTION_ID, couponId);

    const updatePayload = {};

    if (body.status !== undefined) {
      updatePayload.status = body.status;
    } else if (body.isActive !== undefined) {
      updatePayload.status = body.isActive ? 'active' : 'paused';
    }

    if (body.description !== undefined) {
      updatePayload.description = String(body.description || '').trim() || null;
    }

    if (body.validUntil !== undefined) {
      updatePayload.validUntil = body.validUntil ? new Date(body.validUntil).toISOString() : null;
    }

    if (body.maxUses !== undefined || body.maxRedemptions !== undefined) {
      const rawUses = body.maxUses !== undefined ? body.maxUses : body.maxRedemptions;
      updatePayload.maxUses = (rawUses !== null && rawUses !== '') ? Number(rawUses) : null;
    }

    if (body.maxUsesPerUser !== undefined || body.maxRedemptionsPerUser !== undefined) {
      updatePayload.maxUsesPerUser = Number(body.maxUsesPerUser || body.maxRedemptionsPerUser) || 1;
    }

    if (Array.isArray(body.applicablePlans || body.eligiblePlans)) {
      updatePayload.applicablePlans = (body.applicablePlans || body.eligiblePlans).map((p) => String(p).toLowerCase());
    }

    if (Array.isArray(body.applicableBillingCycles || body.eligibleBillingCycles)) {
      updatePayload.applicableBillingCycles = (body.applicableBillingCycles || body.eligibleBillingCycles).map((c) => String(c).toLowerCase());
    }

    // Guard: Prevent modifying discount value or type if already redeemed
    const currentUses = Number(existing.currentUses || existing.redemptionCount) || 0;
    if (currentUses > 0) {
      if (
        (body.discountValue !== undefined && body.discountValue !== existing.discountValue) ||
        (body.discountType !== undefined && body.discountType !== existing.discountType)
      ) {
        return NextResponse.json(
          {
            error: `Cannot modify discount rate for coupon "${existing.code}" because it has already been redeemed ${currentUses} times. Existing redemptions and orders rely on this rate.`,
          },
          { status: 409 }
        );
      }
    } else {
      if (body.discountType && ['percentage', 'fixed'].includes(body.discountType)) {
        updatePayload.discountType = body.discountType;
      }
      if (body.discountValue !== undefined && Number(body.discountValue) > 0) {
        updatePayload.discountValue = Math.round(Number(body.discountValue));
      }
    }

    const updated = await databases.updateDocument(
      DB_ID,
      COUPONS_COLLECTION_ID,
      couponId,
      updatePayload
    );

    return NextResponse.json({
      success: true,
      message: `Coupon ${existing.code} updated successfully`,
      coupon: {
        id: updated.$id,
        $id: updated.$id,
        ...updated,
      },
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update coupon', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.errorResponse;

  try {
    const { couponId } = await params;
    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const existing = await databases.getDocument(DB_ID, COUPONS_COLLECTION_ID, couponId);

    // Delete coupon document from Appwrite
    await databases.deleteDocument(DB_ID, COUPONS_COLLECTION_ID, couponId);

    return NextResponse.json({
      success: true,
      message: `Coupon ${existing.code} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete coupon', details: error.message },
      { status: 500 }
    );
  }
}
