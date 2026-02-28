import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || 'all';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('Users')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // Apply plan filter
    if (plan !== 'all') {
      query = query.eq('plan', plan);
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
