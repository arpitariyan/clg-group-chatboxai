import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Build query for pro users
    let query = supabase
      .from('Users')
      .select('*')
      .eq('plan', 'pro');

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // Order by subscription_start_date descending
    query = query.order('subscription_start_date', { ascending: false });

    const { data: users, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      users: users || [],
    });
  } catch (error) {
    console.error('Error fetching pro users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pro users' },
      { status: 500 }
    );
  }
}
