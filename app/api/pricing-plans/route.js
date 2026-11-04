import { NextResponse } from 'next/server';
import { getDynamicPlans } from '@/lib/dynamicPlanService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await getDynamicPlans();

    return NextResponse.json(
      {
        success: true,
        plans,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=5',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching dynamic pricing plans:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing plans', details: error.message },
      { status: 500 }
    );
  }
}
