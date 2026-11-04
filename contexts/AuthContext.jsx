'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  getAdditionalUserInfo
} from 'firebase/auth';
import { auth, googleProvider, githubProvider, microsoftProvider } from '@/lib/firebase';
import { authFetch } from '@/lib/auth-fetch';

export class EmailNotVerifiedError extends Error {
  constructor(message = 'Please verify your email address.') {
    super(message);
    this.name = 'EmailNotVerifiedError';
  }
}

export class DisposableEmailError extends Error {
  constructor(message = 'Temporary email addresses are not allowed.') {
    super(message);
    this.name = 'DisposableEmailError';
  }
}

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

// Silent helper — records a login event. Never throws so it never blocks the auth flow.
async function recordLoginActivity(user, method) {
  if (!user?.email) return;
  try {
    await authFetch('/api/auth/login-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        method,
        userAgent: navigator?.userAgent || '',
      }),
    });
  } catch {
    // Non-critical — ignore silently
  }
}

export const AuthProvider = ({ children, renderWhileLoading = true }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email and password
  const signup = async (email, password, displayName) => {
    if (!auth) {
      throw new Error('Authentication service is not configured. Missing NEXT_PUBLIC_FIREBASE_API_KEY.');
    }

    // 1. Validate email via API
    const validationRes = await fetch('/api/auth/validate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const validationData = await validationRes.json();
    if (!validationRes.ok || !validationData.valid) {
      throw new DisposableEmailError(validationData.error || 'Please use a valid email address.');
    }

    // 2. Create user
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // 3. Update the user's display name
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }

    // Record login activity (don't await — non-blocking)
    recordLoginActivity(result.user, 'email_signup');
    
    // Return with isNewUser flag so the UI can trigger signup verification
    return { ...result, isNewUser: true };
  };

  // Sign in with email and password
  const login = async (email, password) => {
    if (!auth) {
      throw new Error('Authentication service is not configured. Missing NEXT_PUBLIC_FIREBASE_API_KEY.');
    }

    // Validate email via API to block legacy disposable accounts
    const validationRes = await fetch('/api/auth/validate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const validationData = await validationRes.json();
    if (!validationRes.ok || !validationData.valid) {
      throw new DisposableEmailError(validationData.error || 'Account access denied for this email type.');
    }

    const result = await signInWithEmailAndPassword(auth, email, password);
    recordLoginActivity(result.user, 'email_password');
    return result;
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Authentication service is not configured. Missing NEXT_PUBLIC_FIREBASE_API_KEY.');
    }
    const result = await signInWithPopup(auth, googleProvider);
    const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
    recordLoginActivity(result.user, 'google');
    result.isNewUser = isNewUser;
    return result;
  };

  // Sign in with GitHub
  const signInWithGithub = async () => {
    if (!auth) {
      throw new Error('Authentication service is not configured. Missing NEXT_PUBLIC_FIREBASE_API_KEY.');
    }
    const result = await signInWithPopup(auth, githubProvider);
    const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
    recordLoginActivity(result.user, 'github');
    result.isNewUser = isNewUser;
    return result;
  };

  // Sign in with Microsoft
  const signInWithMicrosoft = async () => {
    if (!auth) {
      throw new Error('Authentication service is not configured. Missing NEXT_PUBLIC_FIREBASE_API_KEY.');
    }
    const result = await signInWithPopup(auth, microsoftProvider);
    const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
    recordLoginActivity(result.user, 'microsoft');
    result.isNewUser = isNewUser;
    return result;
  };

  // Logout
  const logout = () => {
    if (!auth) return Promise.resolve();
    return signOut(auth);
  };

  // Reset password
  const resetPassword = (email) => {
    if (!auth) {
      throw new Error('Authentication service is not configured. Missing NEXT_PUBLIC_FIREBASE_API_KEY.');
    }
    return sendPasswordResetEmail(auth, email);
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    signInWithGoogle,
    signInWithGithub,
    signInWithMicrosoft,
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
