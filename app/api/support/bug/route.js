import { NextResponse } from 'next/server';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, BUG_REPORTS_COLLECTION_ID } from '@/services/appwrite-collections';

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
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', user_email),
      Query.limit(1)
    ]);
    const user = userRes.documents[0];

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Insert bug report
    const bugReport = await databases.createDocument(DB_ID, BUG_REPORTS_COLLECTION_ID, ID.unique(), {
      user_email: user_email,
      title: title.trim(),
      description: description.trim(),
      status: 'open'
    });

    return NextResponse.json({
      success: true,
      message: 'Bug report submitted successfully',
      report_id: bugReport.$id,
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
    const userGetRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', user_email),
      Query.limit(1)
    ]);
    const userGet = userGetRes.documents[0];

    if (!userGet) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's bug reports
    const bugReportsRes = await databases.listDocuments(DB_ID, BUG_REPORTS_COLLECTION_ID, [
      Query.equal('user_email', user_email),
      Query.orderDesc('$createdAt'),
      Query.limit(100)
    ]);

    return NextResponse.json({
      success: true,
      reports: bugReportsRes.documents
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