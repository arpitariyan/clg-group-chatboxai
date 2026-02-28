import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Update user to free plan
    const { data, error } = await supabase
      .from('Users')
      .update({
        plan: 'free',
        credits: 5000,
        subscription_start_date: null,
        subscription_end_date: null,
        is_manual_assignment: false,
      })
      .eq('email', email)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pro plan cancelled successfully',
      user: data[0],
    });
  } catch (error) {
    console.error('Error cancelling plan:', error);
    return NextResponse.json(
      { error: 'Failed to cancel plan' },
      { status: 500 }
    );
  }
}
