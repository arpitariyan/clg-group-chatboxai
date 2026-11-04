import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  COUPON_REDEMPTIONS_COLLECTION_ID,
  COUPONS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { verifyAdminRequest } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get('couponCode') || searchParams.get('code') || '').trim().toUpperCase();
    const status = (searchParams.get('status') || 'all').toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const filters = [Query.orderDesc('$createdAt'), Query.limit(100)];
    if (code) {
      filters.push(Query.equal('couponCode', code));
    }
    if (status !== 'all') {
      filters.push(Query.equal('status', status));
    }

    let res;
    try {
      res = await databases.listDocuments(DB_ID, COUPON_REDEMPTIONS_COLLECTION_ID, filters);
    } catch (err) {
      console.warn('[AdminRedemptions] Notice querying redemptions:', err.message);
      return NextResponse.json({
        success: true,
        redemptions: [],
        total: 0,
        page,
        limit,
        summary: {
          totalRedemptions: 0,
          totalDiscountGrantedRupees: 0,
          totalNetRevenueRupees: 0,
        },
      });
    }

    const allDocs = res.documents || [];
    let totalDiscountGrantedPaise = 0;
    let totalNetRevenuePaise = 0;
    let fulfilledCount = 0;

    const redemptions = allDocs.map((d) => {
      const isFulfilled = d.status === 'fulfilled' || d.status === 'succeeded';
      const discountP = Number(d.discountPaise || d.discountAmount || 0);
      const payableP = Number(d.payablePaise || d.payableAmount || 0);

      if (isFulfilled) {
        fulfilledCount++;
        totalDiscountGrantedPaise += discountP;
        totalNetRevenuePaise += payableP;
      }

      return {
        id: d.$id,
        $id: d.$id,
        couponId: d.couponId,
        couponCode: d.couponCode,
        userEmail: d.userEmail,
        orderId: d.orderId || d.razorpayOrderId,
        razorpayOrderId: d.orderId || d.razorpayOrderId,
        paymentId: d.paymentId,
        planType: d.planType,
        billingCycle: d.billingCycle,
        currency: d.currency || 'INR',
        subtotalPaise: d.subtotalPaise || d.originalAmount || 0,
        discountPaise: discountP,
        payablePaise: payableP,
        subtotalRupees: Number(((d.subtotalPaise || d.originalAmount || 0) / 100).toFixed(2)),
        discountRupees: Number((discountP / 100).toFixed(2)),
        payableRupees: Number((payableP / 100).toFixed(2)),
        status: d.status || d.redemptionStatus || 'reserved',
        reservedAt: d.reservedAt || d.createdAt,
        redeemedAt: d.redeemedAt || d.successfulRedemptionAt || d.reservedAt,
        createdAt: d.reservedAt || d.$createdAt,
      };
    });

    const paginated = redemptions.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      redemptions: paginated,
      total: redemptions.length,
      page,
      limit,
      summary: {
        totalRedemptions: fulfilledCount,
        totalDiscountGrantedPaise,
        totalDiscountGrantedRupees: Number((totalDiscountGrantedPaise / 100).toFixed(2)),
        totalNetRevenuePaise,
        totalNetRevenueRupees: Number((totalNetRevenuePaise / 100).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch redemptions', details: error.message },
      { status: 500 }
    );
  }
}
