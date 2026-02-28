import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function PUT(request) {
  try {
    const { email, updates } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Prepare update object
    const updateData = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.plan !== undefined) updateData.plan = updates.plan;
    if (updates.credits !== undefined) updateData.credits = updates.credits;

    // Update user
    const { data, error } = await supabase
      .from('Users')
      .update(updateData)
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
      message: 'User updated successfully',
      user: data[0],
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
