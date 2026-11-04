// ============================================================================
// components/website-builder/ConsolePanel.jsx
// ============================================================================

'use client'
import React from 'react';
import { X, AlertCircle, AlertTriangle, Info, Copy, Trash2, Zap, Loader } from '@/components/ui/animated-icon';
import { toast } from '@/lib/alert';

export default function ConsolePanel({ 
  errors, 
  onClearErrors, 
  onRemoveError, 
  onFixError,
  onFixAll,
  filteredBy, 
  setFilteredBy,
  isOpen,
  onClose,
  isFixing = false,
  validationStatus = null // 'validating', 'fixing', 'valid', 'has-errors'
}) {
  // Auto-fix known error types silently
  React.useEffect(() => {
    if (!isFixing && validationStatus === 'fixing') {
      const autoFixableErrors = errors.filter(e => {
        const errorType = e.type?.toUpperCase() || '';
        // Auto-fix these error types without user intervention
        return [
          'MISSING_PROVIDER',
          'INVALID_EXPORT',
          'IMPORT_ERROR',
          'SYNTAX_ERROR'
        ].includes(errorType);
      });

      if (autoFixableErrors.length > 0) {
        toast.info(`🔧 Auto-fixing ${autoFixableErrors.length} issue(s)...`);
        onFixAll(autoFixableErrors);
      }
    }
  }, [validationStatus, isFixing, errors, onFixAll]);

  if (!isOpen || errors.length === 0) {
    return null;
  }

  const fixableErrors = errors.filter(e => e.autoFixable && e.severity === 'error');

  const getErrorIcon = (severity) => {
    switch(severity) {
      case 'error': return <AlertCircle className="size-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="size-4 text-yellow-400" />;
      default: return <Info className="size-4 text-blue-400" />;
    }
  };

  const getErrorColor = (severity) => {
    switch(severity) {
      case 'error': return 'border-red-500/30 bg-red-500/5';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
      default: return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  const getSeverityBg = (severity) => {
    switch(severity) {
      case 'error': return 'bg-red-500/20 text-red-300';
      case 'warning': return 'bg-yellow-500/20 text-yellow-300';
      default: return 'bg-blue-500/20 text-blue-300';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[40vh] bg-gray-950 border-t border-gray-700 flex flex-col z-40 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="size-5 text-red-400" />
          <h3 className="font-semibold text-gray-200">Console Errors ({errors.length})</h3>
          
          {/* Validation Status Badge */}
          {validationStatus && (
            <div className={`ml-4 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
              validationStatus === 'validating' 
                ? 'bg-blue-500/20 text-blue-300' 
                : validationStatus === 'fixing'
                ? 'bg-amber-500/20 text-amber-300'
                : validationStatus === 'valid'
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            }`}>
              {validationStatus === 'validating' && (
                <>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  Validating...
                </>
              )}
              {validationStatus === 'fixing' && (
                <>
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Auto-fixing...
                </>
              )}
              {validationStatus === 'valid' && (
                <>
                  <span>✓</span>
                  Valid
                </>
              )}
              {validationStatus === 'has-errors' && (
                <>
                  <span>⚠</span>
                  Errors found
                </>
              )}
            </div>
          )}
          
          <div className="flex gap-2 ml-4">
            {['all', 'error', 'warning', 'log'].map(filter => (
              <button
                key={filter}
                onClick={() => setFilteredBy(filter)}
                disabled={isFixing}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filteredBy === filter
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } ${isFixing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {filter.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Fix All Button */}
          {fixableErrors.length > 0 && !isFixing && (
            <button
              onClick={() => {
                toast.info(`🔧 Fixing all ${fixableErrors.length} error(s)...`);
                onFixAll(fixableErrors);
              }}
              title={`Auto-fix all ${fixableErrors.length} fixable error(s)`}
              className="px-3 py-1.5 text-sm bg-green-500/20 text-green-300 hover:bg-green-500/40 rounded transition-colors flex items-center gap-2"
            >
              <Zap className="size-4" />
              Fix All ({fixableErrors.length})
            </button>
          )}

          {/* Fixing State Indicator */}
          {isFixing && (
            <div className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-300 rounded flex items-center gap-2 animate-pulse">
              <Loader className="size-4 animate-spin" />
              Fixing...
            </div>
          )}

          <button
            onClick={onClearErrors}
            disabled={isFixing}
            title="Clear all errors"
            className={`p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors ${isFixing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={onClose}
            disabled={isFixing}
            title="Close console"
            className={`p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors ${isFixing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Console List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {errors.map(error => (
          <div
            key={error.id}
            className={`p-3 rounded border ${getErrorColor(error.severity)} text-sm font-mono group ${isFixing ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-start gap-2 flex-1">
                {getErrorIcon(error.severity)}
                <div className="flex-1">
                  <div className="text-gray-100 break-word">{error.message}</div>
                  {error.type && (
                    <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${getSeverityBg(error.severity)}`}>
                      {error.type.replace(/_/g, ' ')}
                    </div>
                  )}
                  {error.count && error.count > 1 && (
                    <div className="text-xs text-gray-400 mt-1">Occurred {error.count} times</div>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(error.message);
                    toast.success('Copied to clipboard');
                  }}
                  disabled={isFixing}
                  title="Copy error"
                  className={`p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded ${isFixing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Copy className="size-3" />
                </button>
                {error.autoFixable && !isFixing && (
                  <button
                    onClick={() => onFixError(error)}
                    title="Auto-fix this error"
                    className="p-1 text-green-400 hover:text-green-300 hover:bg-green-700/20 rounded flex items-center gap-1"
                  >
                    <Zap className="size-3" />
                  </button>
                )}
                <button
                  onClick={() => onRemoveError(error.id)}
                  disabled={isFixing}
                  title="Dismiss"
                  className={`p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded ${isFixing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">Stack trace</summary>
                <pre className="mt-2 text-xs text-gray-500 bg-gray-950/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-word">
                  {error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
