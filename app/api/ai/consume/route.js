import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { MODEL_ACCESS, getOperationCost, canAccessModel } from '@/lib/modelAccess';

// Helper function to get user by email
async function getUser(email) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    throw new Error('User not found');
  }

  return user;
}

// Helper function to check and reset monthly credits if needed
async function maybeResetMonthly(user) {
  if (!user.last_monthly_reset) {
    // First time, set reset date
    const resetCredits = user.plan === 'pro' ? 25000 : 5000;
    await supabase
      .from('users')
      .update({
        credits: resetCredits,
        last_monthly_reset: new Date().toISOString().split('T')[0]
      })
      .eq('id', user.id);
    return resetCredits;
  }

  const lastReset = new Date(user.last_monthly_reset);
  const now = new Date();
  const daysDiff = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

  if (daysDiff >= 30) {
    const resetCredits = user.plan === 'pro' ? 25000 : 5000;
    await supabase
      .from('users')
      .update({
        credits: resetCredits,
        last_monthly_reset: now.toISOString().split('T')[0]
      })
      .eq('id', user.id);
    return resetCredits;
  }

  return user.credits;
}

// Helper function to update user credits
async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_email, model, operation_type = 'generation', cost } = body;

    // Validate request
    if (!user_email || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: user_email, model' },
        { status: 400 }
      );
    }

    // Get user data
    let user;
    try {
      user = await getUser(user_email);
    } catch (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if monthly reset is needed
    const currentCredits = await maybeResetMonthly(user);
    user.credits = currentCredits;

    // Check if user can access this model
    if (!canAccessModel(user.plan, model)) {
      return NextResponse.json(
        { 
          error: 'MODEL_FORBIDDEN',
          message: `${model} is not available for ${user.plan} plan users`,
          available_models: MODEL_ACCESS[user.plan]
        },
        { status: 403 }
      );
    }

    // Calculate operation cost
    let operationCost = cost || getOperationCost(user.plan, model);

    // Ensure free users always pay 15 credits regardless of model
    if (user.plan === 'free') {
      operationCost = 15;
    }

    // Check if user has sufficient credits
    if (user.credits < operationCost) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Insufficient credits. Required: ${operationCost}, Available: ${user.credits}`,
          required_credits: operationCost,
          available_credits: user.credits
        },
        { status: 402 } // Payment Required
      );
    }

    // Deduct credits
    const newCredits = Math.max(0, user.credits - operationCost);
    const updatedUser = await updateUser(user.id, { credits: newCredits });

    // Log the operation (optional, for analytics)
    try {
      await supabase
        .from('usage_logs')
        .insert({
          user_id: user.id,
          model: model,
          operation_type: operation_type,
          credits_consumed: operationCost,
          credits_remaining: newCredits,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log usage:', logError);
      // Don't fail the request for logging errors
    }

    return NextResponse.json({
      success: true,
      credits_consumed: operationCost,
      credits_remaining: newCredits,
      model: model,
      operation_type: operation_type,
      user_plan: user.plan
    });

  } catch (error) {
    console.error('AI consume API error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to process credit consumption',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check user's current credits and plan
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

    // Get user data
    let user;
    try {
      user = await getUser(user_email);
    } catch (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if monthly reset is needed
    const currentCredits = await maybeResetMonthly(user);

    return NextResponse.json({
      user_plan: user.plan,
      credits_remaining: currentCredits,
      monthly_limit: user.plan === 'pro' ? 25000 : 5000,
      last_reset: user.last_monthly_reset,
      available_models: MODEL_ACCESS[user.plan],
      is_special_account: user_email === 'arpitariyanm@gmail.com'
    });

  } catch (error) {
    console.error('AI consume GET error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to get user credits',
        details: error.message
      },
      { status: 500 }
    );
  }
}