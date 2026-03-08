import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, MFA_OTPS_COLLECTION_ID } from '@/services/appwrite-collections';

// Helper: delete expired OTPs for a user (runs opportunistically after verification)
// Uses JS Date comparison to avoid relying on Appwrite string-based date queries.
async function sweepExpiredOtps(userEmail) {
  try {
    const now = new Date();
    const allOtpsRes = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
      Query.equal('user_email', userEmail),
      Query.limit(20),
    ]);
    const expired = allOtpsRes.documents.filter(
      (doc) => doc.expires_at && new Date(doc.expires_at) < now
    );
    if (expired.length > 0) {
      await Promise.allSettled(
        expired.map((doc) => databases.deleteDocument(DB_ID, MFA_OTPS_COLLECTION_ID, doc.$id))
      );
    }
  } catch (err) {
    console.warn('[MFA] OTP sweep error (non-fatal):', err.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { enableMfa } = body;

    // Normalize emails consistently — must match how send-mfa-otp stores them
    const otp = (body.otp || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const userEmail = (body.userEmail || '').trim().toLowerCase();

    // Validate input
    if (!otp || !email || !userEmail || otp.length !== 6) {
      return NextResponse.json(
        { error: 'Valid OTP is required' },
        { status: 400 }
      );
    }

    // Look up user document (needed for mfa update)
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1)
    ]);
    const user = userRes.documents[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Look up OTP record (userEmail and email are already normalized above)
    const otpRes = await databases.listDocuments(DB_ID, MFA_OTPS_COLLECTION_ID, [
      Query.equal('user_email', userEmail),
      Query.equal('mfa_email', email),
      Query.equal('otp', otp),
      Query.equal('used', false),
      Query.limit(1)
    ]);
    const otpRecord = otpRes.documents[0];

    if (!otpRecord) {
      sweepExpiredOtps(userEmail);
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check expiry
    const now = new Date();
    const expiryTime = new Date(otpRecord.expires_at);
    if (now > expiryTime) {
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, { used: true });
      sweepExpiredOtps(userEmail);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    try {
      await databases.updateDocument(DB_ID, MFA_OTPS_COLLECTION_ID, otpRecord.$id, { used: true });
    } catch (e) {
      console.error('[MFA] Failed to mark OTP as used:', e.message);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // KEY FIX: If this is a Settings MFA-enable verification, update the user's
    // mfa_enabled and mfa_email directly in Appwrite using the ADMIN SDK here.
    // This is more reliable than a client-side PATCH because it uses server-side
    // credentials and is guaranteed to run before the response is sent.
    // ──────────────────────────────────────────────────────────────────────────
    let updatedUser = null;
    if (enableMfa !== false) {
      try {
        updatedUser = await databases.updateDocument(
          DB_ID,
          USERS_COLLECTION_ID,
          user.$id,
          {
            mfa_enabled: true,
            mfa_email: email,
          }
        );
        // console.log('[MFA] mfa_enabled=true persisted for:', userEmail);
      } catch (updateErr) {
        console.error('[MFA] Failed to update mfa_enabled in users collection:', updateErr.message);
        // Return an error so the client knows DB write failed
        return NextResponse.json(
          { error: 'OTP verified but failed to save MFA settings. Please try again.', details: updateErr.message },
          { status: 500 }
        );
      }
    }

    // Sweep expired OTPs asynchronously
    sweepExpiredOtps(userEmail);

    return NextResponse.json({
      success: true,
      message: 'OTP verified and MFA enabled successfully.',
      user: updatedUser,
    });

  } catch (error) {
    console.error('[MFA] Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP', details: error.message },
      { status: 500 }
    );
  }
}