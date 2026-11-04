'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useAppConnections } from '@/contexts/AppConnectionContext';
import { useFigma } from '@/contexts/FigmaContext';

/**
 * Credit costs for each Figma operation (client-side reference).
 * Must stay in sync with lib/figma/credit-manager.js
 */
export const FIGMA_CREDIT_COSTS = {
  component: 20,
  page: 50,
  diagram: 15,
  designSystem: 30,
  assets: 5,
  context: 10,
  componentMap: 10,
};

/**
 * Hook exposing all Figma integration operations.
 * Manages per-operation loading/error states, caching, and credit checks.
 */
export function useFigmaIntegration() {
  const { currentUser } = useAuth();
  const { credits, consumeCredits } = useUser();
  const { connectApp, disconnectApp } = useAppConnections();
  const {
    isConnected,
    connectionLoading,
    selectedFile,
    selectedNode,
    setSelectedFile,
    setSelectedNode,
    results,
    setResult,
    clearResults,
    loadingStates,
    setLoadingState,
    errors,
    setError,
    clearError,
    getCachedResult,
    setCachedResult,
  } = useFigma();

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await currentUser?.getIdToken?.();
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }, [currentUser]);

  // Helper to check if user has enough credits for an operation
  const checkCredits = useCallback(
    (operationType) => {
      const cost = FIGMA_CREDIT_COSTS[operationType];
      if (cost === undefined) return { sufficient: true, cost: 0 };
      return {
        sufficient: credits >= cost,
        cost,
        available: credits,
      };
    },
    [credits]
  );

  // Generic operation executor with loading/error/cache management
  const executeOperation = useCallback(
    async (operationType, fetchFn, options = {}) => {
      const { cacheKey, skipCreditCheck = false } = options;

      // Check cache first
      if (cacheKey) {
        const cached = getCachedResult(cacheKey);
        if (cached) {
          setResult(operationType, cached);
          return cached;
        }
      }

      // Check credits before operation
      if (!skipCreditCheck) {
        const creditCheck = checkCredits(operationType);
        if (!creditCheck.sufficient) {
          const errorMsg = `Insufficient credits. Required: ${creditCheck.cost}, Available: ${creditCheck.available}`;
          setError(operationType, errorMsg);
          return { error: errorMsg, insufficientCredits: true, required: creditCheck.cost, available: creditCheck.available };
        }
      }

      // Set loading state
      setLoadingState(operationType, true);
      clearError(operationType);

      try {
        const result = await fetchFn();

        if (result.error) {
          setError(operationType, result.error);
          return result;
        }

        // Store result
        setResult(operationType, result);

        // Cache if cache key provided
        if (cacheKey) {
          setCachedResult(cacheKey, result);
        }

        return result;
      } catch (err) {
        const errorMsg = err.message || 'An unexpected error occurred';
        setError(operationType, errorMsg);
        return { error: errorMsg };
      } finally {
        setLoadingState(operationType, false);
      }
    },
    [getCachedResult, setCachedResult, setResult, setLoadingState, setError, clearError, checkCredits]
  );

  // --- Connection Operations ---

  const connectFigma = useCallback(async () => {
    try {
      setLoadingState('connect', true);
      clearError('connect');
      await connectApp('figma');
    } catch (err) {
      setError('connect', err.message || 'Failed to connect Figma');
    } finally {
      setLoadingState('connect', false);
    }
  }, [connectApp, setLoadingState, setError, clearError]);

  const disconnectFigma = useCallback(async () => {
    try {
      setLoadingState('disconnect', true);
      clearError('disconnect');
      await disconnectApp('figma');
      setSelectedFile(null);
      setSelectedNode(null);
      clearResults();
    } catch (err) {
      setError('disconnect', err.message || 'Failed to disconnect Figma');
    } finally {
      setLoadingState('disconnect', false);
    }
  }, [disconnectApp, setLoadingState, setError, clearError, setSelectedFile, setSelectedNode, clearResults]);

  // --- File Operations ---

  const fetchFiles = useCallback(async () => {
    return executeOperation(
      'files',
      async () => {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/figma/files', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
        return data;
      },
      { cacheKey: 'figma_files', skipCreditCheck: true }
    );
  }, [executeOperation, getAuthHeaders]);

  const selectFile = useCallback(
    async (fileKey) => {
      setSelectedFile(fileKey);
      setSelectedNode(null);

      return executeOperation(
        'metadata',
        async () => {
          const headers = await getAuthHeaders();
          const res = await fetch(`/api/figma/metadata?fileKey=${encodeURIComponent(fileKey)}`, { headers });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to fetch file metadata');
          return data;
        },
        { cacheKey: `figma_metadata_${fileKey}`, skipCreditCheck: true }
      );
    },
    [executeOperation, getAuthHeaders, setSelectedFile, setSelectedNode]
  );

  const selectNode = useCallback(
    async (fileKey, nodeId) => {
      setSelectedNode(nodeId);

      return executeOperation(
        'nodes',
        async () => {
          const headers = await getAuthHeaders();
          const params = new URLSearchParams({ fileKey, nodeId });
          const res = await fetch(`/api/figma/file-nodes?${params.toString()}`, { headers });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to fetch node data');
          return data;
        },
        { cacheKey: `figma_nodes_${fileKey}_${nodeId}`, skipCreditCheck: true }
      );
    },
    [executeOperation, getAuthHeaders, setSelectedNode]
  );

  // --- AI Operations ---

  const convertToCode = useCallback(
    async (fileKey, nodeId, options = {}) => {
      const operationType = options.scope === 'page' ? 'page' : 'component';

      return executeOperation(
        'convert',
        async () => {
          const headers = await getAuthHeaders();
          const res = await fetch('/api/figma/convert', {
            method: 'POST',
            headers,
            body: JSON.stringify({ fileKey, nodeId, ...options }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to convert design to code');
          return data;
        },
        { cacheKey: `figma_convert_${fileKey}_${nodeId}_${operationType}` }
      );
    },
    [executeOperation, getAuthHeaders]
  );

  const generateDiagram = useCallback(
    async (prompt, diagramType = 'auto', style = {}) => {
      return executeOperation(
        'diagram',
        async () => {
          const headers = await getAuthHeaders();
          const res = await fetch('/api/figma/diagram', {
            method: 'POST',
            headers,
            body: JSON.stringify({ prompt, diagramType, style }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to generate diagram');
          return data;
        }
        // No cache for diagrams — each prompt is unique
      );
    },
    [executeOperation, getAuthHeaders]
  );

  const extractDesignSystem = useCallback(
    async (fileKey) => {
      return executeOperation(
        'designSystem',
        async () => {
          const headers = await getAuthHeaders();
          const res = await fetch('/api/figma/design-system', {
            method: 'POST',
            headers,
            body: JSON.stringify({ fileKey }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to extract design system');
          return data;
        },
        { cacheKey: `figma_design_system_${fileKey}` }
      );
    },
    [executeOperation, getAuthHeaders]
  );

  const exportAssets = useCallback(
    async (fileKey, nodeIds, format = 'png', scale = 2) => {
      return executeOperation(
        'assets',
        async () => {
          const headers = await getAuthHeaders();
          const res = await fetch('/api/figma/assets', {
            method: 'POST',
            headers,
            body: JSON.stringify({ fileKey, nodeIds, format, scale }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to export assets');
          return data;
        }
      );
    },
    [executeOperation, getAuthHeaders]
  );

  const mapComponents = useCallback(
    async (fileKey, nodeId, libraryPath) => {
      return executeOperation(
        'componentMap',
        async () => {
          const headers = await getAuthHeaders();
          const res = await fetch('/api/figma/component-map', {
            method: 'POST',
            headers,
            body: JSON.stringify({ fileKey, nodeId, libraryPath }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to map components');
          return data;
        },
        { cacheKey: `figma_component_map_${fileKey}_${nodeId}_${libraryPath}` }
      );
    },
    [executeOperation, getAuthHeaders]
  );

  const analyzeContext = useCallback(
    async (fileKey, nodeId) => {
      return executeOperation(
        'context',
        async () => {
          const headers = await getAuthHeaders();
          const res = await fetch('/api/figma/context', {
            method: 'POST',
            headers,
            body: JSON.stringify({ fileKey, nodeId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to analyze design context');
          return data;
        },
        { cacheKey: `figma_context_${fileKey}_${nodeId}` }
      );
    },
    [executeOperation, getAuthHeaders]
  );

  return {
    // Connection
    isConnected,
    connectionLoading,
    connectFigma,
    disconnectFigma,

    // File selection
    selectedFile,
    selectedNode,
    fetchFiles,
    selectFile,
    selectNode,

    // AI operations
    convertToCode,
    generateDiagram,
    extractDesignSystem,
    exportAssets,
    mapComponents,
    analyzeContext,

    // State
    results,
    loadingStates,
    errors,
    clearError,

    // Credit helpers
    credits,
    checkCredits,
    creditCosts: FIGMA_CREDIT_COSTS,
  };
}

export default useFigmaIntegration;
