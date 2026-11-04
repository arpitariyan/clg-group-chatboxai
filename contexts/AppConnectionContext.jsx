'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const AppConnectionContext = createContext({});

export const useAppConnections = () => {
  const context = useContext(AppConnectionContext);
  if (!context) {
    return { connectedApps: [], loading: false, connectApp: () => {}, disconnectApp: () => {}, refreshConnections: () => {} };
  }
  return context;
};

export const AppConnectionProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [connectedApps, setConnectedApps] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Guard against concurrent registry fetches
  const registryFetchingRef = useRef(false);

  const getAuthHeaders = useCallback(async () => {
    const token = await currentUser?.getIdToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [currentUser]);

  // Fetch all apps and connection status
  const refreshConnections = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/apps/connections', { headers });
      const data = await res.json().catch(() => ({ connections: [] }));
      setConnectedApps(data.connections || []);
    } catch (err) {
      // Non-critical — just means no connections yet
      setConnectedApps([]);
      console.warn('[AppConnections] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, getAuthHeaders]);

  // Fetch app registry
  const fetchRegistry = useCallback(async () => {
    if (!currentUser) return;
    // Prevent concurrent fetches
    if (registryFetchingRef.current) return;
    registryFetchingRef.current = true;
    try {
      let headers = {};
      try {
        const token = await currentUser.getIdToken?.();
        if (token) headers = { Authorization: `Bearer ${token}` };
      } catch {
        // Token not ready yet — skip this fetch silently
        return;
      }
      const res = await fetch('/api/apps/registry', { headers });
      if (!res.ok) {
        // 401/403 — token not valid yet; warn quietly instead of erroring
        if (res.status === 401 || res.status === 403) {
          console.warn('[AppConnections] Registry auth not ready, will retry on next mount');
          return;
        }
        throw new Error(`Failed to fetch registry (${res.status})`);
      }
      const data = await res.json();
      setAllApps(data.apps || []);
      setCategories(data.categories || {});

      // Also update connected apps from registry's connection map
      if (data.connections && Object.keys(data.connections).length > 0) {
        const connectionsFromRegistry = Object.entries(data.connections).map(([appId, status]) => {
          const app = (data.apps || []).find(a => a.id === appId);
          return {
            appId,
            status,
            appName: app?.name || appId,
            appIcon: app?.icon || '',
            appDescription: app?.description || '',
            category: app?.category || '',
            tools: app?.tools || [],
          };
        });
        setConnectedApps(prev => {
          if (connectionsFromRegistry.length > 0) return connectionsFromRegistry;
          return prev;
        });
      }
    } catch (err) {
      // Only log real errors, not expected auth failures
      console.warn('[AppConnections] Registry fetch failed:', err.message);
    } finally {
      registryFetchingRef.current = false;
    }
  }, [currentUser, getAuthHeaders]);

  // Connect an app (initiates OAuth redirect or MCP instant connection)
  const connectApp = useCallback(async (appId) => {
    if (!currentUser) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/apps/connect', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to connect');
      }
      const data = await res.json();

      // MCP connections are instant — no redirect needed
      if (data.mcpConnected) {
        // Refresh connections to show the newly connected app
        await refreshConnections();
        return { mcpConnected: true };
      }

      // OAuth connections redirect to consent screen
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentUser, getAuthHeaders, refreshConnections]);

  // Disconnect an app
  const disconnectApp = useCallback(async (appId) => {
    if (!currentUser) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/apps/disconnect', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId }),
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      // Remove from local state immediately
      setConnectedApps(prev => prev.filter(c => c.appId !== appId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentUser, getAuthHeaders]);

  // Execute a tool
  const executeTool = useCallback(async (appId, toolId, parameters, confirmed = false) => {
    if (!currentUser) return null;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/apps/execute', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, toolId, parameters, confirmed }),
      });
      return await res.json();
    } catch (err) {
      return { status: 'failed', error: err.message };
    }
  }, [currentUser, getAuthHeaders]);

  // Load connections on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      refreshConnections();
      fetchRegistry();
    } else {
      setConnectedApps([]);
      setAllApps([]);
    }
  }, [currentUser, refreshConnections, fetchRegistry]);

  // Listen for OAuth callback success
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const connectionStatus = params.get('app_connection');
    if (connectionStatus === 'success') {
      refreshConnections();
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('app_connection');
      url.searchParams.delete('appId');
      window.history.replaceState({}, '', url.toString());
    }
  }, [refreshConnections]);

  const value = {
    connectedApps,
    allApps,
    categories,
    loading,
    error,
    connectApp,
    disconnectApp,
    executeTool,
    refreshConnections,
    fetchRegistry,
  };

  return (
    <AppConnectionContext.Provider value={value}>
      {children}
    </AppConnectionContext.Provider>
  );
};
