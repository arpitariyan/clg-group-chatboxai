import { NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

// This endpoint allows manual triggering of subscription expiry checks for testing
export async function POST(request) {
  try {
    console.log('=== MANUAL SUBSCRIPTION CHECK TRIGGER ===');

    // Optional: Add basic authentication for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.SUBSCRIPTION_CHECK_SECRET; // You can set this in your env

    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Trigger the manual subscription check function
    const { ids } = await inngest.send({
      name: 'subscription/manual-check',
      data: {
        triggerTime: new Date().toISOString(),
        source: 'manual_api_call'
      }
    });

    console.log('✅ Manual subscription check triggered successfully:', ids);

    return NextResponse.json({
      success: true,
      message: 'Manual subscription check triggered successfully',
      eventIds: ids,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error triggering manual subscription check:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger subscription check',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check subscription status without triggering
export async function GET(request) {
  try {
    console.log('=== SUBSCRIPTION STATUS CHECK ===');

    // Optional: Add basic authentication for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.SUBSCRIPTION_CHECK_SECRET;

    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // You can implement status checking logic here
    // For now, just return a simple status
    return NextResponse.json({
      success: true,
      message: 'Subscription check endpoint is active',
      timestamp: new Date().toISOString(),
      nextScheduledCheck: 'Daily at midnight UTC',
      instructions: {
        manualTrigger: 'POST to this endpoint to manually trigger subscription checks',
        authentication: expectedAuth ? 'Required (Bearer token)' : 'Not configured'
      }
    });

  } catch (error) {
    console.error('❌ Error in subscription status check:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check subscription status',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}