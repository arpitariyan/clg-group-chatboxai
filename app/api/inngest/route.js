import { serve } from "inngest/next";
import { NextResponse } from 'next/server';
import { inngest } from "../../../inngest/client";
import { 
    helloWorld, 
    llmModel, 
    checkExpiredSubscriptions, 
    manualSubscriptionCheck 
} from "@/inngest/functions";

const handler = serve({
    client: inngest,
    functions: [
        helloWorld,
        llmModel,
        checkExpiredSubscriptions,
        manualSubscriptionCheck
    ],
});

export const GET = handler.GET;
export const POST = handler.POST;

export async function PUT(request, context) {
    const rawBody = await request.text();

    if (!rawBody || !rawBody.trim()) {
        return NextResponse.json({ success: true, ignored: true });
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
            message.includes('context deadline exceeded') ||
            message.includes('deadline exceeded') ||
            message.includes('ECONNRESET') ||
            message.includes('ETIMEDOUT') ||
            message.includes('fetch failed');

        if (isEmptyBodyParseError || (process.env.NODE_ENV === 'development' && isTransientWebhookError)) {
            return NextResponse.json({ success: true, ignored: true });
        }

        if (process.env.NODE_ENV === 'development') {
            console.warn('[inngest/PUT] Non-fatal dev webhook error suppressed:', message);
            return NextResponse.json({ success: true, ignored: true, warning: message.slice(0, 180) });
        }

        throw error;
    }
}