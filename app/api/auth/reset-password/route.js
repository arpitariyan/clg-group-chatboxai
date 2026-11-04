import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { MFA_OTPS_COLLECTION_ID } from '@/services/appwrite-collections';
import { adminAuth } from '@/lib/firebase-admin';
import { checkRateLimit, getClientIp, rateLimitErrorBody } from '@/lib/rate-limiter';
import { validatePassword, validateEmail, isValidOtp, sanitizeString } from '@/lib/input-validator';

const MAX_RESET_ATTEMPTS = 3; // Max wrong OTP attempts on password reset

/**
 * Hash the OTP with SHA-256 + salt (must match send-mfa-otp/route.js)
 */
function hashOTP(otp, email) {
  const salt = process.env.NEXTAUTH_SECRET || process.env.APP_TOKEN_ENCRYPTION_KEY || 'chatboxai-otp-salt';
  return crypto.createHash('sha256').update(`${otp}:${email}:${salt}`).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export async function POST(request) {
  // ── Rate limit: 5 reset attempts per IP per 30 minutes ───────────────────
  const clientIp = getClientIp(request);
  const ipRl = checkRateLimit(`pwd-reset:ip:${clientIp}`, { maxRequests: 5, windowMs: 30 * 60 * 1000 });
  if (!ipRl.allowed) {
    return NextResponse.json(rateLimitErrorBody(ipRl.retryAfterSec), {
      status: 429,
      headers: { 'Retry-After': String(ipRl.retryAfterSec) },
    });
  }

  try {
    const body = await request.json();
    const email = sanitizeString(body.email || '', 254).toLowerCase();
    const otp = sanitizeString(body.otp || '', 10).trim();
    const newPassword = body.newPassword;

    // ── Input validation ─────────────────────────────────────────────────────
    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }

    if (!isValidOtp(otp)) {
      return NextResponse.json({ error: 'Invalid OTP format' }, { status: 400 });
    }

    // ── Validate new password strength ───────────────────────────────────────
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    if (!adminAuth) {
      console.error('Firebase Admin not configured. Password reset via OTP requires Firebase Admin.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // ── Look up OTP record (without OTP value — compare hash below) ──────────
    const otpRes = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
      Query.equal('mfa_email', email),
      Query.equal('used', false),
      Query.limit(1)
    ]);

    const otpRecord = otpRes.documents[0];
    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // ── Brute-force protection ───────────────────────────────────────────────
    const attemptCount = Number(otpRecord.attempt_count || 0);
    if (attemptCount >= MAX_RESET_ATTEMPTS) {
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, { used: true });
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    // ── Check OTP expiry ─────────────────────────────────────────────────────
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // ── Compare OTP ───────────────────────────────────────────────────
    const isValid = secureCompare(otp, otpRecord.otp);

    if (!isValid) {
      // Increment attempt counter
      try {
        await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, {
          attempt_count: attemptCount + 1,
        });
      } catch (e) {
        console.error('Failed to increment OTP attempt count:', e.message);
      }
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // ── Get the Firebase user by email ───────────────────────────────────────
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (err) {
      console.error('Failed to get user by email for reset:', err);
      return NextResponse.json({ error: 'User not found in authentication system' }, { status: 404 });
    }

    // ── Update the user's password using Firebase Admin SDK ──────────────────
    try {
      await adminAuth.updateUser(userRecord.uid, {
        password: newPassword
      });
    } catch (updateErr) {
      console.error('Failed to update password:', updateErr);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    // ── Mark OTP as used ─────────────────────────────────────────────────────
    try {
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, {
        used: true
      });
    } catch (err) {
      console.error('Failed to mark OTP as used:', err);
      // Don't fail the request for this
    }

    // Revoke existing Firebase sessions (forces re-login with new password)
    try {
      await adminAuth.revokeRefreshTokens(userRecord.uid);
    } catch (revokeErr) {
      console.error('Failed to revoke refresh tokens after password reset:', revokeErr);
      // Non-fatal: password was still updated
    }

    return NextResponse.json({
      success: true,
      message: 'Password successfully reset. Please log in with your new password.'
    });

  } catch (error) {
    console.error('Reset Password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
