import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  BUG_REPORTS_COLLECTION_ID,
  SUBSCRIPTIONS_COLLECTION_ID,
  USAGE_LOGS_COLLECTION_ID
} from '@/services/appwrite-collections';

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { email, confirmation } = body;

    // Validate request
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Prevent deletion of special account
    if (email === 'arpitariyanm@gmail.com') {
      return NextResponse.json(
        { error: 'Cannot delete special account' },
        { status: 403 }
      );
    }

    // Get user data
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(1)
    ]);
    const user = userRes.documents[0];

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Begin transaction-like deletion
    const deletionSteps = [];

    try {
      // 1. Delete bug reports
      const bugReportsRes = await databases.listDocuments(DB_ID, BUG_REPORTS_COLLECTION_ID, [
        Query.equal('user_email', email),
        Query.limit(100)
      ]);
      for (const doc of bugReportsRes.documents) {
        await databases.deleteDocument(DB_ID, BUG_REPORTS_COLLECTION_ID, doc.$id);
      }
      // 2. Delete subscriptions
      const subscriptionsRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
        Query.equal('user_email', email),
        Query.limit(100)
      ]);
      for (const doc of subscriptionsRes.documents) {
        await databases.deleteDocument(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, doc.$id);
      }
      // 3. Delete usage logs (if exists)
      try {
        const usageLogsRes = await databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
          Query.equal('user_email', email),
          Query.limit(100)
        ]);
        for (const doc of usageLogsRes.documents) {
          await databases.deleteDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, doc.$id);
        }
      } catch (logError) {
        console.warn('Usage logs deletion issue:', logError);
      }

      // 4. Finally delete the user
      await databases.deleteDocument(DB_ID, USERS_COLLECTION_ID, user.$id);

      // Log the deletion for audit purposes
      // console.log(`Account deleted: ${email} (ID: ${user.$id})`);
      return NextResponse.json({
        success: true,
        message: 'Account successfully deleted',
        deleted_user_email: email
      });

    } catch (deleteError) {
      console.error('Account deletion error:', deleteError);
      
      return NextResponse.json(
        {
          error: 'Failed to delete account',
          details: deleteError.message,
          failed_steps: deletionSteps
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Account deletion request error:', error);
    
    return NextResponse.json(
      {
        error: 'Invalid deletion request',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check account deletion eligibility
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Check if it's special account
    if (email === 'arpitariyanm@gmail.com') {
      return NextResponse.json({
        eligible: false,
        reason: 'Special accounts cannot be deleted'
      });
    }

    // Get user data
    const getUserRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(1)
    ]);
    const getUser = getUserRes.documents[0];

    if (!getUser) {
      return NextResponse.json({
        eligible: false,
        reason: 'User not found'
      });
    }

    // Check for active subscriptions
    let subscriptions = [];
    try {
      const subsRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
        Query.equal('user_email', email),
        Query.equal('status', 'active'),
        Query.limit(100)
      ]);
      subscriptions = subsRes.documents;
    } catch (subError) {
      console.error('Error checking subscriptions:', subError);
    }

    const hasActiveSubscription = subscriptions.length > 0;

    return NextResponse.json({
      eligible: true,
      user: {
        email: getUser.email,
        plan: getUser.plan,
        created_at: getUser.$createdAt
      },
      warnings: {
        has_active_subscription: hasActiveSubscription,
        subscription_count: subscriptions.length
      },
      deletion_info: {
        data_deleted: [
          'User profile and preferences',
          'Credit and usage history',
          'Bug reports and support tickets',
          'Subscription records',
          'All associated data'
        ],
        irreversible: true,
        contact_support: 'For assistance, contact support before deletion'
      }
    });

  } catch (error) {
    console.error('Account deletion check error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check deletion eligibility',
        details: error.message
      },
      { status: 500 }
    );
  }
}