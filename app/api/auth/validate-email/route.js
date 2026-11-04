import { NextResponse } from 'next/server';
import { validateEmailStrict } from '@/lib/email-validator-strict';
import { checkRateLimit, getClientIp, rateLimitErrorBody } from '@/lib/rate-limiter';

export async function POST(request) {
  // Rate limit: 20 checks per IP per 10 minutes to prevent abuse of the validation endpoint
  const clientIp = getClientIp(request);
  const ipRl = checkRateLimit(`validate-email:ip:${clientIp}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
  
  if (!ipRl.allowed) {
    return NextResponse.json(rateLimitErrorBody(ipRl.retryAfterSec), {
      status: 429,
      headers: { 'Retry-After': String(ipRl.retryAfterSec) },
    });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ valid: false, error: 'Email is required' }, { status: 400 });
    }

    const result = await validateEmailStrict(email);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });

  } catch (error) {
    console.error('[Email Validation API] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'An unexpected error occurred during validation' },
      { status: 500 }
    );
  }
}
