import { NextResponse } from 'next/server';
import { checkImageGenerationLimit, checkUserPlan } from '@/lib/planUtils';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userEmail = searchParams.get('email');

        if (!userEmail) {
            return NextResponse.json({ 
                error: 'User email is required' 
            }, { status: 400 });
        }

        // Get user plan info and image generation limits
        const [planInfo, limitInfo] = await Promise.all([
            checkUserPlan(userEmail),
            checkImageGenerationLimit(userEmail)
        ]);

        return NextResponse.json({
            success: true,
            user: {
                email: userEmail,
                plan: limitInfo.plan,
                isPro: planInfo.isPro
            },
            limits: {
                canGenerate: limitInfo.canGenerate,
                dailyCount: limitInfo.dailyCount,
                dailyLimit: limitInfo.dailyLimit,
                message: limitInfo.message
            },
            subscription: planInfo.subscription
        });

    } catch (error) {
        console.error('Error checking user plan:', error);
        return NextResponse.json({ 
            error: 'Failed to check user plan',
            details: error.message 
        }, { status: 500 });
    }
}