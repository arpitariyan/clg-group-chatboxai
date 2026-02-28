import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function POST(request) {
  try {
    const { email, duration } = await request.json();

    if (!email || !duration) {
      return NextResponse.json(
        { error: 'Email and duration are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found with this email' },
        { status: 404 }
      );
    }

    // Calculate dates
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(duration));

    // Update user to Pro plan
    const { data, error } = await supabase
      .from('Users')
      .update({
        plan: 'pro',
        credits: 25000,
        subscription_start_date: now.toISOString(),
        subscription_end_date: endDate.toISOString(),
        is_manual_assignment: true,
      })
      .eq('email', email)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Pro plan assigned successfully',
      user: data[0],
    });
  } catch (error) {
    console.error('Error assigning plan:', error);
    return NextResponse.json(
      { error: 'Failed to assign plan' },
      { status: 500 }
    );
  }
}
