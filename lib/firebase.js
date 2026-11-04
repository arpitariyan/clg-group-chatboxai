// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';

const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim();

const firebaseConfig = {
  apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app = null;
let auth = null;

if (apiKey) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    if (typeof window !== 'undefined' && auth) {
      setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.warn('Firebase persistence warning:', err?.message || err);
      });
    }
  } catch (error) {
    console.error('Firebase Client initialization failed:', error);
    app = null;
    auth = null;
  }
} else {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.warn(
      'Firebase API key is missing (NEXT_PUBLIC_FIREBASE_API_KEY). Authentication features will be disabled.'
    );
  }
}

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize GitHub Auth Provider
export const githubProvider = new GithubAuthProvider();

// Initialize Microsoft Auth Provider
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth };
export default app;
