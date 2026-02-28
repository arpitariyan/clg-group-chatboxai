import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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

// Verify Razorpay webhook signature
const verifySignature = (body, signature) => {
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET);
  hmac.update(JSON.stringify(body));
  const generated_signature = hmac.digest('hex');
  return generated_signature === signature;
};

export async function POST(request) {
  try {
    console.log('=== PAYMENT WEBHOOK REQUEST START ===');
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);
    console.log('Environment check:');
    console.log('  - RAZORPAY_KEY_SECRET:', !!process.env.RAZORPAY_KEY_SECRET);
    console.log('  - RAZORPAY_WEBHOOK_SECRET:', !!process.env.RAZORPAY_WEBHOOK_SECRET);
    console.log('  - SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);

    const body = await request.json();
    console.log('Request body keys:', Object.keys(body));
    console.log('Request body:', JSON.stringify(body, null, 2));

    const signature = request.headers.get('X-Razorpay-Signature');
    console.log('Razorpay signature header:', !!signature);

    // For manual verification calls (from frontend)
    if (body.razorpay_order_id && body.razorpay_payment_id && body.razorpay_signature) {
      console.log('Processing manual payment verification');
      const result = await handlePaymentVerification(body);
      console.log('=== PAYMENT VERIFICATION COMPLETED ===');
      return result;
    }

    // For webhook calls
    if (signature) {
      console.log('Processing webhook call');
      const result = await handleWebhook(body, signature);
      console.log('=== WEBHOOK PROCESSING COMPLETED ===');
      return result;
    }

    console.log('Invalid request - missing required data');
    return NextResponse.json(
      { error: 'Invalid request - missing payment data or signature', success: false },
      { status: 400 }
    );

  } catch (error) {
    console.error('=== WEBHOOK PROCESSING ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

async function handlePaymentVerification(body) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, user_email } = body;

  console.log('Processing payment verification for:', { razorpay_order_id, razorpay_payment_id, user_email });

  try {
    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !user_email) {
      return NextResponse.json(
        { error: 'Missing required payment verification data', success: false },
        { status: 400 }
      );
    }

    // Check if environment variables exist
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Payment verification configuration error', success: false },
        { status: 500 }
      );
    }

    // Verify payment signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    console.log('Signature verification:', {
      provided: razorpay_signature,
      generated: generated_signature,
      match: generated_signature === razorpay_signature
    });

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Payment signature verification failed', success: false },
        { status: 400 }
      );
    }

    console.log('Payment signature verified successfully');

    // Check if user exists in the Users table (capital U to match existing schema)
    const { data: existingUser, error: userError } = await supabase
      .from('Users')
      .select('id, email, plan, credits')
      .eq('email', user_email)
      .single();

    if (userError || !existingUser) {
      console.error('User not found:', userError);

      // If user doesn't exist, create them with Pro plan
      console.log('Creating new user with Pro plan');
      
      // Calculate subscription dates
      const subscriptionStartDate = new Date();
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // Add 1 month

      console.log('Setting subscription dates for new user:', {
        start: subscriptionStartDate.toISOString(),
        end: subscriptionEndDate.toISOString()
      });

      const newUser = {
        email: user_email,
        name: getUserNameFromEmail(user_email),
        plan: 'pro',
        credits: 25000,
        last_monthly_reset: new Date().toISOString().split('T')[0],
        subscription_start_date: subscriptionStartDate.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString(),
        mfa_enabled: false,
        accent_color: 'violet',
        language: 'en'
      };

      const { data: createdUser, error: createError } = await supabase
        .from('Users')
        .insert([newUser])
        .select()
        .single();

      if (createError) {
        console.error('Failed to create new user:', createError);
        return NextResponse.json(
          { error: `Failed to create user: ${createError.message}`, success: false },
          { status: 500 }
        );
      }

      console.log('New user created successfully:', { 
        email: user_email, 
        plan: 'pro', 
        credits: 25000,
        subscription_start: subscriptionStartDate.toISOString(),
        subscription_end: subscriptionEndDate.toISOString()
      });

      // Store subscription record for new user
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_email: user_email,
          razorpay_order_id: razorpay_order_id,
          plan_type: 'pro',
          amount: 29900, // ₹299 in paisa
          currency: 'INR',
          status: 'active'
        });

      if (subscriptionError) {
        console.error('Failed to store subscription for new user:', subscriptionError);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and Pro plan activated for new user',
        user: {
          id: createdUser.id,
          email: createdUser.email,
          plan: createdUser.plan,
          credits: createdUser.credits
        }
      });
    }

    console.log('User found:', { id: existingUser.id, email: existingUser.email, currentPlan: existingUser.plan });

    // Calculate subscription dates
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // Add 1 month

    console.log('Setting subscription dates:', {
      start: subscriptionStartDate.toISOString(),
      end: subscriptionEndDate.toISOString()
    });

    // Update existing user to Pro plan with subscription dates
    const { data: updatedUser, error: updateError } = await supabase
      .from('Users')
      .update({
        plan: 'pro',
        credits: 25000,
        last_monthly_reset: new Date().toISOString().split('T')[0],
        subscription_start_date: subscriptionStartDate.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString()
      })
      .eq('email', user_email)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update user:', updateError);
      return NextResponse.json(
        { error: `Failed to update user plan: ${updateError.message}`, success: false },
        { status: 500 }
      );
    }

    console.log('User updated successfully:', { 
      email: user_email, 
      plan: 'pro', 
      credits: 25000,
      subscription_start: subscriptionStartDate.toISOString(),
      subscription_end: subscriptionEndDate.toISOString()
    });

    // Store subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_email: user_email,
        razorpay_order_id: razorpay_order_id,
        plan_type: 'pro',
        amount: 29900, // ₹299 in paisa
        currency: 'INR',
        status: 'active'
      });

    if (subscriptionError) {
      console.error('Failed to store subscription:', subscriptionError);
      // Don't fail the payment verification for this
    } else {
      console.log('Subscription record created successfully');
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and Pro plan activated',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        plan: updatedUser.plan,
        credits: updatedUser.credits
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      {
        error: 'Payment verification failed',
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

// Helper function to extract name from email
function getUserNameFromEmail(email) {
  if (!email) return 'User';
  const emailName = email.split('@')[0];
  const cleanName = emailName.replace(/[0-9._-]/g, '');
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase() || 'User';
}

async function handleWebhook(body, signature) {
  // Verify webhook signature
  if (process.env.RAZORPAY_WEBHOOK_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    );
  }

  const event = body.event;
  const payload = body.payload;

  console.log('Received webhook:', event);

  switch (event) {
    case 'payment.captured':
      await handlePaymentCaptured(payload.payment.entity);
      break;

    case 'payment.failed':
      await handlePaymentFailed(payload.payment.entity);
      break;

    case 'subscription.charged':
      await handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity);
      break;

    case 'subscription.cancelled':
      await handleSubscriptionCancelled(payload.subscription.entity);
      break;

    default:
      console.log('Unhandled webhook event:', event);
  }

  return NextResponse.json({ status: 'ok' });
}

