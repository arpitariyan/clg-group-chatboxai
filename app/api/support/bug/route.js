import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, user_email } = body;

    // Validate request
    if (!title || !description || !user_email) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, user_email' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be less than 200 characters' },
        { status: 400 }
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { error: 'Description must be less than 2000 characters' },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('email')
      .eq('email', user_email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Insert bug report
    const { data: bugReport, error: insertError } = await supabase
      .from('bug_reports')
      .insert({
        user_email: user_email,
        title: title.trim(),
        description: description.trim(),
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Bug report submitted successfully',
      report_id: bugReport.id,
      status: bugReport.status
    });

  } catch (error) {
    console.error('Bug report submission error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to submit bug report',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user's bug reports
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_email = searchParams.get('user_email');

    if (!user_email) {
      return NextResponse.json(
        { error: 'Missing user_email parameter' },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('email')
      .eq('email', user_email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's bug reports
    const { data: bugReports, error: reportsError } = await supabase
      .from('bug_reports')
      .select('id, title, description, status, created_at')
      .eq('user_email', user_email)
      .order('created_at', { ascending: false });

    if (reportsError) {
      throw reportsError;
    }

    return NextResponse.json({
      success: true,
      reports: bugReports || []
    });

  } catch (error) {
    console.error('Bug reports retrieval error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve bug reports',
        details: error.message
      },
      { status: 500 }
    );
  }
}