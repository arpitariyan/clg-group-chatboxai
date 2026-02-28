import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function DELETE(request) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Group items by type for efficient deletion
    const libraryIds = [];
    const imageIds = [];

    items.forEach(item => {
      if (item.type === 'search' || item.type === 'research') {
        libraryIds.push(item.id);
      } else if (item.type === 'image') {
        imageIds.push(item.id);
      }
    });

    let deletedCount = 0;
    const errors = [];

    // Delete from Library table
    if (libraryIds.length > 0) {
      const { error: libraryError, count } = await supabase
        .from('Library')
        .delete()
        .in('id', libraryIds);

      if (libraryError) {
        errors.push(`Library deletion error: ${libraryError.message}`);
      } else {
        deletedCount += count || libraryIds.length;
      }
    }

    // Delete from ImageGeneration table
    if (imageIds.length > 0) {
      const { error: imageError, count } = await supabase
        .from('ImageGeneration')
        .delete()
        .in('id', imageIds);

      if (imageError) {
        errors.push(`Image deletion error: ${imageError.message}`);
      } else {
        deletedCount += count || imageIds.length;
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some deletions failed',
          details: errors,
          deletedCount 
        },
        { status: 207 } // Multi-Status
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} entries`,
      deletedCount
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json(
      { error: 'Failed to delete entries', details: error.message },
      { status: 500 }
    );
  }
}
