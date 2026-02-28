import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function POST(request) {
  try {
    const { email, block } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Update user's blocked status
    const { data, error } = await supabase
      .from('Users')
      .update({ is_blocked: block })
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
      message: `User ${block ? 'blocked' : 'unblocked'} successfully`,
      user: data[0],
    });
  } catch (error) {
    console.error('Error updating user block status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}
