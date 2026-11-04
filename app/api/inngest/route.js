import { serve } from "inngest/next";
import { NextResponse } from 'next/server';
import { inngest } from "../../../inngest/client";
import { 
    helloWorld, 
    llmModel, 
    checkExpiredSubscriptions, 
    manualSubscriptionCheck,
    websiteGenerateFunction,
    monthlyCreditsReset,
    deleteExpiredIncognitoChats,
    cleanupExpiredOTPs,
} from "@/inngest/functions";

const handler = serve({
    client: inngest,
    functions: [
        helloWorld,
        llmModel,
        checkExpiredSubscriptions,
        manualSubscriptionCheck,
        websiteGenerateFunction,
        monthlyCreditsReset,
        deleteExpiredIncognitoChats,
        cleanupExpiredOTPs,
    ],
});

export const GET = handler.GET;
export const POST = handler.POST;

export async function PUT(request, context) {
    // In both development and production, properly process webhooks
    // The Inngest dev server needs to sync functions via webhooks
    const rawBody = await request.text();

    if (!rawBody || !rawBody.trim()) {
        return NextResponse.json({ success: true });
    }

    const forwardedRequest = new Request(request.url, {
        method: 'PUT',
        headers: request.headers,
        body: rawBody,
    });

    try {
        return await handler.PUT(forwardedRequest, context);
    } catch (error) {
        const message = error?.message || '';
        const isEmptyBodyParseError =
            message.includes('Unexpected end of JSON input') ||
            message.includes('Failed calling `body` from serve handler');

        const isTransientWebhookError =
            message.toLowerCase().includes('context deadline exceeded') ||
            message.toLowerCase().includes('deadline exceeded') ||
            message.toLowerCase().includes('econnreset') ||
            message.toLowerCase().includes('etimedout') ||
            message.toLowerCase().includes('enotfound') ||
            message.toLowerCase().includes('fetch failed');

        if (isEmptyBodyParseError || isTransientWebhookError) {
            return NextResponse.json({ success: true, ignored: true });
        }

        throw error;
    }
}