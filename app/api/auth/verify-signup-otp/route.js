import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, MFA_OTPS_COLLECTION_ID } from '@/services/appwrite-collections';
import { checkRateLimit, getClientIp, rateLimitErrorBody } from '@/lib/rate-limiter';

const MAX_OTP_ATTEMPTS = 5;

/**
 * Constant-time comparison to prevent timing attacks.
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/**
 * Sweep expired OTPs for a user asynchronously (non-blocking cleanup).
 */
async function sweepExpiredOtps(email) {
  try {
    const allRes = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
      Query.equal('user_email', email),
      Query.limit(20),
    ]);
    const now = new Date();
    const expired = allRes.documents.filter(
      (doc) => doc.expires_at && new Date(doc.expires_at) < now
    );
    await Promise.allSettled(
      expired.map((doc) => databases.deleteDocument(DB_ID, MFA_OTPS_COLLECTION_ID, doc.$id))
    );
  } catch (err) {
    console.warn('[Signup OTP] Sweep error (non-fatal):', err.message);
  }
}

export async function POST(request) {
  const clientIp = getClientIp(request);

  // ── Rate limit ──────────────────────────────────────────────────────────────
  const ipRl = checkRateLimit(`signup-otp-verify:ip:${clientIp}`, {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipRl.allowed) {
    return NextResponse.json(rateLimitErrorBody(ipRl.retryAfterSec), {
      status: 429,
      headers: { 'Retry-After': String(ipRl.retryAfterSec) },
    });
  }

  try {
    const body = await request.json();
    const otp = (body.otp || '').toString().trim().slice(0, 10);
    const email = (body.email || '').toLowerCase().trim().slice(0, 254);

    if (!otp || !/^\d{6}$/.test(otp) || !email) {
      return NextResponse.json(
        { error: 'A valid 6-digit code and email are required' },
        { status: 400 }
      );
    }

    // ── Look up OTP record ────────────────────────────────────────────────────
    const otpRes = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
      Query.equal('user_email', email),
      Query.equal('mfa_email', email),
      Query.equal('used', false),
      Query.limit(1),
    ]);
    const otpRecord = otpRes.documents[0];

    if (!otpRecord) {
      sweepExpiredOtps(email);
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      );
    }

    // ── Brute-force protection ────────────────────────────────────────────────
    const attemptCount = Number(otpRecord.attempt_count || 0);
    if (attemptCount >= MAX_OTP_ATTEMPTS) {
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, {
        used: true,
      });
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // ── Check expiry ──────────────────────────────────────────────────────────
    if (new Date() > new Date(otpRecord.expires_at)) {
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, { used: true });
      sweepExpiredOtps(email);
      return NextResponse.json(
        { error: 'Code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // ── Compare OTP ──────────────────────────────────────────────────────
    const isValid = secureCompare(otp, otpRecord.otp);

    if (!isValid) {
      try {
        await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, {
          attempt_count: attemptCount + 1,
        });
      } catch (e) {
        console.error('[Signup OTP] Failed to increment attempt count:', e.message);
      }
      const remaining = MAX_OTP_ATTEMPTS - (attemptCount + 1);
      return NextResponse.json(
        {
          error: `Invalid code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}`,
        },
        { status: 400 }
      );
    }

    // ── OTP is valid — mark as used ───────────────────────────────────────────
    await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, { used: true });

    // ── Mark user as signup-verified in the users collection ─────────────────
    try {
      const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('email', email),
        Query.limit(1),
      ]);
      const userDoc = userRes.documents[0];
      if (userDoc) {
        await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDoc.$id, {
          signup_verified: true,
        });
      }
    } catch (updateErr) {
      console.error('[Signup OTP] Failed to mark user as signup_verified:', updateErr.message);
      // Non-fatal for now — user can still proceed. The next profile fetch will re-check.
    }

    sweepExpiredOtps(email);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (error) {
    console.error('[Signup OTP] Verify error:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
