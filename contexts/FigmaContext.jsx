'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAppConnections } from './AppConnectionContext';
import { useAuth } from './AuthContext';
import { useUser } from './UserContext';

const FigmaContext = createContext({});

export const useFigma = () => {
  const context = useContext(FigmaContext);
  if (!context) {
    return {
      isConnected: false,
      connectionLoading: false,
      selectedFile: null,
      selectedNode: null,
      results: {},
      loadingStates: {},
      errors: {},
      cache: {},
      setSelectedFile: () => {},
      setSelectedNode: () => {},
      setResult: () => {},
      setLoadingState: () => {},
      setError: () => {},
      clearError: () => {},
      clearResults: () => {},
      getCachedResult: () => null,
      setCachedResult: () => {},
    };
  }
  return context;
};

export const FigmaProvider = ({ children }) => {
  const { connectedApps, loading: connectionLoading } = useAppConnections();
  const { credits } = useUser();

  // Selected file and node
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // Operation results keyed by operation type
  const [results, setResults] = useState({});

  // Loading states per-operation
  const [loadingStates, setLoadingStates] = useState({});

  // Error states per-operation
  const [errors, setErrors] = useState({});

  // Cache for API results to avoid re-fetching
  const [cache, setCache] = useState({});

  // Derive connection status from AppConnectionContext
  const isConnected = useMemo(() => {
    if (!connectedApps || connectedApps.length === 0) return false;
    return connectedApps.some(
      (app) => app.appId === 'figma' && (app.status === 'connected' || app.status === true)
    );
  }, [connectedApps]);

  // Set result for a specific operation
  const setResult = useCallback((operationType, data) => {
    setResults((prev) => ({ ...prev, [operationType]: data }));
  }, []);

  // Set loading state for a specific operation
  const setLoadingState = useCallback((operationType, isLoading) => {
    setLoadingStates((prev) => ({ ...prev, [operationType]: isLoading }));
  }, []);

  // Set error for a specific operation
  const setError = useCallback((operationType, error) => {
    setErrors((prev) => ({ ...prev, [operationType]: error }));
  }, []);

  // Clear error for a specific operation
  const clearError = useCallback((operationType) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[operationType];
      return next;
    });
  }, []);

  // Clear all results
  const clearResults = useCallback(() => {
    setResults({});
  }, []);

  // Get cached result by cache key
  const getCachedResult = useCallback(
    (cacheKey) => {
      return cache[cacheKey] || null;
    },
    [cache]
  );

  // Set cached result
  const setCachedResult = useCallback((cacheKey, data) => {
    setCache((prev) => ({ ...prev, [cacheKey]: data }));
  }, []);

  const value = {
    // Connection
    isConnected,
    connectionLoading,
    credits,

    // Selection
    selectedFile,
    selectedNode,
    setSelectedFile,
    setSelectedNode,

    // Results
    results,
    setResult,
    clearResults,

    // Loading
    loadingStates,
    setLoadingState,

    // Errors
    errors,
    setError,
    clearError,

    // Cache
    cache,
    getCachedResult,
    setCachedResult,
  };

  return (
    <FigmaContext.Provider value={value}>
      {children}
    </FigmaContext.Provider>
  );
};
