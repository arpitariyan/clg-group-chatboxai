// ============================================================================
// lib/error-analyzer.js  
// ============================================================================

/**
 * Enhanced error analyzer that:
 * 1. Identifies exact file location of errors
 * 2. Analyzes folder structure
 * 3. Detects import/dependency issues
 * 4. Generates targeted fix prompts with actual code context
 */

export const ERROR_TYPES = {
  IMPORT_ERROR: 'IMPORT_ERROR',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  REFERENCE_ERROR: 'REFERENCE_ERROR',
  MISSING_PROVIDER: 'MISSING_PROVIDER',
  INVALID_EXPORT: 'INVALID_EXPORT',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
};

/**
 * Extracts file path from error message
 */
function extractFilePathFromError(errorMessage) {
  if (!errorMessage) return null;
  
  const text = String(errorMessage);
  
  // Pattern 1: "at fileName.jsx:line:col"
  const atMatch = text.match(/at\s+([^:\s]+\.jsx?)\s*:\s*(\d+)/);
  if (atMatch) return { file: atMatch[1], line: atMatch[2] };
  
  // Pattern 2: Full path like "src/components/Button.jsx:42"
  const fullPathMatch = text.match(/(src\/[^:\s"']+\.jsx?)\s*[:;]?\s*(\d+)?/);
  if (fullPathMatch) return { file: fullPathMatch[1], line: fullPathMatch[2] };
  
  // Pattern 3: "Cannot find module 'src/...' "
  const moduleMatch = text.match(/Cannot find module ['"`](src\/[^'"`\n]+)['"`]/);
  if (moduleMatch) return { file: moduleMatch[1], line: null };
  
  // Pattern 4: "in src/..."
  const inMatch = text.match(/in\s+(src\/[^\s'"]+\.jsx?)/);
  if (inMatch) return { file: inMatch[1], line: null };
  
  return null;
}

/**
 * Analyzes folder structure of generated code
 */
function analyzeFolderStructure(filesList = []) {
  const structure = {
    pages: [],
    customComponents: [],
    uiComponents: [],
    context: [],
    data: [],
    hooks: [],
    lib: [],
    other: [],
  };
  
  for (const file of filesList) {
    if (file.startsWith('src/pages/')) structure.pages.push(file);
    else if (file.startsWith('src/components/ui/')) structure.uiComponents.push(file);
    else if (file.startsWith('src/components/')) structure.customComponents.push(file);
    else if (file.startsWith('src/context/')) structure.context.push(file);
    else if (file.startsWith('src/data/')) structure.data.push(file);
    else if (file.startsWith('src/hooks/')) structure.hooks.push(file);
    else if (file.startsWith('src/lib/')) structure.lib.push(file);
    else if (file.startsWith('src/')) structure.other.push(file);
  }
  
  return structure;
}

/**
 * Resolves import paths
 */
function resolveImportPath(importPath, fromFile) {
  if (!importPath || !fromFile) return null;
  if (!importPath.startsWith('.')) return importPath; // External
  
  const fromDir = fromFile.split('/').slice(0, -1);
  const importParts = importPath.split('/');
  
  let targetPath = [...fromDir];
  for (const part of importParts) {
    if (part === '..') {
      targetPath.pop();
    } else if (part === '.') {
      // Stay in directory
    } else if (part) {
      targetPath.push(part);
    }
  }
  
  const resolved = targetPath.join('/');
  for (const ext of ['.jsx', '.js', '/index.jsx', '/index.js']) {
    if (!resolved.endsWith(ext)) {
      return resolved + ext;
    }
  }
  
  return resolved;
}

/**
 * Analyzes error location with file content and imports
 */
export function diagnosticAnalyzeError(errorMessage, generatedFiles = {}) {
  const fileInfo = extractFilePathFromError(errorMessage);
  const filesList = Object.keys(generatedFiles || {});
  const folderStructure = analyzeFolderStructure(filesList);
  
  let problemFile = null;
  let problemFileContent = null;
  
  if (fileInfo?.file) {
    if (generatedFiles[fileInfo.file]) {
      problemFile = fileInfo.file;
      problemFileContent = generatedFiles[fileInfo.file];
    } else {
      const matched = Object.keys(generatedFiles).find(f => f.endsWith(fileInfo.file));
      if (matched) {
        problemFile = matched;
        problemFileContent = generatedFiles[matched];
      }
    }
  }
  
  let relatedFiles = [];
  if (problemFile) {
    const fileDir = problemFile.split('/').slice(0, -1).join('/');
    relatedFiles = filesList.filter(f => 
      f !== problemFile && 
      f.startsWith(fileDir) && 
      f.endsWith('.jsx')
    ).slice(0, 3);
  }
  
  let importIssues = [];
  if (problemFileContent && typeof problemFileContent === 'string') {
    const importRegex = /import\s+[^;]+from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = importRegex.exec(problemFileContent)) !== null) {
      const importPath = match[1];
      const resolvedPath = resolveImportPath(importPath, problemFile);
      
      if (resolvedPath && !resolvedPath.startsWith('react') && !importPath.startsWith('@') && !filesList.includes(resolvedPath)) {
        importIssues.push({
          importPath,
          resolvedPath,
          exists: false,
        });
      }
    }
  }
  
  return {
    fileInfo,
    problemFile,
    problemFileContent: problemFileContent ? problemFileContent.slice(0, 800) : null,
    relatedFiles,
    folderStructure,
    importIssues,
  };
}
export function analyzeError(errorMessage, errorStack = '') {
  const msg = String(errorMessage || '').toLowerCase();
  const stack = String(errorStack || '').toLowerCase();

  let errorType = ERROR_TYPES.RUNTIME_ERROR;
  let fixSuggestion = '';
  let severity = 'error';

  if (msg.includes('cannot find module') || msg.includes('module not found') || msg.includes('enoent')) {
    errorType = ERROR_TYPES.IMPORT_ERROR;
    fixSuggestion = 'Check imports and file paths. File might be missing or path is incorrect.';
  } else if (msg.includes('syntax error') || msg.includes('unexpected token') || msg.includes('parse error')) {
    errorType = ERROR_TYPES.SYNTAX_ERROR;
    fixSuggestion = 'Fix JavaScript/JSX syntax. Check for missing braces, semicolons, or malformed code.';
  } else if (msg.includes('is not defined') || msg.includes('undefined is not')) {
    errorType = ERROR_TYPES.REFERENCE_ERROR;
    fixSuggestion = 'Variable or function is not defined. Check variable declarations and imports.';
  } else if (msg.includes('must be used within')) {
    errorType = ERROR_TYPES.MISSING_PROVIDER;
    fixSuggestion = 'Context provider is missing. Wrap parent component with required provider.';
  } else if (msg.includes('does not provide an export') || msg.includes('export')) {
    errorType = ERROR_TYPES.INVALID_EXPORT;
    fixSuggestion = 'Import is trying to access non-existent export. Check exported names in module.';
  } else if (msg.includes('404') || (msg.includes('not found') && msg.includes('http'))) {
    errorType = ERROR_TYPES.FILE_NOT_FOUND;
    fixSuggestion = 'File or resource not found (404). Check if file exists and path is correct.';
  } else if (msg.includes('500') || msg.includes('internal server error')) {
    errorType = ERROR_TYPES.NETWORK_ERROR;
    fixSuggestion = 'Server error (500). The generated file may have invalid code. Regenerating should fix this.';
  } else if (msg.includes('permission') || msg.includes('access denied')) {
    errorType = ERROR_TYPES.PERMISSION_ERROR;
    fixSuggestion = 'Permission denied. Check file access or browser security policies.';
  } else if (msg.includes('net::err') || msg.includes('aborted') || msg.includes('network')) {
    errorType = ERROR_TYPES.NETWORK_ERROR;
    fixSuggestion = 'Network error occurred. Check generated files and try regenerating.';
  }

  const autoFixable = [
    ERROR_TYPES.SYNTAX_ERROR,
    ERROR_TYPES.IMPORT_ERROR,
    ERROR_TYPES.REFERENCE_ERROR,
    ERROR_TYPES.MISSING_PROVIDER,
    ERROR_TYPES.INVALID_EXPORT,
    ERROR_TYPES.FILE_NOT_FOUND,
    ERROR_TYPES.NETWORK_ERROR,
  ].includes(errorType);

  return {
    errorType,
    severity,
    fixSuggestion,
    autoFixable,
    message: String(errorMessage),
    stack: String(errorStack),
    timestamp: Date.now(),
  };
}

/**
 * Generates contextual fix prompt using diagnostic info
 */
export function generateFixPromptWithContext(errorMessage, errorData, diagnosticInfo) {
  const { problemFile, importIssues, folderStructure } = diagnosticInfo || {};
  
  let prompt = `I detected a ${errorData.errorType} error in your generated website:\n\n`;
  prompt += `**Error**: "${errorMessage.slice(0, 200)}"\n`;
  prompt += `**Type**: ${errorData.errorType}\n`;
  prompt += `**Suggestion**: ${errorData.fixSuggestion}\n\n`;
  
  if (problemFile) {
    prompt += `**Problem File**: ${problemFile}\n`;
  }
  
  if (importIssues && importIssues.length > 0) {
    prompt += `\n**Import Issues Found**:\n`;
    for (const issue of importIssues) {
      prompt += `- Import '${issue.importPath}' → attempts to load '${issue.resolvedPath}' (file missing)\n`;
    }
  }
  
  if (folderStructure) {
    const { pages, customComponents, uiComponents, context, data, hooks } = folderStructure;
    prompt += `\n**Generated Folder Structure**:\n`;
    if (pages.length > 0) prompt += `- Pages: ${pages.map(p => p.split('/').pop()).join(', ')}\n`;
    if (customComponents.length > 0) prompt += `- Components: ${customComponents.map(c => c.split('/').pop()).join(', ')}\n`;
    if (context.length > 0) prompt += `- Context: ${context.map(c => c.split('/').pop()).join(', ')}\n`;
    if (data.length > 0) prompt += `- Data: ${data.map(d => d.split('/').pop()).join(', ')}\n`;
  }
  
  prompt += `\nPlease analyze this error carefully and fix the code to resolve it. `;
  prompt += `Ensure all imports are correct, files exist, and dependencies are properly wired.`;
  
  return prompt;
}

/**
 * Legacy fix prompt generator (backwards compatible)
 */
export function generateFixPrompt(errorData) {
  return `I detected a ${errorData.errorType} error: "${errorData.message.slice(0, 150)}"\n\nError type: ${errorData.errorType}\nSuggestion: ${errorData.fixSuggestion}\n\nPlease fix this error in the code.`;
}

export function isCriticalError(errorType) {
  return [
    ERROR_TYPES.SYNTAX_ERROR,
    ERROR_TYPES.IMPORT_ERROR,
    ERROR_TYPES.NETWORK_ERROR,
  ].includes(errorType);
}