async function handlePaymentCaptured(payment) {
  console.log('Payment captured:', payment.id);

  // Update subscription status if needed
  if (payment.order_id) {
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('razorpay_order_id', payment.order_id);
  }
}

async function handlePaymentFailed(payment) {
  console.log('Payment failed:', payment.id);

  // Update subscription status
  if (payment.order_id) {
    await supabase
      .from('subscriptions')
      .update({ status: 'failed' })
      .eq('razorpay_order_id', payment.order_id);
  }
}

async function handleSubscriptionCharged(subscription, payment) {
  console.log('Subscription charged:', subscription.id);

  // Reset monthly credits and extend subscription for recurring payments
  if (subscription.id) {
    const { data: subscriptionRecord } = await supabase
      .from('subscriptions')
      .select('user_email')
      .eq('razorpay_subscription_id', subscription.id)
      .single();

    if (subscriptionRecord) {
      // Calculate new subscription dates for the renewed period
      const subscriptionStartDate = new Date();
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // Add 1 month

      console.log('Extending subscription for user:', subscriptionRecord.user_email, {
        start: subscriptionStartDate.toISOString(),
        end: subscriptionEndDate.toISOString()
      });

      await supabase
        .from('Users')
        .update({
          plan: 'pro',
          credits: 25000,
          last_monthly_reset: new Date().toISOString().split('T')[0],
          subscription_start_date: subscriptionStartDate.toISOString(),
          subscription_end_date: subscriptionEndDate.toISOString()
        })
        .eq('email', subscriptionRecord.user_email);
    }
  }
}

async function handleSubscriptionCancelled(subscription) {
  console.log('Subscription cancelled:', subscription.id);

  // Downgrade user to free plan
  const { data: subscriptionRecord } = await supabase
    .from('subscriptions')
    .select('user_email')
    .eq('razorpay_subscription_id', subscription.id)
    .single();

  if (subscriptionRecord) {
    // Don't downgrade arpitariyanm@gmail.com
    if (subscriptionRecord.user_email !== 'arpitariyanm@gmail.com') {
      await supabase
        .from('Users')
        .update({
          plan: 'free',
          credits: 5000,
          last_monthly_reset: new Date().toISOString().split('T')[0]
        })
        .eq('email', subscriptionRecord.user_email);
    }

    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('razorpay_subscription_id', subscription.id);
  }
}