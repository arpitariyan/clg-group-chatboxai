import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import crypto from 'crypto';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { MFA_OTPS_COLLECTION_ID } from '@/services/appwrite-collections';
import { checkRateLimit, getClientIp, rateLimitErrorBody } from '@/lib/rate-limiter';

const resend = new Resend(process.env.RESEND_API_KEY);

// The Chatbox AI logo — hosted on the public domain for email embedding
const LOGO_URL = 'https://chatboxai.co.in/Chatboxai_logo_main.png';

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
function generateSecureOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Build the HTML email template for the signup verification email.
 */
function buildEmailHtml(otp, recipientEmail) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Chatbox AI account</title>
</head>
<body style="margin:0;padding:0;background-color:#0c0a09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c0a09;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#13110f;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1025 0%,#2a1a40 100%);padding:36px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <img src="${LOGO_URL}" alt="Chatbox AI" width="130" height="auto" style="display:block;margin:0 auto 16px auto;filter:brightness(200%);" />
              <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:0.15em;font-weight:500;">Email Verification</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Verify your email address</h1>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.7;">
                You're almost there! Enter the 6-digit code below to complete your Chatbox AI account setup.
                This code is valid for <strong style="color:rgba(255,255,255,0.8);">10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:linear-gradient(135deg,rgba(90,74,122,0.2),rgba(58,44,90,0.2));border:1.5px solid rgba(90,74,122,0.5);border-radius:12px;padding:24px 40px;text-align:center;">
                      <p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Your Verification Code</p>
                      <p style="margin:0;font-size:44px;font-weight:700;color:#c4b5e0;letter-spacing:0.3em;font-family:'Courier New',Courier,monospace;">${otp}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:14px 18px;">
                    <p style="margin:0;color:rgba(245,200,100,0.85);font-size:13px;line-height:1.6;">
                      ⚠️&nbsp; If you did not create a Chatbox AI account, you can safely ignore this email.
                      Do not share this code with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:13px;line-height:1.6;">
                This code was requested for <strong style="color:rgba(255,255,255,0.5);">${recipientEmail}</strong>.
                Need help? Reply to this email or contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0c0a09;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.04);">
              <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;line-height:1.6;">
                © 2026 ChatBox AI · Developed by Arpit Ariyan Mahanarana (technon.co.in). All rights reserved.<br/>
                <a href="https://chatboxai.co.in/privacy-policy" style="color:rgba(255,255,255,0.3);text-decoration:underline;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="https://chatboxai.co.in/terms-conditions" style="color:rgba(255,255,255,0.3);text-decoration:underline;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request) {
  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const email = (body.email || '').toLowerCase().trim().slice(0, 254);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    // ── Rate limiting ──────────────────────────────────────────────────────────
    const emailRl = checkRateLimit(`signup-otp:email:${email}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailRl.allowed) {
      return NextResponse.json(rateLimitErrorBody(emailRl.retryAfterSec), {
        status: 429,
        headers: { 'Retry-After': String(emailRl.retryAfterSec) },
      });
    }

    const ipRl = checkRateLimit(`signup-otp:ip:${clientIp}`, {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipRl.allowed) {
      return NextResponse.json(rateLimitErrorBody(ipRl.retryAfterSec), {
        status: 429,
        headers: { 'Retry-After': String(ipRl.retryAfterSec) },
      });
    }

    // ── Generate OTP and store it ──────────────────────────────────────────────
    const otp = generateSecureOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any existing unverified OTPs for this email
    try {
      const existing = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
        Query.equal('user_email', email),
        Query.equal('mfa_email', email),
        Query.limit(10),
      ]);
      await Promise.allSettled(
        existing.documents.map((doc) =>
          databases.deleteDocument(DB_ID, MFA_OTPS_COLLECTION_ID, doc.$id)
        )
      );
    } catch (_) {
      // Non-fatal — proceed even if cleanup fails
    }

    await databases.createDocument(DB_ID, MFA_OTPS_COLLECTION_ID, ID.unique(), {
      user_email: email,
      mfa_email: email,
      otp: otp, // Storing plaintext as Appwrite attribute is limited to 10 chars
      expires_at: expiresAt,
      used: false,
      attempt_count: 0,
    });

    // ── Send email via Resend ──────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'Chatbox AI <no-reply@chatboxai.co.in>',
          to: [email],
          subject: 'Verify your Chatbox AI account',
          html: buildEmailHtml(otp, email),
        });

        return NextResponse.json({
          success: true,
          message: 'Verification code sent to your email.',
        });
      } catch (emailErr) {
        console.error('[Signup OTP] Resend error:', emailErr);

        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json({
            success: true,
            message: 'OTP generated (email failed — see devOTP)',
            devOTP: otp,
            emailError: emailErr.message,
          });
        }

        return NextResponse.json(
          { error: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // RESEND_API_KEY not configured — development fallback
      console.warn('[Signup OTP] RESEND_API_KEY not configured. Set it in .env.local');

      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: 'OTP generated (Resend not configured — see devOTP below)',
          devOTP: otp,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code sent. If you do not receive it, contact support.',
      });
    }
  } catch (error) {
    console.error('[Signup OTP] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
