import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";
import { getRandomModel, getResponseStyleProfile, resolveModel } from "@/services/Shared";
import { AuthError, authErrorResponse, normalizeEmail, resolveRequestUserEmail } from '@/lib/server-auth';
import { classifyRequest } from '@/lib/request-classifier';

export async function POST(req) {
    let recordId; // Declare recordId outside try block for error handling
    
    try {
        let authenticatedEmail = null;
        try {
            authenticatedEmail = await resolveRequestUserEmail(req);
        } catch {
            authenticatedEmail = null;
        }
        // console.log('LLM Model API called');
        const {
            searchInput,
            searchResult,
            recordId: reqRecordId,
            selectedModel,
            isPro,
            useDirectModel,
            responseMode,
            detailLevel,
            responseStyle,
            responseMaxTokens,
            citationMode,
            languageMode,
            userEmail,
            user_email,
            conversationHistory = [],
            memoryEnabled = true,
            selectedAppId = null,
            userPlan = 'free',          // ← NEW: subscription plan from client
            isThinkingMode = false,
            effortLevel = 'auto',
        } = await req.json();
        const requestedEmail = normalizeEmail(userEmail || user_email);
        if (requestedEmail && authenticatedEmail && requestedEmail !== authenticatedEmail) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: 'Requested user email does not match authenticated session.' },
                { status: 403 }
            );
        }
        recordId = reqRecordId; // Assign to outer scope variable

        // Validate required inputs
        if (!searchInput || !recordId) {
            console.error('Missing required parameters:', {
                hasSearchInput: !!searchInput,
                hasRecordId: !!recordId
            });
            return NextResponse.json(
                { error: 'Missing required parameters: searchInput and recordId are required' },
                { status: 400 }
            );
        }

        // ── Classify the request (lightweight, no LLM call) ──────────────────
                    const { requestClass, estimatedInputTokens, expectedOutputTokens, recommendedMinTier, userIntent } =
                        classifyRequest(searchInput, {
                            responseMode: responseMode === 'research' ? 'research' : 'search',
                        });

        // Handle Auto and Manual model selection robustly
        let finalSelectedModel = resolveModel(selectedModel, userPlan || (isPro ? 'pro' : 'free'), responseMode === 'research');

        // Validate selectedModel
        if (!finalSelectedModel) {
            console.warn('No valid model available after selection');
            // Fallback to tier-appropriate model instead of always using Gemini
            finalSelectedModel = getRandomModel(userPlan || (isPro ? 'pro' : 'free'), responseMode === 'research');
            if (!finalSelectedModel) {
                // Last resort: hardcoded fallback with tier validation
                finalSelectedModel = (userPlan === 'pro' || userPlan === 'max' || isPro) 
                    ? { id: 'provider-8/gemini-2.0-pro', name: 'Gemini 2.0 Pro', modelApi: 'gemini-2.0-pro', isPro: true, accessTier: 'pro' }
                    : { id: 'provider-8/gemini-2.5-flash', name: 'Gemini 2.5 Flash', modelApi: 'gemini-2.5-flash', isPro: false, accessTier: 'free' };
            }
        }

        // console.log('Final model to use:', finalSelectedModel.name);
        // console.log('Sending event to Inngest...');

        let inngestRunId;
        try {
            const derivedResponseStyle = getResponseStyleProfile({
                prompt: searchInput,
                model: finalSelectedModel,
                responseMode: responseMode === 'research' ? 'research' : 'search',
            });

            const normalizedDetailLevel = ['brief', 'balanced', 'detailed'].includes(responseStyle?.detailLevel)
                ? responseStyle.detailLevel
                : (['brief', 'balanced', 'detailed'].includes(detailLevel) ? detailLevel : derivedResponseStyle.detailLevel);
            const normalizedCitationMode = ['enabled', 'auto', 'disabled'].includes(citationMode) ? citationMode : 'enabled';
            const normalizedLanguageMode = ['auto', 'english', 'hindi', 'hinglish'].includes(languageMode) ? languageMode : 'auto';
            const normalizedMaxTokens = Number.isFinite(Number(responseMaxTokens)) && Number(responseMaxTokens) > 0
                ? Number(responseMaxTokens)
                : derivedResponseStyle.maxOutputTokens;
            const normalizedResponseStyle = {
                ...derivedResponseStyle,
                ...((responseStyle && typeof responseStyle === 'object') ? responseStyle : {}),
                detailLevel: normalizedDetailLevel,
                maxOutputTokens: normalizedMaxTokens,
            };

            inngestRunId = await inngest.send({
                name: "llm-model",
                data: {
                    searchInput: searchInput,
                    searchResult: searchResult || [],
                    recordId: recordId,
                    selectedModel: finalSelectedModel,
                    isPro: isPro !== false, // Default to true for backward compatibility
                    useDirectModel: useDirectModel === true, // Flag indicating Google API failed
                    responseMode: responseMode === 'research' ? 'research' : 'search',
                    detailLevel: normalizedDetailLevel,
                    responseStyle: normalizedResponseStyle,
                    responseMaxTokens: normalizedResponseStyle.maxOutputTokens,
                    citationMode: normalizedCitationMode,
                    languageMode: normalizedLanguageMode,
                    userEmail: authenticatedEmail, // Always use server-authenticated identity
                    userPlan: userPlan || 'free',   // ← NEW: pass plan for budget router
                    // Budget classification hints — pre-computed so Inngest doesn't re-classify
                    requestClass,
                    estimatedInputTokens,
                    expectedOutputTokens,
                    recommendedMinTier,
                    userIntent,
                    // Pass the conversation history strictly based on feature flag
                    conversationHistory: process.env.ENABLE_SHORT_TERM_MEMORY === 'true' ? conversationHistory : [],
                    memoryEnabled,
                    selectedAppId: selectedAppId || null,
                    isThinkingMode: isThinkingMode === true,
                    effortLevel: effortLevel || 'auto',
                },
            });
        } catch (inngestError) {
            console.error('Inngest connection error:', inngestError);
            
            // Provide helpful error message for development
            if (process.env.NODE_ENV === 'development') {
                const errorDetails = inngestError.code === 'ECONNREFUSED' 
                    ? 'Inngest Dev Server is not running. Start it with: npx inngest-cli@latest dev'
                    : inngestError.message;
                
                return NextResponse.json(
                    {
                        error: 'AI processing service unavailable',
                        details: errorDetails,
                        suggestion: 'Run: npx inngest-cli@latest dev',
                        timestamp: new Date().toISOString(),
                        requestId: recordId
                    },
                    { status: 503 }
                );
            }
            
            throw new Error('AI processing service unavailable. Please contact support.');
        }

        // console.log('Inngest event sent successfully:', inngestRunId);

        // Validate the response from Inngest
        if (!inngestRunId || !inngestRunId.ids || inngestRunId.ids.length === 0) {
            console.error('Invalid Inngest response:', inngestRunId);
            throw new Error('Failed to get run ID from Inngest');
        }

        const runId = inngestRunId.ids[0];
        // console.log('Returning run ID:', runId);

        // Return the first run ID
        return NextResponse.json(runId);

    } catch (error) {
        if (error instanceof AuthError) {
            return authErrorResponse(error, 'Authentication is required for AI generation.');
        }
        console.error('Error in LLM Model API:', error);
        console.error('Stack Trace:', error?.stack);

        // More specific error handling
        let errorMessage = 'Failed to start LLM process';
        let statusCode = 500;

        if (error.message?.includes('Inngest') || error.message?.includes('PayloadTooLargeError') || error.message?.includes('entity too large')) {
            errorMessage = 'AI processing service unavailable or payload too large. Please try again.';
            statusCode = 503;
        } else if (error.message?.includes('validation') || error.message?.includes('required')) {
            errorMessage = 'Invalid request data. Please check your input.';
            statusCode = 400;
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'Request timeout. Please try again.';
            statusCode = 408;
        } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
            errorMessage = 'Network error. Please check your connection.';
            statusCode = 503;
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: error.message || 'Unknown error occurred',
                timestamp: new Date().toISOString(),
                requestId: recordId
            },
            { status: statusCode }
        );
    }
}