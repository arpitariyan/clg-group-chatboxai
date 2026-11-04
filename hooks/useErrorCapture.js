// ============================================================================
// hooks/useErrorCapture.js
// ============================================================================

import { useState, useCallback, useRef } from 'react';

/**
 * Manages captured console errors from WebContainer iframe
 * Features:
 * - Deduplicates similar errors
 * - Tracks error frequency  
 * - Maintains error history with timestamps
 * - Provides analysis-ready error data
 * - Supports batch error fixing with locking
 */
export const useErrorCapture = () => {
  const [errors, setErrors] = useState([]);
  const [filteredBy, setFilteredBy] = useState('all'); // all, error, warning, log
  const [isFixing, setIsFixing] = useState(false);
  const errorMapRef = useRef(new Map()); // Track unique errors by fingerprint
  const fixingErrorsRef = useRef(new Set()); // Errors being fixed - prevent re-adding
  const recentlyResolvedRef = useRef(new Map()); // Cooldown for recently resolved fingerprints

  const addError = useCallback((errorData) => {
    if (!errorData || !errorData.message) return;

    // Skip if this error is currently being fixed
    const fingerprint = `${errorData.type}:${errorData.message.slice(0, 100)}`;
    if (fixingErrorsRef.current.has(fingerprint)) {
      return;
    }

    // Skip if this exact error was just resolved very recently
    const resolvedAt = recentlyResolvedRef.current.get(fingerprint);
    if (resolvedAt && Date.now() - resolvedAt < 5000) {
      return;
    }

    const now = Date.now();

    // If we have seen this fingerprint before, always update count and timestamp
    if (errorMapRef.current.has(fingerprint)) {
      const existing = errorMapRef.current.get(fingerprint);
      // Prevent noisy repeated logs from rapidly inflating the visible count
      if (now - (existing.lastSeen || 0) < 10000) {
        setErrors(prev => prev.map(e =>
          e.id === existing.id
            ? { ...e, lastSeen: now, seen: now }
            : e
        ));
        errorMapRef.current.set(fingerprint, { ...existing, lastSeen: now, seen: now });
        return;
      }

      setErrors(prev => prev.map(e =>
        e.id === existing.id
          ? { ...e, count: (e.count || 1) + 1, lastSeen: now, seen: now }
          : e
      ));
      errorMapRef.current.set(fingerprint, { ...existing, count: (existing.count || 1) + 1, lastSeen: now, seen: now });
      return;
    }

    // New error
    const errorId = `error_${now}_${Math.random()}`;
    const newError = {
      id: errorId,
      ...errorData,
      autoFixable: Boolean(
        errorData.autoFixable ?? errorData.isAutoFixable ?? false
      ),
      count: 1,
      timestamp: now,
      seen: now,
      lastSeen: now,
    };

    setErrors(prev => [newError, ...prev].slice(0, 50)); // Keep last 50
    errorMapRef.current.set(fingerprint, newError);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    errorMapRef.current.clear();
    fixingErrorsRef.current.clear();
  }, []);

  const removeError = useCallback((errorId) => {
    setErrors(prev => {
      const target = prev.find(e => e.id === errorId);
      if (target) {
        const fp = `${target.type}:${target.message.slice(0, 100)}`;
        errorMapRef.current.delete(fp);
        fixingErrorsRef.current.delete(fp);
      }
      return prev.filter(e => e.id !== errorId);
    });
  }, []);

  const removeErrorsByFingerprints = useCallback((fingerprints) => {
    setErrors(prev => prev.filter(e => {
      const fp = `${e.type}:${e.message.slice(0, 100)}`;
      return !fingerprints.has(fp);
    }));
    const now = Date.now();
    fingerprints.forEach(fp => {
      errorMapRef.current.delete(fp);
      fixingErrorsRef.current.delete(fp);
      recentlyResolvedRef.current.set(fp, now);
    });
  }, []);

  const getFilteredErrors = useCallback(() => {
    if (filteredBy === 'all') return errors;
    return errors.filter(e => e.type === filteredBy || e.severity === filteredBy);
  }, [errors, filteredBy]);

  const getErrorStats = useCallback(() => {
    return {
      total: errors.length,
      errors: errors.filter(e => e.severity === 'error').length,
      warnings: errors.filter(e => e.severity === 'warning').length,
      logs: errors.filter(e => e.severity === 'log').length,
    };
  }, [errors]);

  // Lock errors while fixing - prevents new errors from being added
  const lockErrorsForFix = useCallback((errorList) => {
    setIsFixing(true);
    // Mark these errors as "being fixed" so they won't be re-added
    errorList.forEach(error => {
      const fp = `${error.type}:${error.message.slice(0, 100)}`;
      fixingErrorsRef.current.add(fp);
    });
  }, []);

  // Unlock after fix completes and remove the fixed errors
  const unlockErrorsAndRemove = useCallback((errorList) => {
    const fixedFingerprints = new Set();
    errorList.forEach(error => {
      const fp = `${error.type}:${error.message.slice(0, 100)}`;
      fixedFingerprints.add(fp);
      fixingErrorsRef.current.delete(fp);
    });
    
    // Remove the fixed errors from state
    removeErrorsByFingerprints(fixedFingerprints);
    setIsFixing(false);
  }, [removeErrorsByFingerprints]);

  // Reset lock state on failure (without removing errors)
  const unlockErrorsOnFailure = useCallback(() => {
    fixingErrorsRef.current.clear();
    setIsFixing(false);
  }, []);

  return {
    errors,
    addError,
    clearErrors,
    removeError,
    removeErrorsByFingerprints,
    filteredBy,
    setFilteredBy,
    getFilteredErrors,
    getErrorStats,
    isFixing,
    lockErrorsForFix,
    unlockErrorsAndRemove,
    unlockErrorsOnFailure,
  };
};
