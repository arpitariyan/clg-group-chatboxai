'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthGuard({ children }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/sign-in');
    }
  }, [currentUser, loading, router]);

  // While checking authentication or if unauthenticated, render nothing to prevent UI flashing
  if (loading || !currentUser) {
    return null;
  }

  return children;
}