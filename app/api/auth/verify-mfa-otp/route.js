import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, MFA_OTPS_COLLECTION_ID } from '@/services/appwrite-collections';
import { checkRateLimit, getClientIp, rateLimitErrorBody } from '@/lib/rate-limiter';
import { isValidOtp, sanitizeString } from '@/lib/input-validator';

const MAX_OTP_ATTEMPTS = 5; // Lock after 5 failed attempts

/**
 * Constant-time comparison to prevent timing attacks on hash comparison
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

// Helper: delete expired OTPs for a user (runs opportunistically after verification)
async function sweepExpiredOtps(userEmail) {
  try {
    const now = new Date();
    const allOtpsRes = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
      Query.equal('user_email', userEmail),
      Query.limit(20),
    ]);
    const expired = allOtpsRes.documents.filter(
      (doc) => doc.expires_at && new Date(doc.expires_at) < now
    );
    if (expired.length > 0) {
      await Promise.allSettled(
        expired.map((doc) => databases.deleteDocument(DB_ID, MFA_OTPS_COLLECTION_ID, doc.$id))
      );
    }
  } catch (err) {
    console.warn('[MFA] OTP sweep error (non-fatal):', err.message);
  }
}

export async function POST(request) {
  // ── Rate limit: 10 verify attempts per IP per 15 minutes ─────────────────
  const clientIp = getClientIp(request);
  const ipRl = checkRateLimit(`otp-verify:ip:${clientIp}`, { maxRequests: 10, windowMs: 15 * 60 * 1000 });
  if (!ipRl.allowed) {
    return NextResponse.json(rateLimitErrorBody(ipRl.retryAfterSec), {
      status: 429,
      headers: { 'Retry-After': String(ipRl.retryAfterSec) },
    });
  }

  try {
    const body = await request.json();
    const { enableMfa } = body;

    // Normalize and sanitize inputs — must match how send-mfa-otp stores them
    const otp = sanitizeString(body.otp || '', 10).trim();
    const email = sanitizeString(body.email || '', 254).toLowerCase();
    const userEmail = sanitizeString(body.userEmail || '', 254).toLowerCase();

    // ── Validate OTP format ──────────────────────────────────────────────────
    if (!isValidOtp(otp) || !email || !userEmail) {
      return NextResponse.json(
        { error: 'Valid 6-digit OTP is required' },
        { status: 400 }
      );
    }

    // ── Look up user document ────────────────────────────────────────────────
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1)
    ]);
    const user = userRes.documents[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── Look up OTP record (WITHOUT comparing OTP value — compare hash below) ─
    const otpRes = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
      Query.equal('user_email', userEmail),
      Query.equal('mfa_email', email),
      Query.equal('used', false),
      Query.limit(1)
    ]);
    const otpRecord = otpRes.documents[0];

    if (!otpRecord) {
      sweepExpiredOtps(userEmail);
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 400 }
      );
    }

    // ── Brute-force protection: check attempt count ───────────────────────────
    const attemptCount = Number(otpRecord.attempt_count || 0);
    if (attemptCount >= MAX_OTP_ATTEMPTS) {
      // Mark as used to prevent further attempts
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, { used: true });
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    // ── Check expiry ─────────────────────────────────────────────────────────
    const now = new Date();
    const expiryTime = new Date(otpRecord.expires_at);
    if (now > expiryTime) {
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, { used: true });
      sweepExpiredOtps(userEmail);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // ── Compare OTP ──────────────────────────────────────────────────────────
    const isValid = secureCompare(otp, otpRecord.otp);

    if (!isValid) {
      // Increment attempt count for brute-force protection
      try {
        await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, {
          attempt_count: attemptCount + 1,
        });
      } catch (e) {
        console.error('[MFA] Failed to increment attempt count:', e.message);
      }

      const remainingAttempts = MAX_OTP_ATTEMPTS - (attemptCount + 1);
      return NextResponse.json(
        {
          error: `Invalid OTP. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new OTP.'}`,
        },
        { status: 400 }
      );
    }

    // ── OTP is valid — mark as used ──────────────────────────────────────────
    try {
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, { used: true });
    } catch (e) {
      console.error('[MFA] Failed to mark OTP as used:', e.message);
    }

    // ── Update MFA status in user record ────────────────────────────────────
    let updatedUser = null;
    if (enableMfa !== false) {
      try {
        updatedUser = await databases.updateDocument(
          DB_ID,
          USERS_COLLECTION_ID,
          user.$id,
          {
            mfa_enabled: true,
            mfa_email: email,
          }
        );
      } catch (updateErr) {
        console.error('[MFA] Failed to update mfa_enabled in users collection:', updateErr.message);
        return NextResponse.json(
          { error: 'OTP verified but failed to save MFA settings. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Sweep expired OTPs asynchronously
    sweepExpiredOtps(userEmail);

    return NextResponse.json({
      success: true,
      message: 'OTP verified and MFA enabled successfully.',
      user: updatedUser,
    });

  } catch (error) {
    console.error('[MFA] Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}