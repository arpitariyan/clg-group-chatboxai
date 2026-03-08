'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

// Silent helper — records a login event. Never throws so it never blocks the auth flow.
async function recordLoginActivity(user, method) {
  if (!user?.email) return;
  try {
    await fetch('/api/auth/login-activity', {
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

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email and password
  const signup = async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user's display name
    if (displayName && result.user) {
      await updateProfile(result.user, {
        displayName: displayName
      });
    }

    // Record login activity (don't await — non-blocking)
    recordLoginActivity(result.user, 'email_signup');
    
    return result;
  };

  // Sign in with email and password
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    recordLoginActivity(result.user, 'email_password');
    return result;
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    recordLoginActivity(result.user, 'google');
    return result;
  };

  // Logout
  const logout = () => {
    return signOut(auth);
  };

  // Reset password
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  useEffect(() => {
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
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};