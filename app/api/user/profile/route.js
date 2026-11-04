import { NextResponse } from 'next/server';
import { AuthError, authErrorResponse, normalizeEmail, resolveRequestUserEmail } from '@/lib/server-auth';
import { getCanonicalUserByEmail, updateUsersByEmail } from '@/lib/user-subscription-server';

export async function GET(request) {
  try {
    const authenticatedEmail = await resolveRequestUserEmail(request, false);
    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get('email'));
    const createIfMissing = searchParams.get('createIfMissing') !== 'false';
    const name = (searchParams.get('name') || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    if (email !== authenticatedEmail) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }
    const { user, created } = await getCanonicalUserByEmail({ email, name, createIfMissing });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user, created: !!created });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'Authentication is required to fetch user profile.');
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user profile',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const authenticatedEmail = await resolveRequestUserEmail(request);
    const body = await request.json();
    const email = normalizeEmail(body?.email);
    const updates = body?.updates;

    if (!email || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'email and updates are required' }, { status: 400 });
    }

    if (email !== authenticatedEmail) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const safeUpdates = { ...updates };

    if (Object.prototype.hasOwnProperty.call(safeUpdates, 'name')) {
      const normalizedName = String(safeUpdates.name || '').trim().slice(0, 120);
      if (!normalizedName) {
        return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
      }
      safeUpdates.name = normalizedName;
    }

    const updatedDocs = await updateUsersByEmail(email, safeUpdates);

    // Force merge the original updates back into the returned document.
    // If the Appwrite database schema is missing columns like `mfa_enabled`,
    // Appwrite will silently strip them from the returned document.
    // This frontend-facing merge ensures the client still receives the updated state.
    const primary = updatedDocs[0] || null;
    const mergedUser = primary ? { ...primary, ...safeUpdates } : null;

    return NextResponse.json({
      success: true,
      user: mergedUser,
      updatedCount: updatedDocs.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'Authentication is required to update user profile.');
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user profile',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
