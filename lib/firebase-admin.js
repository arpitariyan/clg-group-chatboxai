import * as admin from 'firebase-admin';
import dns from 'node:dns';

// Fix Node 18+ IPv6 timeout issues globally for all Firebase Admin outbound requests
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { getApps } from 'firebase-admin/app';

if (!getApps().length) {
  // If the environment variables aren't set, we won't crash the server on import,
  // but any attempt to use the admin SDK will fail gracefully or loudly depending on the usage.
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle newline characters in the private key if provided in .env
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (err) {
      console.error('Firebase Admin initialization error:', err);
    }
  } else {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.warn('Firebase Admin is not configured. Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in .env.local.');
    }
  }
}

export const adminAuth = getApps().length > 0 ? admin.auth() : null;
