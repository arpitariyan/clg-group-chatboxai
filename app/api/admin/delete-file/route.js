import { NextResponse } from 'next/server';
import { databases, storage, DB_ID, BUCKET_ID, Query } from '@/services/appwrite-admin';
import { LIBRARY_COLLECTION_ID } from '@/services/appwrite-collections';

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
    const underscoreIndex = fileId.lastIndexOf('_');
    const libraryId = fileId.substring(0, underscoreIndex);
    const fileIndex = parseInt(fileId.substring(underscoreIndex + 1));

    // Get the library document by libId field
    const res = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('libId', libraryId),
      Query.limit(1),
    ]);

    if (res.documents.length === 0 || !res.documents[0].uploadedFiles) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const libraryDoc = res.documents[0];
    let files = libraryDoc.uploadedFiles;
    if (typeof files === 'string') {
      try {
        files = JSON.parse(files);
      } catch {
        files = [];
      }
    }
    if (!Array.isArray(files)) {
      files = [];
    }
    const fileToDelete = files[fileIndex];

    if (!fileToDelete) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete from Appwrite Storage using file ID
    const storageFileId = fileToDelete.fileId || fileToDelete.path || fileToDelete.filePath;
    if (storageFileId) {
      try {
        await storage.deleteFile(BUCKET_ID, storageFileId);
      } catch (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue even if storage deletion fails
      }
    }

    // Remove file from the uploadedFiles array
    const updatedFiles = files.filter((_, index) => index !== fileIndex);

    // Update the library document
    await databases.updateDocument(
      DB_ID,
      LIBRARY_COLLECTION_ID,
      libraryDoc.$id,
      { uploadedFiles: updatedFiles.length > 0 ? JSON.stringify(updatedFiles) : null }
    );

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
