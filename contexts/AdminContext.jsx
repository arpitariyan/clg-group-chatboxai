'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

const AdminContext = createContext({});

export const useAdmin = () => useContext(AdminContext);

const ADMIN_EMAIL = 'arpitariyanm@gmail.com';

export const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        setAdminUser(user);
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const adminLogin = async (email, password) => {
    if (email !== ADMIN_EMAIL) {
      throw new Error('Unauthorized: This email is not authorized for admin access');
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      if (result.user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        setAdminUser(result.user);
        return result;
      } else {
        await signOut(auth);
        throw new Error('Unauthorized: This email is not authorized for admin access');
      }
    } catch (error) {
      setIsAdmin(false);
      setAdminUser(null);
      throw error;
    }
  };

  const adminLogout = async () => {
    await signOut(auth);
    setIsAdmin(false);
    setAdminUser(null);
  };

  const openAdminLogin = () => {
    setIsAdminLoginOpen(true);
  };

  const closeAdminLogin = () => {
    setIsAdminLoginOpen(false);
  };

  const value = {
    isAdmin,
    adminUser,
    loading,
    adminLogin,
    adminLogout,
    isAdminLoginOpen,
    openAdminLogin,
    closeAdminLogin,
    ADMIN_EMAIL
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
