import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      NEXT_PUBLIC_RAZORPAY_KEY_ID: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NODE_ENV: process.env.NODE_ENV
    };

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Environment variables check completed'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check environment variables', details: error.message },
      { status: 500 }
    );
  }
}