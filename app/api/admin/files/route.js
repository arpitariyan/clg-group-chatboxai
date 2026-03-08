import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  LIBRARY_COLLECTION_ID,
  USERS_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';

    const offset = (page - 1) * limit;

    // Fetch Library docs that have uploadedFiles
    const libFilters = [
      Query.isNotNull('uploadedFiles'),
      Query.orderDesc('$createdAt'),
      Query.limit(500),
    ];
    const libRes = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, libFilters);

    // 2-step JOIN: get user names by email
    const emails = [...new Set(libRes.documents.map(d => d.userEmail).filter(Boolean))];
    let userMap = {};
    if (emails.length > 0) {
      const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('email', emails),
        Query.limit(emails.length + 10),
      ]);
      usersRes.documents.forEach(u => { userMap[u.email] = u.name; });
    }

    // Extract individual files from uploadedFiles JSON
    let allFiles = [];
    libRes.documents.forEach(lib => {
      let files = lib.uploadedFiles;
      if (typeof files === 'string') {
        try {
          files = JSON.parse(files);
        } catch {
          files = [];
        }
      }
      if (Array.isArray(files)) {
        files.forEach((file, index) => {
          allFiles.push({
            id: `${lib.libId}_${index}`,
            library_id: lib.libId,
            name: file.fileName || file.name || 'Untitled',
            type: file.fileType || file.type || 'unknown',
            size: file.fileSize || file.size || 0,
            path: file.path || file.filePath || '',
            url: file.publicUrl || file.url || '',
            user_email: lib.userEmail,
            user_name: userMap[lib.userEmail] || 'Unknown',
            created_at: lib.$createdAt,
          });
        });
      }
    });

    // Apply type filter
    if (type !== 'all') {
      allFiles = allFiles.filter(file => file.type?.includes(type));
    }

    // Apply search filter
    if (search) {
      const term = search.toLowerCase();
      allFiles = allFiles.filter(file =>
        file.name?.toLowerCase().includes(term) ||
        file.user_email?.toLowerCase().includes(term)
      );
    }

    const total = allFiles.length;
    const paginatedFiles = allFiles.slice(offset, offset + limit);

    return NextResponse.json({
      files: paginatedFiles,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
