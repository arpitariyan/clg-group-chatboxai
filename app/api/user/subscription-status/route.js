import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID } from '@/services/appwrite-collections';
import { checkUserPlan, getSubscriptionDetails, getSubscriptionStatusMessage } from '@/lib/planUtils-server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const action = searchParams.get('action') || 'status';

    if (action === 'overview') {
      return await getSystemOverview();
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required. Use ?email=user@example.com or ?action=overview' },
        { status: 400 }
      );
    }

    // Get comprehensive user subscription status
    const [planInfo, subscriptionDetails, statusMessage] = await Promise.all([
      checkUserPlan(email),
      getSubscriptionDetails(email),
      getSubscriptionStatusMessage(email)
    ]);

    // Get user data from database
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(1)
    ]);
    const user = userRes.documents[0];

    if (!user) {
      return NextResponse.json(
        { error: `User not found` },
        { status: 404 }
      );
    }

    // Calculate additional info
    const now = new Date();
    const hasSubscriptionDates = !!(user.subscription_start_date && user.subscription_end_date);
    const daysRemaining = hasSubscriptionDates ? 
      Math.ceil((new Date(user.subscription_end_date) - now) / (1000 * 60 * 60 * 24)) : null;

    const response = {
      user: {
        email: user.email,
        name: user.name,
        currentPlan: user.plan,
        credits: user.credits,
        lastMonthlyReset: user.last_monthly_reset
      },
      subscription: {
        hasSubscriptionDates,
        startDate: user.subscription_start_date,
        endDate: user.subscription_end_date,
        daysRemaining,
        isActive: subscriptionDetails.isActive,
        statusMessage
      },
      planCheck: {
        isPro: planInfo.isPro,
        effectivePlan: planInfo.plan,
        isExpired: planInfo.isExpired,
        expiresAt: planInfo.expiresAt
      },
      timestamps: {
        checkTime: now.toISOString(),
        timezone: 'UTC'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in user status check:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function getSystemOverview() {
  try {
    // Get subscription system overview
    const [totalUsersRes, proUsersRes, expiredUsersRes, recentDowngradesRes] = await Promise.all([
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [Query.limit(1)]),
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [Query.equal('plan', 'pro'), Query.limit(1)]),
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('plan', 'pro'),
        Query.lessThanEqual('subscription_end_date', new Date().toISOString()),
        Query.limit(1)
      ]),
      databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
        Query.equal('operation_type', 'auto_downgrade'),
        Query.greaterThanEqual('$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        Query.limit(1)
      ])
    ]);

    // Get some recent pro users for detail
    const recentProRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('plan', 'pro'),
      Query.orderDesc('subscription_start_date'),
      Query.limit(5)
    ]);
    const recentProUsers = recentProRes.documents;

    // Users with subscription dates
    const usersWithDatesRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.isNotNull('subscription_start_date'),
      Query.isNotNull('subscription_end_date'),
      Query.limit(1)
    ]);

    const expiredCount = expiredUsersRes.total;

    return NextResponse.json({
      system: {
        totalUsers: totalUsersRes.total,
        proUsers: proUsersRes.total,
        expiredUsers: expiredCount,
        usersWithSubscriptionDates: usersWithDatesRes.total
      },
      recent: {
        recentDowngrades: recentDowngradesRes.total,
        recentProUsers
      },
      health: {
        subscriptionSystemActive: true,
        lastChecked: new Date().toISOString(),
        nextScheduledCheck: 'Daily at midnight UTC'
      },
      alerts: expiredCount > 0 ?
        [`⚠️ ${expiredCount} users have expired subscriptions that need to be downgraded`] :
        ['✅ No expired subscriptions found']
    });

  } catch (error) {
    console.error('Error in system overview:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate system overview',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}