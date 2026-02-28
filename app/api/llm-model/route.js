import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";
import { getRandomModel } from "@/services/Shared";

export async function POST(req) {
    let recordId; // Declare recordId outside try block for error handling
    
    try {
        // console.log('LLM Model API called');
        const { searchInput, searchResult, recordId: reqRecordId, selectedModel, isPro, useDirectModel } = await req.json();
        recordId = reqRecordId; // Assign to outer scope variable

        // console.log('LLM Model API request data:', {
        //     searchInputLength: searchInput?.length || 0,
        //     searchResultCount: searchResult?.length || 0,
        //     recordId,
        //     selectedModel: selectedModel?.name || selectedModel?.id || 'Unknown',
        //     isPro: isPro,
        //     useDirectModel: useDirectModel
        // });

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

        // Handle Auto model selection
        let finalSelectedModel = selectedModel;

        // If model is Auto or missing, select a random model based on plan
        if (!selectedModel || selectedModel.modelApi === 'auto' || selectedModel.id === 1) {
            finalSelectedModel = getRandomModel(isPro === true);
            console.log(`Auto model selected: ${finalSelectedModel.name} (${finalSelectedModel.modelApi}) for ${isPro ? 'Pro' : 'Free'} user`);
        }

        // Validate selectedModel
        if (!finalSelectedModel) {
            console.warn('No valid model available after selection');
            finalSelectedModel = { id: 'provider-8/gemini-2.0-flash', name: 'Gemini 2.0 Flash' };
        }

        // console.log('Final model to use:', finalSelectedModel.name);
        // console.log('Sending event to Inngest...');

        let inngestRunId;
        try {
            inngestRunId = await inngest.send({
                name: "llm-model",
                data: {
                    searchInput: searchInput,
                    searchResult: searchResult || [],
                    recordId: recordId,
                    selectedModel: finalSelectedModel,
                    isPro: isPro !== false, // Default to true for backward compatibility
                    useDirectModel: useDirectModel === true // Flag indicating Google API failed
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
        console.error('Error in LLM Model API:', error);

        // More specific error handling
        let errorMessage = 'Failed to start LLM process';
        let statusCode = 500;

        if (error.message?.includes('Inngest')) {
            errorMessage = 'AI processing service unavailable. Please try again.';
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
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString(),
                requestId: recordId
            },
            { status: statusCode }
        );
    }
}