export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleCallback } from '@/lib/oauth-manager.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction ? 'https://chatboxai.co.in' : 'http://localhost:3000';

  // Handle OAuth errors from provider
  if (error) {
    console.error('[OAuth Callback] Provider error:', error);
    return NextResponse.redirect(
      `${baseUrl}/app?app_connection=error&reason=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/app?app_connection=error&reason=missing_params`
    );
  }

  try {
    const result = await handleCallback(code, state, baseUrl);
    return NextResponse.redirect(
      `${baseUrl}/app?app_connection=success&appId=${result.appId}`
    );
  } catch (err) {
    console.error('[OAuth Callback] Error:', err.message);
    return NextResponse.redirect(
      `${baseUrl}/app?app_connection=error&reason=${encodeURIComponent(err.message)}`
    );
  }
}
