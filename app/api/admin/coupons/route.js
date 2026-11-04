import { NextResponse } from 'next/server';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { COUPONS_COLLECTION_ID } from '@/services/appwrite-collections';
import { verifyAdminRequest } from '@/lib/server-auth';
import { normalizeCouponCode } from '@/lib/coupon-calculator';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const statusFilter = (searchParams.get('status') || 'all').toLowerCase();
    const typeFilter = (searchParams.get('type') || 'all').toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const filters = [Query.orderDesc('$createdAt'), Query.limit(100)];
    let res;
    try {
      res = await databases.listDocuments(DB_ID, COUPONS_COLLECTION_ID, filters);
    } catch (err) {
      console.warn('[AdminCoupons] Notice listing coupons:', err.message);
      return NextResponse.json({
        success: true,
        coupons: [],
        total: 0,
        page,
        limit,
        notice: 'Coupons collection is not yet created or contains no records.',
      });
    }

    const now = new Date();
    let coupons = (res.documents || []).map((doc) => {
      const isExpired = Boolean(doc.validUntil && new Date(doc.validUntil) < now);
      return {
        id: doc.$id,
        $id: doc.$id,
        code: doc.code,
        discountType: doc.discountType,
        discountValue: Number(doc.discountValue),
        applicablePlans: Array.isArray(doc.applicablePlans) ? doc.applicablePlans : ['pro', 'max'],
        applicableBillingCycles: Array.isArray(doc.applicableBillingCycles) ? doc.applicableBillingCycles : ['monthly', 'annual'],
        maxUses: doc.maxUses ? Number(doc.maxUses) : null,
        currentUses: Number(doc.currentUses || 0),
        maxUsesPerUser: Number(doc.maxUsesPerUser || 1),
        validFrom: doc.validFrom || null,
        validUntil: doc.validUntil || null,
        status: doc.status || 'active',
        isExpired,
        description: doc.description || '',
        createdBy: doc.createdBy || '',
        createdAt: doc.createdAt || doc.$createdAt,
      };
    });

    if (search) {
      const term = search.toUpperCase();
      coupons = coupons.filter(
        (c) =>
          c.code?.toUpperCase().includes(term) ||
          c.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      coupons = coupons.filter((c) => c.discountType === typeFilter);
    }

    if (statusFilter === 'active') {
      coupons = coupons.filter((c) => c.status === 'active' && !c.isExpired);
    } else if (statusFilter === 'paused') {
      coupons = coupons.filter((c) => c.status === 'paused');
    } else if (statusFilter === 'expired') {
      coupons = coupons.filter((c) => c.status === 'expired' || c.isExpired);
    }

    const total = coupons.length;
    const paginated = coupons.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      coupons: paginated,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.errorResponse;

  const adminEmail = auth.user?.email || 'admin@chatboxai.com';

  try {
    const body = await request.json();
    const {
      code,
      description = '',
      discountType = 'percentage',
      discountValue,
      applicablePlans,
      eligiblePlans,
      applicableBillingCycles,
      eligibleBillingCycles,
      maxUses,
      maxRedemptions,
      maxUsesPerUser,
      maxRedemptionsPerUser,
      validFrom,
      validUntil,
      status = 'active',
    } = body;

    const normalizedCode = normalizeCouponCode(code);
    if (!normalizedCode || normalizedCode.length < 3) {
      return NextResponse.json(
        { error: 'Coupon code must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
      return NextResponse.json(
        { error: 'Discount type must be either "percentage" or "fixed".' },
        { status: 400 }
      );
    }

    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      return NextResponse.json(
        { error: 'Discount value must be a positive number.' },
        { status: 400 }
      );
    }

    if (discountType === 'percentage' && (val < 1 || val > 95)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 1% and 95%.' },
        { status: 400 }
      );
    }

    // Uniqueness check
    try {
      const existing = await databases.listDocuments(DB_ID, COUPONS_COLLECTION_ID, [
        Query.equal('code', normalizedCode),
        Query.limit(1),
      ]);
      if (existing.documents && existing.documents.length > 0) {
        return NextResponse.json(
          { error: `Coupon code "${normalizedCode}" already exists.` },
          { status: 409 }
        );
      }
    } catch (checkErr) {
      console.warn('[AdminCoupons] Notice checking code uniqueness:', checkErr.message);
    }

    const resolvedPlans = Array.isArray(applicablePlans || eligiblePlans)
      ? (applicablePlans || eligiblePlans).map((p) => String(p).toLowerCase())
      : ['pro', 'max'];

    const resolvedCycles = Array.isArray(applicableBillingCycles || eligibleBillingCycles)
      ? (applicableBillingCycles || eligibleBillingCycles).map((c) => String(c).toLowerCase())
      : ['monthly', 'annual'];

    const resolvedMaxUses = (maxUses !== undefined && maxUses !== '' && maxUses !== null)
      ? Number(maxUses)
      : (maxRedemptions ? Number(maxRedemptions) : null);

    const resolvedMaxPerUser = Number(maxUsesPerUser || maxRedemptionsPerUser) || 1;

    const now = new Date().toISOString();

    const couponRecord = {
      code: normalizedCode,
      discountType,
      discountValue: Math.round(val),
      applicablePlans: resolvedPlans,
      applicableBillingCycles: resolvedCycles,
      maxUses: resolvedMaxUses,
      currentUses: 0,
      maxUsesPerUser: resolvedMaxPerUser,
      validFrom: validFrom ? new Date(validFrom).toISOString() : now,
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      status: status || 'active',
      description: String(description || '').trim() || null,
      createdBy: adminEmail,
      createdAt: now,
    };

    const newCoupon = await databases.createDocument(
      DB_ID,
      COUPONS_COLLECTION_ID,
      ID.unique(),
      couponRecord
    );

    return NextResponse.json({
      success: true,
      message: `Coupon ${normalizedCode} created successfully`,
      coupon: {
        id: newCoupon.$id,
        $id: newCoupon.$id,
        ...couponRecord,
      },
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create coupon', details: error.message },
      { status: 500 }
    );
  }
}
