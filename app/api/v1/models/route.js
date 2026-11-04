/**
 * GET /api/v1/models
 * List all available ChatboxAI models.
 *
 * No authentication required.
 * Note: Internal provider details (Groq, OpenRouter, etc.) are never exposed.
 */

import { NextResponse } from 'next/server';
import { getModelCatalog } from '@/lib/model-catalog.js';

export async function GET() {
  try {
    const catalog = await getModelCatalog();
    
    // Map to OpenAI-compatible list
    const models = catalog
      .filter((m) => m.is_enabled)
      .map((m) => ({
        id: m.public_id,
        object: 'model',
        owned_by: 'chatboxai',
        name: m.name,
        description: m.description || '',
        is_pro: m.category === 'paid',
        pricing: { input: m.input_rate, output: m.output_rate },
        created: m.created_at ? Math.floor(new Date(m.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
      }));

    return NextResponse.json(
      {
        object: 'list',
        data: models,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[ChatboxAI] Error fetching models:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Failed to fetch models.',
          type: 'server_error',
          code: 'internal_error',
        },
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new Response(null, { status: 204 });
}
