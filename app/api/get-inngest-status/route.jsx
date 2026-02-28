import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        // console.log('Inngest status check API called');
        
        let requestData;
        try {
            // Clone the request to avoid consuming the body
            const text = await req.text();
            
            // Check if body is empty
            if (!text || text.trim() === '') {
                console.error('Empty request body received');
                return NextResponse.json(
                    { error: 'Request body is required with runId' }, 
                    { status: 400 }
                );
            }
            
            // Parse the JSON
            requestData = JSON.parse(text);
        } catch (jsonError) {
            console.error('Invalid JSON in request body:', jsonError);
            return NextResponse.json(
                { error: 'Invalid JSON format in request body' }, 
                { status: 400 }
            );
        }

        const { runId } = requestData;
        // console.log('Status check requested for runId:', runId);

        if (!runId || typeof runId !== 'string') {
            console.error('Invalid or missing runId in request:', runId);
            return NextResponse.json(
                { error: 'Valid runId string is required' }, 
                { status: 400 }
            );
        }

        // Check if Inngest is configured
        const inngestHost = process.env.INNGEST_SERVER_HOST || 'https://inn.gs';
        const inngestKey = process.env.INNGEST_SIGNING_KEY;
        const inngestEventKey = process.env.INNGEST_EVENT_KEY;
        
        // console.log('Inngest configuration:', {
        //     hasHost: !!inngestHost,
        //     hasSigningKey: !!inngestKey,
        //     hasEventKey: !!inngestEventKey,
        //     host: inngestHost
        // });
        
        if (!inngestKey && !inngestEventKey) {
            console.error('Inngest authentication not configured');
            return NextResponse.json(
                { error: 'Inngest authentication not configured. Set INNGEST_SIGNING_KEY or INNGEST_EVENT_KEY.' }, 
                { status: 500 }
            );
        }

        // Try different endpoints for Inngest status checking
        const endpoints = [
            `/v1/runs/${runId}`,
            `/v1/events/${runId}/runs`,
            `/v1/functions/runs/${runId}`,
            `/api/v1/runs/${runId}`
        ];

        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                // console.log(`Trying endpoint: ${inngestHost}${endpoint}`);
                
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                // Use either signing key or event key for authentication
                if (inngestKey) {
                    headers['Authorization'] = `Bearer ${inngestKey}`;
                } else if (inngestEventKey) {
                    headers['X-Inngest-Event-Key'] = inngestEventKey;
                }

                const result = await axios.get(`${inngestHost}${endpoint}`, {
                    headers: headers,
                    timeout: 10000 // 10 second timeout
                });

                // console.log('Successfully fetched status from endpoint:', endpoint);
                // console.log('Status response:', result.status, result.data);
                
                return NextResponse.json(result.data);

            } catch (endpointError) {
                console.warn(`Endpoint ${endpoint} failed:`, endpointError.response?.status || endpointError.message);
                lastError = endpointError;
                continue; // Try next endpoint
            }
        }

        // If all endpoints failed, handle the last error
        console.error('All Inngest endpoints failed, last error:', lastError);
        
        if (lastError?.code === 'ECONNREFUSED') {
            return NextResponse.json(
                { 
                    error: 'Inngest server is not running or unreachable',
                    details: 'Please ensure Inngest is properly configured and running',
                    runId: runId
                }, 
                { status: 503 }
            );
        }
        
        if (lastError?.response) {
            const status = lastError.response.status;
            let errorMessage = `Inngest server error: ${status} ${lastError.response.statusText}`;
            
            if (status === 401) {
                errorMessage = 'Inngest authentication failed. Check your INNGEST_SIGNING_KEY or INNGEST_EVENT_KEY.';
            } else if (status === 403) {
                errorMessage = 'Inngest access forbidden. Check your API key permissions.';
            } else if (status === 404) {
                errorMessage = 'Inngest run not found. The run may not exist or may have expired.';
            } else if (status === 429) {
                errorMessage = 'Inngest API rate limit exceeded. Please try again later.';
            }
            
            return NextResponse.json(
                { 
                    error: errorMessage,
                    status: status,
                    runId: runId,
                    details: lastError.response.data
                }, 
                { status: status === 404 ? 404 : 500 }
            );
        }
        
        return NextResponse.json(
            { 
                error: 'Failed to fetch Inngest status from all endpoints',
                runId: runId,
                details: lastError?.message || 'Unknown error',
                endpoints: endpoints.map(ep => inngestHost + ep)
            }, 
            { status: 500 }
        );

    } catch (error) {
        console.error('Unexpected error in Inngest status check:', error);
        
        return NextResponse.json(
            { 
                error: 'Internal server error while checking Inngest status',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            }, 
            { status: 500 }
        );
    }
}

// Alternative GET endpoint for status checks
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const runId = searchParams.get('runId');
        
        if (!runId || typeof runId !== 'string') {
            return NextResponse.json(
                { error: 'Valid runId query parameter is required' }, 
                { status: 400 }
            );
        }

        // Check if Inngest is configured
        const inngestHost = process.env.INNGEST_SERVER_HOST || 'https://inn.gs';
        const inngestKey = process.env.INNGEST_SIGNING_KEY;
        const inngestEventKey = process.env.INNGEST_EVENT_KEY;
        
        if (!inngestKey && !inngestEventKey) {
            return NextResponse.json(
                { error: 'Inngest authentication not configured' }, 
                { status: 500 }
            );
        }

        // Try different endpoints for Inngest status checking
        const endpoints = [
            `/v1/runs/${runId}`,
            `/v1/events/${runId}/runs`,
            `/v1/functions/runs/${runId}`,
            `/api/v1/runs/${runId}`
        ];

        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (inngestKey) {
                    headers['Authorization'] = `Bearer ${inngestKey}`;
                } else if (inngestEventKey) {
                    headers['X-Inngest-Key'] = inngestEventKey;
                }

                const response = await axios.get(
                    `${inngestHost}${endpoint}`,
                    { headers, timeout: 10000 }
                );

                if (response.status === 200 && response.data) {
                    return NextResponse.json(response.data);
                }
            } catch (err) {
                lastError = err;
                continue;
            }
        }
        
        return NextResponse.json(
            { 
                error: 'Failed to fetch Inngest status',
                runId: runId,
                details: lastError?.message || 'Unknown error'
            }, 
            { status: 500 }
        );

    } catch (error) {
        console.error('Unexpected error in Inngest status GET:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message }, 
            { status: 500 }
        );
    }
}