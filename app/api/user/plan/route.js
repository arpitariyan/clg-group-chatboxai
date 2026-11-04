import { NextResponse } from 'next/server';
import { checkImageGenerationLimit, checkUserPlan } from '@/lib/planUtils-server';
import { withUser } from '@/lib/request-context';
import { normalizePlan } from '@/lib/subscriptionPlans';

export const GET = withUser(async function GET(request, ctx) {
    try {
        const { searchParams } = new URL(request.url);
        const userEmail = ctx.assertEmail(searchParams.get('email'));

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

        const planName = normalizePlan(planInfo.plan || limitInfo.plan || 'free');
        const isPaid = (planInfo.isPro || planInfo.isMax || planName === 'pro' || planName === 'max') && !planInfo.isExpired;
        const isMax = planInfo.isMax || planName === 'max';
        const dailyLimit = isPaid ? -1 : 10;
        const dailyCount = limitInfo.dailyCount ?? 0;
        const remainingImages = isPaid ? -1 : Math.max(0, dailyLimit - dailyCount);
        const canGenerate = isPaid ? true : remainingImages > 0;

        return NextResponse.json({
            success: true,
            user: {
                email: userEmail,
                plan: planName,
                isPro: isPaid,
                isMax: isMax,
                credits: planInfo.credits ?? 0,
                paid_credits: planInfo.paid_credits ?? 0
            },
            limits: {
                canGenerate,
                dailyCount,
                dailyLimit,
                remainingImages,
                message: isPaid
                    ? `Unlimited image generation available with ${isMax ? 'Max' : 'Pro'} plan`
                    : (canGenerate
                        ? `${remainingImages} of ${dailyLimit} images remaining today`
                        : `Daily limit of ${dailyLimit} images reached. Upgrade to Pro for unlimited generation.`)
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
});
