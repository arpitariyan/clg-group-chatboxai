import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, plan')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Begin transaction-like deletion
    const deletionSteps = [];

    try {
      // 1. Delete bug reports
      const { error: bugReportsError } = await supabase
        .from('bug_reports')
        .delete()
        .eq('user_id', user.id);
      
      if (bugReportsError) {
        deletionSteps.push('Failed to delete bug reports');
        throw bugReportsError;
      }

      // 2. Delete subscriptions
      const { error: subscriptionsError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id);
      
      if (subscriptionsError) {
        deletionSteps.push('Failed to delete subscriptions');
        throw subscriptionsError;
      }

      // 3. Delete usage logs (if exists)
      try {
        await supabase
          .from('usage_logs')
          .delete()
          .eq('user_id', user.id);
      } catch (logError) {
        console.warn('Usage logs table may not exist:', logError);
      }

      // 4. Finally delete the user
      const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (userDeleteError) {
        deletionSteps.push('Failed to delete user record');
        throw userDeleteError;
      }

      // Log the deletion for audit purposes
      console.log(`Account deleted: ${email} (ID: ${user.id})`);

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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, created_at')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        eligible: false,
        reason: 'User not found'
      });
    }

    // Check for active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (subError) {
      console.error('Error checking subscriptions:', subError);
    }

    const hasActiveSubscription = subscriptions && subscriptions.length > 0;

    return NextResponse.json({
      eligible: true,
      user: {
        email: user.email,
        plan: user.plan,
        created_at: user.created_at
      },
      warnings: {
        has_active_subscription: hasActiveSubscription,
        subscription_count: subscriptions?.length || 0
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