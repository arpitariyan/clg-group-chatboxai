import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, MFA_OTPS_COLLECTION_ID } from '@/services/appwrite-collections';

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

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Normalize emails consistently so verify route can always find the OTP record
    const email = (body.email || '').trim().toLowerCase();
    const userEmail = (body.userEmail || '').trim().toLowerCase();

    // Validate input
    if (!email || !userEmail || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1)
    ]);
    const user = userRes.documents[0];

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert OTP: delete existing ones for this user+mfa_email, then create new
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
        otp: otp,
        expires_at: expiryTime.toISOString(),
        used: false
      });
    } catch (otpError) {
      console.error('Failed to store OTP:', otpError);
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Send OTP via email
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
                  Need help? Contact us at support@chatboxai.app
                </p>
              </div>

              <div style="background:#f3f4f6;padding:18px;text-align:center;color:#9ca3af;font-size:12px;border-radius:0 0 8px 8px;">
                © 2025 ChatBox AI by Technon Pvt Ltd. All rights reserved.
              </div>
            </div>
          `,
        });

        // console.log('MFA OTP email sent to:', email);

        return NextResponse.json({
          success: true,
          message: 'OTP sent to your email address. Please check your inbox.',
          ...(process.env.NODE_ENV === 'development' && { devOTP: otp }),
        });

      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);

        // Still return success in dev so developer can test with devOTP
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
      // SMTP not configured — dev/testing fallback
      console.warn('[MFA] SMTP not configured. Set SMTP_USER and SMTP_PASS in .env.local');
      // console.log('[MFA] Dev OTP for', email, ':', otp);

      return NextResponse.json({
        success: true,
        message: process.env.NODE_ENV === 'development'
          ? 'OTP generated (SMTP not configured — see devOTP below)'
          : 'OTP sent. If you do not receive it, contact support.',
        devOTP: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
    }

  } catch (error) {
    console.error('Send MFA OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP', details: error.message },
      { status: 500 }
    );
  }
}