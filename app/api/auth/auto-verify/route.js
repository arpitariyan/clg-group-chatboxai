import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }

    // Verify token
    const decoded = await adminAuth.verifyIdToken(idToken);

    // If already verified, do nothing
    if (decoded.email_verified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    // Mark as verified silently in the background
    await adminAuth.updateUser(decoded.uid, {
      emailVerified: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auto-Verify] Error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
