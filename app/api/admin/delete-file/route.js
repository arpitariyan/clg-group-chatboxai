import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function DELETE(request) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Parse file ID to get library ID and file index
    const [libraryId, fileIndex] = fileId.split('_');

    // Get the library
    const { data: library, error: fetchError } = await supabase
      .from('Library')
      .select('uploadedFiles')
      .eq('libId', libraryId)
      .single();

    if (fetchError) throw fetchError;

    if (!library || !library.uploadedFiles) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const files = library.uploadedFiles;
    const fileToDelete = files[parseInt(fileIndex)];

    if (!fileToDelete) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const filePath = fileToDelete.path || fileToDelete.filePath;
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('mainStorage')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue even if storage deletion fails
      }
    }

    // Remove file from the uploadedFiles array
    const updatedFiles = files.filter((_, index) => index !== parseInt(fileIndex));

    // Update the library
    const { error: updateError } = await supabase
      .from('Library')
      .update({ uploadedFiles: updatedFiles.length > 0 ? updatedFiles : null })
      .eq('libId', libraryId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
