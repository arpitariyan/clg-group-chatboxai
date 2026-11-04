"use client";

import React, { useEffect } from "react";
import axios from "axios";
import { auth } from "@/lib/firebase";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { ModelProvider } from "@/contexts/ModelContext";
import { AppConnectionProvider } from "@/contexts/AppConnectionContext";
import AppAlerts from "@/app/_components/AppAlerts";
import {
  GENERAL_PREFS_KEY,
  applyAccentToDocument,
  applyChatFontToDocument,
  applyGeneralPreferencesToDocument,
  loadUserChatFontPreference,
  loadGeneralPreferences,
} from "@/lib/user-preferences";

function SupressInngestErrors() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;

    const INNGEST_PROBE_PATHS = [
      '/.netlify/functions/inngest',
      '/.redwood/functions/inngest',
      '/x/inngest',
    ];

    const isKnownInngestProbeNoise = (value) => {
      const message = value?.toString?.().toLowerCase?.() || '';
      if (!message) return false;

      const hasProbePath = INNGEST_PROBE_PATHS.some((path) => message.includes(path));
      const hasInngestSignal = message.includes('[inngest]') || message.includes('inngest');
      const hasExpectedNetworkSignal =
        message.includes('404') ||
        message.includes('fetch failed') ||
        message.includes('failed to fetch');

      return hasProbePath || (hasInngestSignal && hasExpectedNetworkSignal);
    };
    
    const originalError = console.error;
    console.error = function(...args) {
      // Dev-only suppression for known Inngest endpoint discovery noise.
      if (!args.some(isKnownInngestProbeNoise)) {
        originalError.apply(console, args);
      }
    };
    
    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}

function UserPreferenceSync() {
  const { userData } = useUser() || {};
  const { currentUser } = useAuth() || {};

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

  useEffect(() => {
    const userIdentifier = currentUser?.email || currentUser?.uid || 'anonymous';
    const persistedChatFont = loadUserChatFontPreference(userIdentifier);
    applyChatFontToDocument(userData?.chat_font || persistedChatFont || 'default');
  }, [userData?.chat_font, currentUser?.email, currentUser?.uid]);

  return null;
}

function AxiosAuthBridge() {
  const { currentUser } = useAuth() || {};

  useEffect(() => {
    // Request Interceptor: Attach Firebase ID token to /api/ requests
    const reqInterceptorId = axios.interceptors.request.use(async (config) => {
      const requestUrl = String(config?.url || '');
      const isInternalApiCall = requestUrl.startsWith('/api/');
      if (!isInternalApiCall) {
        return config;
      }

      const existingAuthHeader = config?.headers?.Authorization || config?.headers?.authorization;
      if (existingAuthHeader) {
        return config;
      }

      try {
        const user = auth?.currentUser || currentUser;
        const token = await user?.getIdToken?.();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        // Token retrieval failed or user unauthenticated — proceed without header
      }

      return config;
    });

    // Response Interceptor: Automatically handle 401 by refreshing token and retrying once
    const resInterceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const user = auth?.currentUser || currentUser;
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          user
        ) {
          originalRequest._retry = true;
          try {
            // Force refresh Firebase token
            const newToken = await user.getIdToken?.(true);
            if (newToken) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          } catch (refreshErr) {
            console.warn('[AxiosAuthBridge] Failed to refresh Firebase auth token:', refreshErr);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptorId);
      axios.interceptors.response.eject(resInterceptorId);
    };
  }, [currentUser]);

  return null;
}

function Provider({ children }) {
  return (
    <>
      <SupressInngestErrors />
      <UserPreferenceSync />
      <AxiosAuthBridge />
      <ModelProvider>
        <AppConnectionProvider>
          <div className="flex flex-col h-full w-full flex-1 min-h-0">
            {children}
            <AppAlerts />
          </div>
        </AppConnectionProvider>
      </ModelProvider>
    </>
  );
}

export default Provider;
