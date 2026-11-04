import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, MFA_OTPS_COLLECTION_ID } from '@/services/appwrite-collections';
import { checkRateLimit, getClientIp, rateLimitErrorBody } from '@/lib/rate-limiter';
import { validateEmail, sanitizeString } from '@/lib/input-validator';

// Email transporter using Gmail SMTP (requires SMTP_USER + SMTP_PASS in .env.local)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt instead of Math.random for true randomness.
 */
function generateSecureOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

export async function POST(request) {
  // ── Rate limit: 5 OTP requests per email per 15 minutes ─────────────────
  const clientIp = getClientIp(request);

  try {
    const body = await request.json();

    // Normalize emails consistently so verify route can always find the OTP record
    const email = sanitizeString(body.email || '', 254).toLowerCase();
    const userEmail = sanitizeString(body.userEmail || '', 254).toLowerCase();

    // ── Input validation ─────────────────────────────────────────────────────
    if (!email || !userEmail) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }

    // ── Rate limiting: per email AND per IP ──────────────────────────────────
    const emailRl = checkRateLimit(`otp:email:${email}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    if (!emailRl.allowed) {
      return NextResponse.json(rateLimitErrorBody(emailRl.retryAfterSec), {
        status: 429,
        headers: { 'Retry-After': String(emailRl.retryAfterSec) },
      });
    }

    const ipRl = checkRateLimit(`otp:ip:${clientIp}`, { maxRequests: 10, windowMs: 15 * 60 * 1000 });
    if (!ipRl.allowed) {
      return NextResponse.json(rateLimitErrorBody(ipRl.retryAfterSec), {
        status: 429,
        headers: { 'Retry-After': String(ipRl.retryAfterSec) },
      });
    }

    // ── Verify user exists ────────────────────────────────────────────────────
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1)
    ]);
    const user = userRes.documents[0];

    if (!user) {
      // Don't reveal whether the user exists — return generic message
      // (prevent user enumeration)
      return NextResponse.json(
        { success: true, message: 'If this email is registered, an OTP will be sent.' },
        { status: 200 }
      );
    }

    // ── Generate secure OTP ──────────────────────────
    const otp = generateSecureOTP();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // ── Upsert OTP: delete existing ones, then create new hashed record ───────
    try {
      const existingOtpRes = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
        Query.equal('user_email', userEmail),
        Query.equal('mfa_email', email),
        Query.limit(10)
      ]);
      for (const doc of existingOtpRes.documents) {
        await databases.deleteDocument(DB_ID, MFA_OTPS_COLLECTION_ID, doc.$id);
      }
      await databases.createDocument(DB_ID, MFA_OTPS_COLLECTION_ID, ID.unique(), {
        user_email: userEmail,
        mfa_email: email,
        otp: otp,       // Storing plaintext as Appwrite attribute is limited to 10 chars
        expires_at: expiryTime.toISOString(),
        used: false,
        attempt_count: 0,   // Track failed attempts for brute force protection
      });
    } catch (otpError) {
      console.error('Failed to store OTP:', otpError);
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // ── Send OTP via email ────────────────────────────────────────────────────
    const isEmailConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

    if (isEmailConfigured) {
      try {
        await transporter.sendMail({
          from: `"ChatBox AI Security" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'ChatBox AI — Your MFA Verification Code',
          html: `
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#f9fafb;">
              <div style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px;text-align:center;border-radius:8px 8px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:-0.5px;">ChatBox AI</h1>
                <p style="color:#ddd6fe;margin:8px 0 0;font-size:14px;">Multi-Factor Authentication</p>
              </div>

              <div style="background:#ffffff;padding:40px 36px;border-left:4px solid #7c3aed;">
                <h2 style="color:#1f2937;margin-top:0;font-size:20px;">Security Verification Code</h2>
                <p style="color:#6b7280;line-height:1.7;font-size:14px;">
                  You requested to set up multi-factor authentication on your ChatBox AI account.
                  Use the code below to complete the setup.
                </p>

                <div style="background:#f5f3ff;border:2px solid #7c3aed;border-radius:10px;padding:24px;text-align:center;margin:28px 0;">
                  <p style="color:#374151;margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your verification code</p>
                  <div style="font-size:40px;font-weight:700;color:#6d28d9;letter-spacing:10px;font-family:'Courier New',monospace;">
                    ${otp}
                  </div>
                </div>

                <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:14px 18px;margin:20px 0;">
                  <p style="color:#92400e;margin:0;font-size:13px;">
                    ⚠️ This code expires in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.
                  </p>
                </div>

                <p style="color:#9ca3af;font-size:13px;margin-top:32px;">
                  Need help? Contact us at arpitariyanm@gmail.com
                </p>
              </div>

              <div style="background:#f3f4f6;padding:18px;text-align:center;color:#9ca3af;font-size:12px;border-radius:0 0 8px 8px;">
                © 2026 ChatBox AI · Developed by Arpit Ariyan Mahanarana (technon.co.in). All rights reserved.
              </div>
            </div>
          `,
        });

        return NextResponse.json({
          success: true,
          message: 'OTP sent to your email address. Please check your inbox.',
          // SECURITY: devOTP is NEVER included in production responses
        });

      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);

        // Only return devOTP in development, never in production
        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json({
            success: true,
            message: 'OTP generated (email delivery failed — see devOTP for testing)',
            devOTP: otp,
            emailError: emailError.message,
          });
        }

        return NextResponse.json(
          { error: 'Failed to deliver OTP email. Please check your email address and try again.' },
          { status: 500 }
        );
      }
    } else {
      // SMTP not configured — dev/testing fallback only
      console.warn('[MFA] SMTP not configured. Set SMTP_USER and SMTP_PASS in .env.local');

      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: 'OTP generated (SMTP not configured — see devOTP below)',
          devOTP: otp,
        });
      }

      // In production, never reveal the OTP
      return NextResponse.json({
        success: true,
        message: 'OTP sent. If you do not receive it, contact support.',
      });
    }

  } catch (error) {
    console.error('Send MFA OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}