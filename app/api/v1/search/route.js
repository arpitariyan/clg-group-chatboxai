/**
 * POST /api/v1/search
 * Web search endpoint with citations
 * 
 * Requires: Bearer token with API key
 * 
 * Request body:
 * {
 *   query: "string",
 *   include_citations: boolean (default: true),
 *   num_results: number (default: 5, max: 20)
 * }
 * 
 * Response:
 * {
 *   object: "search_results",
 *   query: "...",
 *   results: [
 *     {
 *       index: 0,
 *       title: "...",
 *       url: "...",
 *       snippet: "..."
 *     }
 *   ],
 *   citations: [...],
 *   total_results: 5,
 *   cost_usd: 0.005
 * }
 */

import { NextResponse } from 'next/server';
import { validateApiRequest, createApiResponse, createApiErrorResponse } from '@/lib/api-gateway.js';
import { calculateSearchCost } from '@/lib/api-pricing.js';
import { databases } from '@/services/appwrite-admin.js';
import { API_USAGE_LOGS_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';
import { ID } from 'node-appwrite';
import { deductApiCreditsWithLock } from '@/lib/api-credits.js';

/**
 * Perform web search (integrate with existing search provider)
 */
async function performWebSearch(query, count = 5) {
  // TODO: Integrate with existing SerpAPI or Perplexity Search
  // This is a placeholder implementation
  
  try {
    // For now, return mock data
    // In production, call SerpAPI or your existing search provider
    return {
      results: [
        {
          index: 0,
          title: 'Sample result 1',
          url: 'https://example.com/1',
          snippet: 'This is a sample search result snippet.',
        },
      ],
      citations: ['https://example.com/1'],
    };
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Log API usage for search
 */
async function logSearchUsage(userId, keyId, query, count, costUsd, status = 'success') {
  try {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      API_USAGE_LOGS_COLLECTION_ID,
      ID.unique(),
      {
        user_id: userId,
        key_id: keyId,
        endpoint: 'search',
        model: 'search',
        search_queries: count,
        cost_usd: costUsd,
        status,
        created_at: new Date().toISOString(),
        timestamp: Math.floor(Date.now() / 1000),
      }
    );
  } catch (error) {
    console.error('Error logging search usage:', error);
  }
}

export async function POST(request) {
  const context = await validateApiRequest(request, 50);

  if (!context.valid) {
    return context.errorResponse;
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.query || typeof body.query !== 'string' || body.query.trim() === '') {
      return createApiErrorResponse(
        'Missing or invalid query',
        'validation_error',
        'invalid_request',
        400,
        context.context
      );
    }

    const numResults = Math.min(body.num_results || 5, 20);
    const includeCitations = body.include_citations !== false;

    // Perform search
    const searchResults = await performWebSearch(body.query, numResults);

    // Calculate cost
    const costUsd = calculateSearchCost(1);

    const creditDeduction = await deductApiCreditsWithLock(context.context.userEmail, costUsd, {
      transactionType: 'usage',
      keyId: context.context.keyId,
      endpoint: 'search',
      costUsd,
      meta: {
        query: body.query,
      },
    });

    if (!creditDeduction.success) {
      return createApiErrorResponse(
        creditDeduction.error || 'Insufficient API credits.',
        'payment_required',
        'insufficient_api_credits',
        402,
        context.context
      );
    }

    // Log usage only after the API credit deduction succeeds.
    await logSearchUsage(context.context.userId, context.context.keyId, body.query, 1, costUsd);

    // Format response
    const response = {
      object: 'search_results',
      query: body.query,
      results: searchResults.results.slice(0, numResults),
      citations: includeCitations ? searchResults.citations : [],
      total_results: searchResults.results.length,
      cost_usd: costUsd,
    };

    const apiResponse = createApiResponse(response, context.context, 200);
    apiResponse.headers.set('X-API-Credits-Remaining', String(creditDeduction.balance_credits ?? 0));
    return apiResponse;
  } catch (error) {
    console.error('Error in search:', error);

    await logSearchUsage(
      context.context.userId,
      context.context.keyId,
      body?.query || 'unknown',
      0,
      0,
      'error'
    ).catch(() => {});

    return createApiErrorResponse(
      error.message || 'Failed to perform search',
      'server_error',
      'internal_error',
      500,
      context.context
    );
  }
}
