import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Temporarily commented out to fix build error
// import nodemailer from 'nodemailer';

// Create Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Temporarily commented out to fix build/hosting error
// Create email transporter (you'll need to configure this with your email service)
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST || 'smtp.gmail.com',
//   port: process.env.SMTP_PORT || 587,
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS
//   }
// });

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  try {
    const { email, userEmail } = await request.json();

    // Validate input
    if (!email || !userEmail || !email.includes('@gmail.com')) {
      return NextResponse.json(
        { error: 'Valid Gmail address is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('email')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database (you'll need to create this table)
    const { error: otpError } = await supabase
      .from('mfa_otps')
      .upsert({
        user_email: userEmail,
        mfa_email: email,
        otp: otp,
        expires_at: expiryTime.toISOString(),
        used: false
      });

    if (otpError) {
      console.error('Failed to store OTP:', otpError);
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Temporarily commented out email functionality to fix build/hosting error
    // Send OTP via email
    // try {
    //   await transporter.sendMail({
    //     from: `"ChatBox AI Security" <${process.env.SMTP_USER}>`,
    //     to: email,
    //     subject: 'ChatBox AI - Multi-Factor Authentication Setup',
    //     html: `
    //       <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    //         <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); padding: 30px; text-align: center;">
    //           <h1 style="color: white; margin: 0; font-size: 28px;">ChatBox AI</h1>
    //           <p style="color: #e5e7eb; margin: 10px 0 0 0;">Multi-Factor Authentication</p>
    //         </div>
            
    //         <div style="background: #ffffff; padding: 40px; border-left: 4px solid #8b5cf6;">
    //           <h2 style="color: #374151; margin-top: 0;">Security Verification Code</h2>
    //           <p style="color: #6b7280; line-height: 1.6;">
    //             Someone (hopefully you) is trying to enable Multi-Factor Authentication for your ChatBox AI account.
    //           </p>
              
    //           <div style="background: #f9fafb; border: 2px solid #8b5cf6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
    //             <p style="color: #374151; margin: 0 0 10px 0; font-weight: bold;">Your verification code is:</p>
    //             <div style="font-size: 32px; font-weight: bold; color: #8b5cf6; letter-spacing: 4px; font-family: 'Courier New', monospace;">
    //               ${otp}
    //             </div>
    //           </div>
              
    //           <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
    //             <p style="color: #92400e; margin: 0; font-size: 14px;">
    //               ⚠️ This code will expire in 10 minutes. If you didn't request this, please ignore this email.
    //             </p>
    //           </div>
              
    //           <p style="color: #6b7280; line-height: 1.6; margin-top: 30px;">
    //             Enter this code in your ChatBox AI settings to complete MFA setup and secure your account.
    //           </p>
              
    //           <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
    //             Need help? Contact us at support@chatboxai.com
    //           </p>
    //         </div>
            
    //         <div style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
    //           © 2025 ChatBox AI by Technon Pvt Ltd. All rights reserved.
    //         </div>
    //       </div>
    //     `
    //   });

    //   console.log('MFA OTP sent successfully to:', email);
    // } catch (emailError) {
    //   console.error('Failed to send OTP email:', emailError);
      
    //   // For development/testing, return OTP in response (remove in production)
    //   if (process.env.NODE_ENV === 'development') {
    //     return NextResponse.json({
    //       success: true,
    //       message: 'OTP generated (email service not configured)',
    //       devOTP: otp // Remove this in production
    //     });
    //   }
      
    //   return NextResponse.json(
    //     { error: 'Failed to send OTP email' },
    //     { status: 500 }
    //   );
    // }

    // Temporary fallback response while email service is disabled
    console.log('MFA OTP generated for:', email, '- OTP:', otp);
    
    return NextResponse.json({
      success: true,
      message: 'OTP generated successfully (email service temporarily disabled)',
      // For development/testing - remove in production when email service is restored
      devOTP: otp
    });

  } catch (error) {
    console.error('Send MFA OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP', details: error.message },
      { status: 500 }
    );
  }
}