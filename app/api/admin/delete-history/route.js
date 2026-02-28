import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function DELETE(request) {
  try {
    const { id, type } = await request.json();

    if (!id || !type) {
      return NextResponse.json(
        { error: 'ID and type are required' },
        { status: 400 }
      );
    }

    let error;

    // Delete based on type
    if (type === 'search' || type === 'research') {
      // Delete from Library table
      const { error: deleteError } = await supabase
        .from('Library')
        .delete()
        .eq('libId', id);
      error = deleteError;
    } else if (type === 'image') {
      // Delete from ImageGeneration table
      const { error: deleteError } = await supabase
        .from('ImageGeneration')
        .delete()
        .eq('libId', id);
      error = deleteError;
    } else {
      return NextResponse.json(
        { error: 'Invalid history type' },
        { status: 400 }
      );
    }

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'History entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting history:', error);
    return NextResponse.json(
      { error: 'Failed to delete history entry' },
      { status: 500 }
    );
  }
}
