import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';

    const offset = (page - 1) * limit;

    // Get all libraries with uploaded files
    let query = supabase
      .from('Library')
      .select('libId, userEmail, uploadedFiles, createdAt, Users!inner(name, email)')
      .not('uploadedFiles', 'is', null)
      .order('createdAt', { ascending: false });

    if (search) {
      query = query.or(`userEmail.ilike.%${search}%`);
    }

    const { data: libraries, error } = await query;

    if (error) throw error;

    // Extract individual files from the uploadedFiles JSON
    let allFiles = [];
    libraries?.forEach(lib => {
      const files = lib.uploadedFiles;
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
            user_name: lib.Users?.name || 'Unknown',
            created_at: lib.createdAt,
          });
        });
      }
    });

    // Apply type filter
    if (type !== 'all') {
      allFiles = allFiles.filter(file => file.type?.includes(type));
    }

    // Apply search filter on filename
    if (search) {
      allFiles = allFiles.filter(file => 
        file.name?.toLowerCase().includes(search.toLowerCase()) ||
        file.user_email?.toLowerCase().includes(search.toLowerCase())
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
