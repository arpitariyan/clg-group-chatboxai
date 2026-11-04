/**
 * CODE VALIDATOR — Prevents Errors Before Sandbox Deployment
 *
 * Validates generated code against common error patterns.
 * Enables validation gates at Steps 3, 6, 7 of generation pipeline.
 *
 * Returns: { isValid: bool, errors: [{type, message, suggestion}], severity: 'critical'|'warning' }
 */

import fs from 'fs';
import path from 'path';

// ───────────────────────────────────────────────────────────────────────────
// SYNTAX VALIDATION
// ───────────────────────────────────────────────────────────────────────────

export async function validateSyntax(code, language = 'jsx') {
  const errors = [];
  
  if (!code || typeof code !== 'string') {
    return { isValid: false, errors: [{ type: 'EMPTY_CODE', message: 'No code provided', severity: 'critical' }], severity: 'critical' };
  }

  // Check for common syntax issues
  const checks = [
    {
      // Catch imports referencing internal folders without @/ or ./
      pattern: /import\s+.*?\s+from\s+["'](?:src\/|components\/|pages\/|lib\/)/,
      message: 'Internal import should use "@/" alias or "./" relative path',
      suggestion: 'Prefix import path with "@/..."',
      type: 'IMPORT_PATH_ERROR',
    },
    {
      pattern: /import\s+{\s*[^}]*\s*}\s+from\s*$/m,
      message: 'Import statement appears incomplete',
      suggestion: 'Ensure import statement includes source path',
      type: 'SYNTAX_ERROR',
    },
  ];

  for (const check of checks) {
    if (check.pattern && check.pattern.test(code)) {
      errors.push({
        type: check.type,
        message: check.message,
        suggestion: check.suggestion,
        severity: 'warning',
      });
    }
  }

  // Balanced bracket checker with comment/string skipping
  const brackets = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  let inSingleComment = false;
  let inMultiComment = false;
  let inString = null;
  let escaped = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const next = code[i + 1];

    if (inSingleComment) {
      if (char === '\n') inSingleComment = false;
      continue;
    }

    if (inMultiComment) {
      if (char === '*' && next === '/') {
        inMultiComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    // Check for comment starts
    if (char === '/' && next === '/') {
      inSingleComment = true;
      i++;
      continue;
    }
    if (char === '/' && next === '*') {
      inMultiComment = true;
      i++;
      continue;
    }

    // Check for string starts
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (brackets[char]) {
      stack.push({ char, pos: i });
    } else if (Object.values(brackets).includes(char)) {
      const expected = Object.entries(brackets).find(([, close]) => close === char)?.[0];
      if (stack.length === 0 || stack[stack.length - 1].char !== expected) {
        errors.push({
          type: 'SYNTAX_ERROR',
          message: `Unmatched closing ${char} at character ${i}`,
          suggestion: 'Check for missing opening bracket',
          severity: 'critical',
        });
        break;
      } else {
        stack.pop();
      }
    }
  }

  if (stack.length > 0) {
    errors.push({
      type: 'SYNTAX_ERROR',
      message: `Unmatched opening bracket: ${stack[stack.length - 1].char}`,
      suggestion: 'Add closing bracket',
      severity: 'critical',
    });
  }

  return {
    isValid: errors.filter(e => e.severity === 'critical').length === 0,
    errors,
    severity: errors.some(e => e.severity === 'critical') ? 'critical' : 'warning',
  };
}

// ───────────────────────────────────────────────────────────────────────────
// IMPORT VALIDATION
// ───────────────────────────────────────────────────────────────────────────

export async function validateImports(code, generatedFiles = {}) {
  const errors = [];
  const warnings = [];
  
  // Extract all imports
  const importRegex = /import\s+(?:{[^}]*}|.*?)\s+from\s+["']([^"']+)["']/g;
  let match;
  
  const importedPaths = new Set();
  const createdFiles = new Set(Object.keys(generatedFiles));
  
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    importedPaths.add(importPath);

    // Skip node_modules and third-party packages
    if (!importPath.startsWith('@/') && !importPath.startsWith('.')) {
      continue;
    }

    // Normalize path
    let normalizedPath = importPath.replace('@/', '');
    if (!normalizedPath.endsWith('.jsx') && !normalizedPath.endsWith('.js')) {
      // Could be a directory with index or missing extension
      const possibleNames = [
        `${normalizedPath}/index.jsx`,
        `${normalizedPath}/index.js`,
        `${normalizedPath}.jsx`,
        `${normalizedPath}.js`,
      ];
      
      const found = possibleNames.some(p => createdFiles.has(p));
      
      if (!found) {
        errors.push({
          type: 'IMPORT_ERROR',
          message: `Import "${importPath}" - file not found in generated files`,
          suggestion: `Verify file exists: ${normalizedPath}(.jsx|.js|/index.jsx)`,
          severity: 'critical',
        });
      }
    }
  }

  // Check for dangerous brand icon imports from lucide
  const brandIcons = [
    'Twitter', 'Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'Github',
    'Google', 'Apple', 'Discord', 'Slack', 'TikTok', 'Twitch', 'Pinterest'
  ];
  
  const lucideRegex = /from\s+["']lucide-react["']/;
  if (lucideRegex.test(code)) {
    brandIcons.forEach(icon => {
      const pattern = new RegExp(`\\b${icon}\\b.*?from\\s+["']lucide-react["']`, 's');
      if (pattern.test(code)) {
        errors.push({
          type: 'INVALID_EXPORT',
          message: `Brand icon "${icon}" does not exist in lucide-react v0.383`,
          suggestion: `Replace ${icon} with safe alternative (MessageCircle, Search, Camera, etc.)`,
          severity: 'critical',
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'critical' : 'warning',
  };
}

// ───────────────────────────────────────────────────────────────────────────
// PROVIDER VALIDATION
// ───────────────────────────────────────────────────────────────────────────

export async function validateProviders(code, generatedFiles = {}) {
  const errors = [];
  
  // Find all custom hooks (useX pattern)
  const hookRegex = /\b(use[A-Z]\w*)\b/g;
  const usedHooks = new Set();
  let match;
  
  while ((match = hookRegex.exec(code)) !== null) {
    usedHooks.add(match[1]);
  }

  // Standard React hooks that don't need providers
  const standardHooks = new Set([
    'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
    'useMemo', 'useRef', 'useLayoutEffect', 'useImperativeHandle',
    'useDebugValue', 'useDeferredValue', 'useTransition', 'useId'
  ]);

  // Check if custom hooks are imported
  usedHooks.forEach(hook => {
    if (!standardHooks.has(hook)) {
      // Look for corresponding import
      const importPattern = new RegExp(`import\\s+.*${hook}`);
      if (!importPattern.test(code)) {
        errors.push({
          type: 'MISSING_PROVIDER',
          message: `Custom hook "${hook}" used but not imported`,
          suggestion: `Import "${hook}" from the file where it's defined`,
          severity: 'critical',
        });
      }
    }
  });

  // Check App.jsx for provider wrapping
  const appCode = generatedFiles['App.jsx'] || generatedFiles['app.jsx'] || '';
  const contextFiles = Object.keys(generatedFiles).filter(f => 
    f.includes('Context') || f.includes('Provider')
  );

  contextFiles.forEach(contextFile => {
    const contextName = contextFile.replace(/\.jsx?$/, '');
    const providerName = contextName.replace('Context', 'Provider');
    
    // Check if provider is used in App.jsx
    if (appCode && !appCode.includes(providerName)) {
      errors.push({
        type: 'MISSING_PROVIDER',
        message: `Context file "${contextFile}" created but not wrapped in App.jsx`,
        suggestion: `Add <${providerName}> wrapper in App.jsx`,
        severity: 'critical',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    severity: errors.length > 0 ? 'critical' : 'warning',
  };
}

// ───────────────────────────────────────────────────────────────────────────
// COMPONENT NAMING VALIDATION
// ───────────────────────────────────────────────────────────────────────────

export async function validateComponentNaming(generatedFiles = {}) {
  const errors = [];
  const warnings = [];
  
  Object.entries(generatedFiles).forEach(([filename, code]) => {
    // Check for PascalCase in component files
    if (filename.endsWith('.jsx') && !filename.startsWith('_')) {
      const nameWithoutExt = filename.replace('.jsx', '');
      
      // Should be PascalCase
      const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(nameWithoutExt);
      
      if (!isPascalCase && !filename.includes('/')) {
        warnings.push({
          type: 'NAMING_CONVENTION',
          message: `Component file "${filename}" should be PascalCase`,
          suggestion: `Rename to ${nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1)}.jsx`,
          severity: 'warning',
        });
      }
    }

    // Check for kebab-case in utility files
    if ((filename.endsWith('.js') || filename.endsWith('.ts')) && !filename.endsWith('.jsx') && !filename.endsWith('.tsx')) {
      if (filename.includes('/')) {
        const baseName = filename.split('/').pop();
        const isKebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*\.js$/.test(baseName);
        
        if (!isKebabCase && baseName !== 'index.js') {
          warnings.push({
            type: 'NAMING_CONVENTION',
            message: `Utility file "${filename}" should be kebab-case`,
            suggestion: `Rename to kebab-case format`,
            severity: 'warning',
          });
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'critical' : 'warning',
  };
}

// ───────────────────────────────────────────────────────────────────────────
// FILE REFERENCE VALIDATION
// ───────────────────────────────────────────────────────────────────────────

export async function validateFileReferences(code, generatedFiles = {}) {
  const errors = [];
  
  // Find all relative imports
  const importRegex = /from\s+["']([^"']+)["']/g;
  let match;
  
  const createdFiles = new Set(Object.keys(generatedFiles));
  
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    
    // Skip third-party packages
    if (!importPath.startsWith('@/') && !importPath.startsWith('.')) {
      continue;
    }

    // Resolve the path
    let normalizedPath = importPath.replace('@/', '');
    
    // Check if file exists
    const possibleFiles = [
      normalizedPath,
      `${normalizedPath}.jsx`,
      `${normalizedPath}.js`,
      `${normalizedPath}.tsx`,
      `${normalizedPath}.ts`,
      `${normalizedPath}/index.jsx`,
      `${normalizedPath}/index.js`,
    ];

    const fileExists = possibleFiles.some(f => createdFiles.has(f));
    
    if (!fileExists) {
      errors.push({
        type: 'FILE_NOT_FOUND',
        message: `File reference "${importPath}" does not exist in generated files`,
        suggestion: 'Verify import path matches a created file',
        severity: 'critical',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    severity: errors.length > 0 ? 'critical' : 'warning',
  };
}

// ───────────────────────────────────────────────────────────────────────────
// COMPLETE VALIDATION SUITE
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// UI COMPONENT REUSE VALIDATION
// Ensures AI is using the pre-built UI library, not generating new UI components
// ───────────────────────────────────────────────────────────────────────────

export async function validateUIComponentReuse(generatedFiles = {}) {
  const errors = [];
  const warnings = [];
  
  // List of UI components that should NEVER be generated
  const globalUIComponents = [
    'button', 'card', 'input', 'label', 'select', 'dialog', 'alert-dialog',
    'textarea', 'checkbox', 'radio-group', 'switch', 'tabs', 'accordion',
    'breadcrumb', 'badge', 'progress', 'skeleton', 'tooltip', 'popover',
    'dropdown-menu', 'sheet', 'sidebar', 'calendar', 'avatar', 'aspect-ratio',
    'alert', 'form', 'table', 'scroll-area', 'hover-card', 'collapsible',
    'separator', 'menubar'
  ];

  // Check if AI generated any UI component files
  for (const [filename, code] of Object.entries(generatedFiles)) {
    // Extract component name from filename
    const componentName = filename
      .split('/')
      .pop()
      .replace(/\.(jsx|js)$/, '')
      .toLowerCase();

    // Check if this is a components/ui/* file that shouldn't be generated
    if (filename.includes('/components/ui/')) {
      // This should never happen in our system
      errors.push({
        type: 'INVALID_UI_COMPONENT_PATH',
        message: `UI component file generated: ${filename}. UI components should NOT be generated.`,
        suggestion: 'Remove this file. Import from @/components/ui instead.',
        severity: 'critical',
        file: filename,
      });
    }

    // Check for common UI component patterns in wrong locations
    globalUIComponents.forEach(uiComp => {
      const patterns = [
        new RegExp(`^export\\s+(default)?\\s*function\\s+(${uiComp.replace(/-/g, '')}|${uiComp.replace(/-/g, '\\w')})[^a-zA-Z]`, 'im'),
        new RegExp(`const\\s+${uiComp.replace(/-/g, '')}\\s*=`, 'im'),
      ];

      if (patterns.some(p => p.test(code)) && !filename.includes('/components/ui/')) {
        // This might be intentional if it's a custom wrapper component
        // Only warn, don't error
        if (filename.split('/').length <= 3) { // components/CustomButton.jsx is ok
          warnings.push({
            type: 'UI_COMPONENT_NOT_REUSED',
            message: `Found ${uiComp} pattern in ${filename}. Consider importing from @/components/ui/${uiComp}.`,
            suggestion: `Use: import { ${uiComp.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')} } from "@/components/ui/${uiComp}"`,
            severity: 'warning',
            file: filename,
          });
        }
      }
    });

    // Check for shadcn-specific patterns that indicate UI component generation
    const shadcnPatterns = [
      /import.*from\s+["']@radix-ui/,                    // Radix UI imports
      /const\s+\w+\s*=\s*React\.forwardRef/,            // forwardRef usage (common in UI components)
      /RadixComponent\.displayName\s*=/,                 // displayName pattern
    ];

    if (filename.includes('components/') && !filename.includes('components/ui/')) {
      const hasPatterns = shadcnPatterns.filter(p => p.test(code)).length;
      if (hasPatterns >= 2) {
        // Likely trying to recreate a UI component
        warnings.push({
          type: 'POSSIBLE_UI_GENERATION',
          message: `${filename} looks like it might be recreating a UI component (Radix UI patterns detected).`,
          suggestion: 'Check if this should import from @/components/ui instead of being created here.',
          severity: 'warning',
          file: filename,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'critical' : (warnings.length > 0 ? 'warning' : 'info'),
  };
}

export async function validateGeneratedCode(generatedFiles = {}) {
  const allResults = {
    syntax: null,
    imports: null,
    providers: null,
    naming: null,
    fileReferences: null,
    uiComponentReuse: null,
  };

  const criticalErrors = [];
  const warnings = [];

  // ── NEW: UI Component Reuse Validation ──────────────────────────────────
  const uiReuseResult = await validateUIComponentReuse(generatedFiles);
  allResults.uiComponentReuse = uiReuseResult;
  
  if (!uiReuseResult.isValid) {
    criticalErrors.push(...uiReuseResult.errors);
  }
  if (uiReuseResult.warnings) {
    warnings.push(...uiReuseResult.warnings);
  }

  // Run all validators
  for (const [filename, code] of Object.entries(generatedFiles)) {
    // Syntax validation per file
    if (filename.endsWith('.jsx') || filename.endsWith('.js')) {
      const syntaxResult = await validateSyntax(code);
      allResults.syntax = syntaxResult;
      
      if (!syntaxResult.isValid) {
        criticalErrors.push(...syntaxResult.errors);
      }

      // Import validation per file
      const importResult = await validateImports(code, generatedFiles);
      allResults.imports = importResult;
      
      if (!importResult.isValid) {
        criticalErrors.push(...importResult.errors);
      }

      // Provider validation per file
      const providerResult = await validateProviders(code, generatedFiles);
      allResults.providers = providerResult;
      
      if (!providerResult.isValid) {
        criticalErrors.push(...providerResult.errors);
      }

      // File reference validation
      const fileRefResult = await validateFileReferences(code, generatedFiles);
      allResults.fileReferences = fileRefResult;
      
      if (!fileRefResult.isValid) {
        criticalErrors.push(...fileRefResult.errors);
      }
    }
  }

  // Component naming validation across all files
  const namingResult = await validateComponentNaming(generatedFiles);
  allResults.naming = namingResult;

  return {
    isValid: criticalErrors.length === 0,
    errors: criticalErrors,
    warnings,
    severity: criticalErrors.length > 0 ? 'critical' : 'warning',
    details: allResults, // Include all detailed results for debugging
  };
}

// ───────────────────────────────────────────────────────────────────────────
// HELPER: Format validation errors for logging
// ───────────────────────────────────────────────────────────────────────────

export function formatValidationErrors(result) {
  if (result.isValid) {
    return '✅ All validations passed';
  }

  const lines = [`❌ Validation failed (${result.errors.length} errors):`];
  
  result.errors.forEach((err, idx) => {
    lines.push(`\n${idx + 1}. [${err.type}] ${err.message}`);
    if (err.suggestion) {
      lines.push(`   💡 ${err.suggestion}`);
    }
  });

  return lines.join('\n');
}
