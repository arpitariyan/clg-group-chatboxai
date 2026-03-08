"use client";

import React, { useEffect } from "react";
import { UserProvider } from "@/contexts/UserContext";
import { useUser } from "@/contexts/UserContext";
import { ModelProvider } from "@/contexts/ModelContext";
import { AdminProvider } from "@/contexts/AdminContext";
import AdminLoginModal from "@/app/_components/modals/AdminLoginModal";
import AppAlerts from "@/app/_components/AppAlerts";
import {
  GENERAL_PREFS_KEY,
  applyAccentToDocument,
  applyGeneralPreferencesToDocument,
  loadGeneralPreferences,
} from "@/lib/user-preferences";

function UserPreferenceSync() {
  const { userData } = useUser() || {};

  useEffect(() => {
    applyGeneralPreferencesToDocument(loadGeneralPreferences());

    const handleStorage = (event) => {
      if (event.key !== GENERAL_PREFS_KEY) return;
      applyGeneralPreferencesToDocument(loadGeneralPreferences());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    applyAccentToDocument(userData?.accent_color || "violet");
  }, [userData?.accent_color]);

  return null;
}

function Provider({ children }) {
  return (
    <UserProvider>
      <UserPreferenceSync />
      <ModelProvider>
        <AdminProvider>
          <div>
            {children}
            <AdminLoginModal />
            <AppAlerts />
          </div>
        </AdminProvider>
      </ModelProvider>
    </UserProvider>
  );
}

export default Provider;
