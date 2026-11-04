import { NextResponse } from 'next/server';
import { databases, DB_ID } from '@/services/appwrite-admin';
import { ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID } from '@/services/appwrite-collections';
import { MODEL_ACCESS, getOperationCost, canAccessModel } from '@/lib/modelAccess';
import { getPlanMonthlyCredits, normalizePlan } from '@/lib/subscriptionPlans';
import { withUser } from '@/lib/request-context';

// Helper function to get user by email
async function getUser(email) {
  const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
    Query.equal('email', email),
    Query.limit(1),
  ]);

  if (res.documents.length === 0) {
    throw new Error('User not found');
  }

  return res.documents[0];
}

// Helper function to check and reset credits if needed
async function maybeResetCredits(user) {
  let needsUpdate = false;
  const updates = {};
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const normalizedPlan = normalizePlan(user.plan);

  // 1. Daily Free Credits Reset
  if (!user.last_daily_reset || user.last_daily_reset !== todayStr) {
    updates.credits = 5000;
    updates.last_daily_reset = todayStr;
    needsUpdate = true;
  }

  // 2. Monthly Paid Credits Reset
  if (normalizedPlan !== 'free') {
    let shouldResetMonthly = false;
    if (!user.last_monthly_reset) {
      shouldResetMonthly = true;
    } else {
      const lastReset = new Date(user.last_monthly_reset);
      const daysDiff = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 30) shouldResetMonthly = true;
    }
    
    if (shouldResetMonthly) {
      const currentPaid = Math.max(0, Number(user.paid_credits ?? 0));
      updates.paid_credits = currentPaid + getPlanMonthlyCredits(normalizedPlan);
      updates.last_monthly_reset = todayStr;
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, updates);
    return { ...user, ...updates };
  }
  return user;
}

// Helper function to update user credits
async function updateUser(docId, updates) {
  const updatedDoc = await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, docId, updates);
  return updatedDoc;
}

export const POST = withUser(async function POST(request, ctx) {
  try {
    const body = await request.json().catch(() => ({}));
    const { model, operation_type = 'generation', cost } = body;
    const user_email = ctx.assertEmail(body.user_email);

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

    // Check if reset is needed
    user = await maybeResetCredits(user);

    // Check if user can access this model (allow paid models if user has paid_credits > 0)
    const hasPaidCreditsAvailable = (user.paid_credits || 0) > 0;
    if (!canAccessModel(model, user.plan, user.paid_credits) && !hasPaidCreditsAvailable) {
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

    // Ensure free users pay standard cost for models
    if (user.plan === 'free' && !hasPaidCreditsAvailable) {
      operationCost = 15;
    }

    // Determine which wallet to use
    // If it's a paid model and user has paid_credits > 0 or a paid plan, use paid_credits. Else use daily credits.
    const isFreeModel = (MODEL_ACCESS.free || []).includes(model);
    const usePaidWallet = !isFreeModel && (hasPaidCreditsAvailable || user.plan !== 'free');
    const activeWalletCredits = usePaidWallet ? (user.paid_credits || 0) : user.credits;

    // Check if user has sufficient credits
    if (activeWalletCredits < operationCost) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Insufficient ${usePaidWallet ? 'paid-model' : 'daily free'} credits. Required: ${operationCost}, Available: ${activeWalletCredits}`,
          required_credits: operationCost,
          available_credits: activeWalletCredits
        },
        { status: 402 } // Payment Required
      );
    }

    // Deduct credits
    const newCredits = Math.max(0, activeWalletCredits - operationCost);
    const updateField = usePaidWallet ? 'paid_credits' : 'credits';
    const updatedUser = await updateUser(user.$id, { [updateField]: newCredits });

    // Log the operation
    try {
      await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
        user_id: user.$id,
        user_email: user.email,
        model: model,
        operation_type: operation_type,
        credits_consumed: operationCost,
        credits_remaining: newCredits
      });
    } catch (logError) {
      console.error('Failed to log usage:', logError);
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
});

// GET endpoint to check user's current credits and plan
export const GET = withUser(async function GET(request, ctx) {
  try {
    const { searchParams } = new URL(request.url);
    const user_email = ctx.assertEmail(searchParams.get('user_email'));

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

    // Check if reset is needed
    user = await maybeResetCredits(user);

    return NextResponse.json({
      user_plan: user.plan,
      credits_remaining: user.credits,
      paid_credits_remaining: user.paid_credits || 0,
      monthly_limit: getPlanMonthlyCredits(normalizePlan(user.plan)),
      last_reset: user.last_monthly_reset,
      last_daily_reset: user.last_daily_reset,
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
});
