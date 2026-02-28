import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

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
      let libraryQuery = supabase
        .from('Library')
        .select('libId, userEmail, userInput, aiResponse, createdAt, Users!inner(name, email)')
        .order('createdAt', { ascending: false });

      if (search) {
        libraryQuery = libraryQuery.or(`userEmail.ilike.%${search}%,userInput.ilike.%${search}%`);
      }

      const { data: libraryData } = await libraryQuery.limit(100);

      const libraryHistory = libraryData?.map(item => ({
        id: item.libId,
        type: 'search',
        user_email: item.userEmail,
        user_name: item.Users?.name || 'Unknown',
        input: item.userInput,
        result: item.aiResponse,
        created_at: item.createdAt,
      })) || [];

      allHistory = [...allHistory, ...libraryHistory];
    }

    // Fetch from ImageGeneration table
    if (type === 'all' || type === 'image') {
      let imageQuery = supabase
        .from('ImageGeneration')
        .select('libId, userEmail, prompt, generatedImageUrl, created_at, status')
        .order('created_at', { ascending: false });

      if (search) {
        imageQuery = imageQuery.or(`userEmail.ilike.%${search}%,prompt.ilike.%${search}%`);
      }

      const { data: imageData } = await imageQuery.limit(100);

      // Get user details for images
      const emails = [...new Set(imageData?.map(item => item.userEmail) || [])];
      const { data: usersData } = await supabase
        .from('Users')
        .select('email, name')
        .in('email', emails);

      const userMap = {};
      usersData?.forEach(user => {
        userMap[user.email] = user.name;
      });

      const imageHistory = imageData?.map(item => ({
        id: item.libId,
        type: 'image',
        user_email: item.userEmail,
        user_name: userMap[item.userEmail] || 'Unknown',
        input: item.prompt,
        result: item.status === 'completed' ? 'Image generated successfully' : `Status: ${item.status}`,
        image_url: item.generatedImageUrl,
        created_at: item.created_at,
      })) || [];

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
