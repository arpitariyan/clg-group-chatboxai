import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request) {
  try {
    const { otp, email, userEmail } = await request.json();

    // Validate input
    if (!otp || !email || !userEmail || otp.length !== 6) {
      return NextResponse.json(
        { error: 'Valid OTP is required' },
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

    // Get and verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('mfa_otps')
      .select('*')
      .eq('user_email', userEmail)
      .eq('mfa_email', email)
      .eq('otp', otp)
      .eq('used', false)
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    const now = new Date();
    const expiryTime = new Date(otpRecord.expires_at);
    
    if (now > expiryTime) {
      // Mark OTP as used so it can't be used again
      await supabase
        .from('mfa_otps')
        .update({ used: true })
        .eq('id', otpRecord.id);

      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    const { error: updateOtpError } = await supabase
      .from('mfa_otps')
      .update({ used: true })
      .eq('id', otpRecord.id);

    if (updateOtpError) {
      console.error('Failed to mark OTP as used:', updateOtpError);
    }

    // OTP is valid
    console.log('MFA OTP verified successfully for user:', userEmail);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Verify MFA OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP', details: error.message },
      { status: 500 }
    );
  }
}