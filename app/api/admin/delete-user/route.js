import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function DELETE(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Delete user's data from all related tables
    // Delete from Library
    await supabase
      .from('Library')
      .delete()
      .eq('userEmail', email);

    // Delete from ImageGeneration
    await supabase
      .from('ImageGeneration')
      .delete()
      .eq('userEmail', email);

    // Delete from Chats (if exists)
    await supabase
      .from('Chats')
      .delete()
      .eq('userEmail', email);

    // Finally delete the user
    const { error: deleteError } = await supabase
      .from('Users')
      .delete()
      .eq('email', email);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
