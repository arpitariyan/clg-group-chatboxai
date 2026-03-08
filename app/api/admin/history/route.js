import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  LIBRARY_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  USERS_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';

    const offset = (page - 1) * limit;
    let allHistory = [];

    // Fetch from Library table (searches and research)
    if (type === 'all' || type === 'search' || type === 'research') {
      const libFilters = [
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ];
      if (search) {
        // search by userEmail or userInput
        libFilters.push(Query.search('userInput', search));
      }
      const libRes = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, libFilters);

      // 2-step JOIN for user names
      const libEmails = [...new Set(libRes.documents.map(d => d.userEmail).filter(Boolean))];
      let libUserMap = {};
      if (libEmails.length > 0) {
        const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
          Query.equal('email', libEmails),
          Query.limit(libEmails.length + 10),
        ]);
        usersRes.documents.forEach(u => { libUserMap[u.email] = u.name; });
      }

      // Filter by email search manually if needed
      let libDocs = libRes.documents;
      if (search) {
        const term = search.toLowerCase();
        libDocs = libDocs.filter(item =>
          item.userEmail?.toLowerCase().includes(term) ||
          item.userInput?.toLowerCase().includes(term)
        );
      }

      const libraryHistory = libDocs.map(item => ({
        id: item.libId,
        type: 'search',
        user_email: item.userEmail,
        user_name: libUserMap[item.userEmail] || 'Unknown',
        input: item.userInput,
        result: item.aiResponse,
        created_at: item.$createdAt,
      }));

      allHistory = [...allHistory, ...libraryHistory];
    }

    // Fetch from ImageGeneration table
    if (type === 'all' || type === 'image') {
      const imgFilters = [
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ];
      if (search) {
        imgFilters.push(Query.search('prompt', search));
      }
      const imgRes = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, imgFilters);

      // Get user names
      const imgEmails = [...new Set(imgRes.documents.map(d => d.userEmail).filter(Boolean))];
      let imgUserMap = {};
      if (imgEmails.length > 0) {
        const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
          Query.equal('email', imgEmails),
          Query.limit(imgEmails.length + 10),
        ]);
        usersRes.documents.forEach(u => { imgUserMap[u.email] = u.name; });
      }

      let imgDocs = imgRes.documents;
      if (search) {
        const term = search.toLowerCase();
        imgDocs = imgDocs.filter(item =>
          item.userEmail?.toLowerCase().includes(term) ||
          item.prompt?.toLowerCase().includes(term)
        );
      }

      const imageHistory = imgDocs.map(item => ({
        id: item.libId,
        type: 'image',
        user_email: item.userEmail,
        user_name: imgUserMap[item.userEmail] || 'Unknown',
        input: item.prompt,
        result: item.status === 'completed' ? 'Image generated successfully' : `Status: ${item.status}`,
        image_url: item.generatedImageUrl,
        created_at: item.$createdAt,
      }));

      allHistory = [...allHistory, ...imageHistory];
    }

    // Sort all history by date
    allHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply pagination
    const total = allHistory.length;
    const paginatedHistory = allHistory.slice(offset, offset + limit);

    return NextResponse.json({
      history: paginatedHistory,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
