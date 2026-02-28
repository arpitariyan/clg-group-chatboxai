import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkUserPlan, getSubscriptionDetails, getSubscriptionStatusMessage } from '@/lib/planUtils';

// Create Supabase client with service role for database operations
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
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('email, name, plan, credits, subscription_start_date, subscription_end_date, last_monthly_reset')
      .eq('email', email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: `User not found: ${userError.message}` },
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
    const [totalUsers, proUsers, expiredUsers, recentDowngrades] = await Promise.all([
      // Total users
      supabase.from('Users').select('*', { count: 'exact', head: true }),
      
      // Current pro users
      supabase.from('Users').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
      
      // Users with expired subscriptions but still showing as pro
      supabase.from('Users').select('*', { count: 'exact', head: true })
        .eq('plan', 'pro')
        .not('subscription_end_date', 'is', null)
        .lte('subscription_end_date', new Date().toISOString()),
      
      // Recent downgrades (last 7 days)
      supabase.from('usage_logs').select('*', { count: 'exact', head: true })
        .eq('operation_type', 'auto_downgrade')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Get some recent pro users for detail
    const { data: recentProUsers } = await supabase
      .from('Users')
      .select('email, plan, subscription_start_date, subscription_end_date')
      .eq('plan', 'pro')
      .not('subscription_end_date', 'is', null)
      .order('subscription_start_date', { ascending: false })
      .limit(5);

    // Calculate some stats
    const usersWithSubscriptionDates = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true })
      .not('subscription_start_date', 'is', null)
      .not('subscription_end_date', 'is', null);

    return NextResponse.json({
      system: {
        totalUsers: totalUsers.count || 0,
        proUsers: proUsers.count || 0,
        expiredUsers: expiredUsers.count || 0,
        usersWithSubscriptionDates: usersWithSubscriptionDates.count || 0
      },
      recent: {
        recentDowngrades: recentDowngrades.count || 0,
        recentProUsers: recentProUsers || []
      },
      health: {
        subscriptionSystemActive: true,
        lastChecked: new Date().toISOString(),
        nextScheduledCheck: 'Daily at midnight UTC'
      },
      alerts: expiredUsers.count > 0 ? 
        [`⚠️ ${expiredUsers.count} users have expired subscriptions that need to be downgraded`] : 
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