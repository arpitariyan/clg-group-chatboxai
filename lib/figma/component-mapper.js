/**
 * Component Mapper
 * Maps Figma components to existing codebase components using fuzzy matching.
 * Scans a directory for exported React components, indexes them with prop interfaces,
 * and matches Figma component names against the index.
 */

import fs from 'fs';
import path from 'path';

/**
 * Scan a directory and index all exported React components with their prop interfaces.
 * @param {string} directoryPath - Absolute path to the component library directory
 * @returns {Promise<object[]>} Array of ComponentIndex objects
 */
export async function indexComponentLibrary(directoryPath) {
  if (!directoryPath || typeof directoryPath !== 'string') {
    throw new Error('A valid directory path is required');
  }

  // Normalize the path
  const normalizedPath = path.resolve(directoryPath);

  if (!fs.existsSync(normalizedPath)) {
    throw new Error(`Directory not found: ${normalizedPath}`);
  }

  const stat = fs.statSync(normalizedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${normalizedPath}`);
  }

  const components = [];
  await scanDirectory(normalizedPath, normalizedPath, components);
  return components;
}

/**
 * Recursively scan a directory for React component files.
 * @param {string} dir - Current directory to scan
 * @param {string} rootDir - Root directory for relative path calculation
 * @param {object[]} components - Accumulator array for found components
 */
async function scanDirectory(dir, rootDir, components) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, hidden dirs, and test files
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__tests__') {
        continue;
      }
      await scanDirectory(fullPath, rootDir, components);
      continue;
    }

    // Only process JS/JSX/TS/TSX files
    const ext = path.extname(entry.name).toLowerCase();
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) continue;

    // Skip test files, stories, and style files
    if (
      entry.name.includes('.test.') ||
      entry.name.includes('.spec.') ||
      entry.name.includes('.stories.') ||
      entry.name.includes('.styles.') ||
      entry.name.includes('.d.ts')
    ) {
      continue;
    }

    try {
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const extracted = extractComponentInfo(fileContent, fullPath, rootDir);
      if (extracted.length > 0) {
        components.push(...extracted);
      }
    } catch {
      // Skip files that can't be read
    }
  }
}

/**
 * Extract component information from a file's content.
 * Detects exported React components and their props.
 * @param {string} content - File content
 * @param {string} filePath - Absolute file path
 * @param {string} rootDir - Root directory for relative path
 * @returns {object[]} Array of component info objects
 */
function extractComponentInfo(content, filePath, rootDir) {
  const components = [];
  const relativePath = path.relative(rootDir, filePath);
  const fileName = path.basename(filePath, path.extname(filePath));

  // Pattern 1: export default function ComponentName({ props })
  const defaultFuncPattern = /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)\s*\(\s*\{?\s*([^)]*)\}?\s*\)/g;
  let match;

  while ((match = defaultFuncPattern.exec(content)) !== null) {
    const componentName = match[1];
    const propsStr = match[2];
    components.push({
      name: componentName,
      filePath: relativePath,
      importPath: buildImportPath(relativePath),
      props: parsePropsFromDestructuring(propsStr),
      exportType: 'default',
    });
  }

  // Pattern 2: export function ComponentName({ props })
  const namedFuncPattern = /export\s+function\s+([A-Z][a-zA-Z0-9]*)\s*\(\s*\{?\s*([^)]*)\}?\s*\)/g;
  while ((match = namedFuncPattern.exec(content)) !== null) {
    const componentName = match[1];
    const propsStr = match[2];
    // Avoid duplicates with default export
    if (!components.find((c) => c.name === componentName)) {
      components.push({
        name: componentName,
        filePath: relativePath,
        importPath: buildImportPath(relativePath),
        props: parsePropsFromDestructuring(propsStr),
        exportType: 'named',
      });
    }
  }

  // Pattern 3: const ComponentName = ({ props }) => ... ; export default ComponentName
  const arrowPattern = /(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*\(\s*\{?\s*([^)]*)\}?\s*\)\s*=>/g;
  while ((match = arrowPattern.exec(content)) !== null) {
    const componentName = match[1];
    const propsStr = match[2];
    if (!components.find((c) => c.name === componentName)) {
      const isExported =
        content.includes(`export default ${componentName}`) ||
        content.includes(`export { ${componentName}`) ||
        match[0].startsWith('export');
      if (isExported) {
        components.push({
          name: componentName,
          filePath: relativePath,
          importPath: buildImportPath(relativePath),
          props: parsePropsFromDestructuring(propsStr),
          exportType: content.includes(`export default ${componentName}`) ? 'default' : 'named',
        });
      }
    }
  }

  // Pattern 4: If no components found but file has a default export and PascalCase filename
  if (components.length === 0 && /^[A-Z]/.test(fileName)) {
    if (content.includes('export default') || content.includes('module.exports')) {
      components.push({
        name: fileName,
        filePath: relativePath,
        importPath: buildImportPath(relativePath),
        props: extractPropsFromInterface(content) || [],
        exportType: 'default',
      });
    }
  }

  return components;
}

/**
 * Parse props from a destructuring pattern string.
 * @param {string} propsStr - The destructured props string (e.g., "title, onClick, className = ''")
 * @returns {object[]} Array of prop objects with name and optional default
 */
function parsePropsFromDestructuring(propsStr) {
  if (!propsStr || propsStr.trim().length === 0) return [];

  const props = [];
  // Split by comma, handling nested defaults
  const parts = splitProps(propsStr);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Handle prop = defaultValue
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const propName = trimmed.slice(0, eqIndex).trim();
      const defaultValue = trimmed.slice(eqIndex + 1).trim();
      if (isValidPropName(propName)) {
        props.push({ name: propName, defaultValue, required: false });
      }
    } else {
      // Handle spread (...rest)
      if (trimmed.startsWith('...')) continue;
      if (isValidPropName(trimmed)) {
        props.push({ name: trimmed, required: true });
      }
    }
  }

  return props;
}

/**
 * Split a props string by commas, respecting nested structures.
 */
function splitProps(str) {
  const parts = [];
  let depth = 0;
  let current = '';

  for (const char of str) {
    if (char === '{' || char === '[' || char === '(') depth++;
    else if (char === '}' || char === ']' || char === ')') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Check if a string is a valid JavaScript prop name.
 */
function isValidPropName(name) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Extract props from TypeScript interface or PropTypes in the file.
 * @param {string} content - File content
 * @returns {object[]|null} Array of prop objects or null
 */
function extractPropsFromInterface(content) {
  // Try TypeScript interface: interface Props { ... }
  const interfaceMatch = content.match(/interface\s+\w*Props\w*\s*\{([^}]+)\}/);
  if (interfaceMatch) {
    const body = interfaceMatch[1];
    const props = [];
    const lines = body.split('\n');
    for (const line of lines) {
      const propMatch = line.match(/^\s*(\w+)(\?)?:\s*(.+?)(?:;|$)/);
      if (propMatch) {
        props.push({
          name: propMatch[1],
          required: !propMatch[2],
          type: propMatch[3].trim(),
        });
      }
    }
    return props.length > 0 ? props : null;
  }

  // Try type Props = { ... }
  const typeMatch = content.match(/type\s+\w*Props\w*\s*=\s*\{([^}]+)\}/);
  if (typeMatch) {
    const body = typeMatch[1];
    const props = [];
    const lines = body.split('\n');
    for (const line of lines) {
      const propMatch = line.match(/^\s*(\w+)(\?)?:\s*(.+?)(?:;|$)/);
      if (propMatch) {
        props.push({
          name: propMatch[1],
          required: !propMatch[2],
          type: propMatch[3].trim(),
        });
      }
    }
    return props.length > 0 ? props : null;
  }

  return null;
}

/**
 * Build an import path from a relative file path.
 * @param {string} relativePath - Relative path from root
 * @returns {string} Import path (without extension)
 */
function buildImportPath(relativePath) {
  // Normalize separators and remove extension
  const normalized = relativePath.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.(jsx?|tsx?)$/, '');
  // Remove /index suffix
  const cleaned = withoutExt.replace(/\/index$/, '');
  return `./${cleaned}`;
}

/**
 * Match a Figma component against the indexed component library.
 * Uses fuzzy string matching to find the best match.
 * @param {object} figmaComponent - Object with name, type, and properties from Figma
 * @param {object[]} index - Array of ComponentIndex objects from indexComponentLibrary
 * @returns {object} MatchResult with bestMatch, confidence, and alternatives
 */
export function matchFigmaComponent(figmaComponent, index) {
  if (!figmaComponent || !figmaComponent.name) {
    return { bestMatch: null, confidence: 0, alternatives: [] };
  }

  if (!Array.isArray(index) || index.length === 0) {
    return { bestMatch: null, confidence: 0, alternatives: [] };
  }

  const figmaName = figmaComponent.name;
  const figmaProps = figmaComponent.properties || {};
  const figmaPropNames = Object.keys(figmaProps);

  // Score each component in the index
  const scored = index.map((component) => {
    const nameScore = calculateNameSimilarity(figmaName, component.name);
    const propScore = calculatePropSimilarity(figmaPropNames, component.props);
    const confidence = calculateConfidence(figmaName, component.name, propScore);

    return {
      component,
      confidence,
      nameScore,
      propScore,
    };
  });

  // Sort by confidence descending
  scored.sort((a, b) => b.confidence - a.confidence);

  const bestMatch = scored[0];
  const alternatives = scored.slice(1, 4).filter((s) => s.confidence >= 50);

  if (bestMatch.confidence >= 70) {
    return {
      bestMatch: {
        ...bestMatch.component,
        confidence: bestMatch.confidence,
      },
      confidence: bestMatch.confidence,
      alternatives: alternatives.map((a) => ({
        ...a.component,
        confidence: a.confidence,
      })),
    };
  }

  return {
    bestMatch: null,
    confidence: bestMatch.confidence,
    alternatives: scored.slice(0, 3).filter((s) => s.confidence >= 40).map((a) => ({
      ...a.component,
      confidence: a.confidence,
    })),
  };
}

/**
 * Calculate confidence score (0-100) for a match between Figma and code component.
 * Combines name similarity and structural (prop) similarity.
 * @param {string} figmaName - Figma component name
 * @param {string} codeName - Code component name
 * @param {number} structuralSimilarity - Prop overlap score (0-1)
 * @returns {number} Confidence score 0-100
 */
export function calculateConfidence(figmaName, codeName, structuralSimilarity) {
  // Name similarity is weighted 60%, structural similarity 40%
  const nameSim = calculateNameSimilarity(figmaName, codeName);
  const nameWeight = 0.6;
  const structWeight = 0.4;

  const rawScore = (nameSim * nameWeight) + (structuralSimilarity * 100 * structWeight);
  return Math.round(Math.min(100, Math.max(0, rawScore)));
}

/**
 * Calculate name similarity between a Figma component name and a code component name.
 * Uses normalized Levenshtein distance and token matching.
 * @param {string} figmaName - Figma component name (may contain slashes, spaces, etc.)
 * @param {string} codeName - Code component name (PascalCase)
 * @returns {number} Similarity score 0-100
 */
function calculateNameSimilarity(figmaName, codeName) {
  if (!figmaName || !codeName) return 0;

  // Normalize both names for comparison
  const normalizedFigma = normalizeName(figmaName);
  const normalizedCode = normalizeName(codeName);

  // Exact match after normalization
  if (normalizedFigma === normalizedCode) return 100;

  // Check if one contains the other
  if (normalizedFigma.includes(normalizedCode) || normalizedCode.includes(normalizedFigma)) {
    const longer = Math.max(normalizedFigma.length, normalizedCode.length);
    const shorter = Math.min(normalizedFigma.length, normalizedCode.length);
    return Math.round((shorter / longer) * 95);
  }

  // Token-based matching
  const figmaTokens = tokenize(figmaName);
  const codeTokens = tokenize(codeName);
  const tokenScore = calculateTokenOverlap(figmaTokens, codeTokens);

  // Levenshtein-based similarity
  const levenshteinScore = 1 - (levenshteinDistance(normalizedFigma, normalizedCode) / Math.max(normalizedFigma.length, normalizedCode.length));

  // Take the better of the two approaches
  return Math.round(Math.max(tokenScore, levenshteinScore * 100));
}

/**
 * Calculate prop similarity between Figma properties and component props.
 * @param {string[]} figmaPropNames - Array of Figma property names
 * @param {object[]} componentProps - Array of component prop objects
 * @returns {number} Similarity score 0-1
 */
function calculatePropSimilarity(figmaPropNames, componentProps) {
  if (!figmaPropNames || figmaPropNames.length === 0) return 0.5; // Neutral if no Figma props
  if (!componentProps || componentProps.length === 0) return 0.3;

  const codePropNames = componentProps.map((p) => normalizeName(p.name));
  const normalizedFigmaProps = figmaPropNames.map(normalizeName);

  let matches = 0;
  for (const figmaProp of normalizedFigmaProps) {
    if (codePropNames.some((cp) => cp === figmaProp || cp.includes(figmaProp) || figmaProp.includes(cp))) {
      matches++;
    }
  }

  const total = Math.max(normalizedFigmaProps.length, codePropNames.length);
  return total > 0 ? matches / total : 0;
}

/**
 * Normalize a component name for comparison.
 * Removes separators, converts to lowercase.
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .replace(/[/\\]/g, ' ')  // Replace path separators
    .replace(/[-_\s]+/g, '')  // Remove separators
    .replace(/([a-z])([A-Z])/g, '$1$2')  // Keep camelCase as-is
    .toLowerCase()
    .trim();
}

/**
 * Tokenize a name into individual words.
 */
function tokenize(name) {
  if (!name) return [];
  return name
    .replace(/[/\\]/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Calculate token overlap between two token arrays.
 * @returns {number} Score 0-100
 */
function calculateTokenOverlap(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  let matches = 0;
  for (const tokenA of tokensA) {
    if (tokensB.some((tokenB) => tokenA === tokenB || tokenA.includes(tokenB) || tokenB.includes(tokenA))) {
      matches++;
    }
  }

  const total = Math.max(tokensA.length, tokensB.length);
  return Math.round((matches / total) * 100);
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Generate usage code for a matched component with correct import and prop mapping.
 * @param {object} match - The matched component from matchFigmaComponent
 * @param {object} figmaProps - Props extracted from the Figma component
 * @returns {string} Generated usage code with import statement and component usage
 */
export function generateUsageCode(match, figmaProps) {
  if (!match || !match.name) {
    return '';
  }

  const { name, importPath, exportType, props: componentProps } = match;

  // Build import statement
  let importStatement;
  if (exportType === 'default') {
    importStatement = `import ${name} from '${importPath}';`;
  } else {
    importStatement = `import { ${name} } from '${importPath}';`;
  }

  // Map Figma props to component props
  const mappedProps = mapFigmaPropsToComponent(figmaProps, componentProps || []);

  // Build JSX usage
  const propsString = buildPropsString(mappedProps);
  const hasChildren = mappedProps.some((p) => p.name === 'children');
  const childrenProp = mappedProps.find((p) => p.name === 'children');

  let usage;
  if (hasChildren && childrenProp) {
    const otherProps = mappedProps.filter((p) => p.name !== 'children');
    const otherPropsStr = buildPropsString(otherProps);
    usage = `<${name}${otherPropsStr ? ' ' + otherPropsStr : ''}>\n  ${childrenProp.value}\n</${name}>`;
  } else {
    usage = `<${name}${propsString ? ' ' + propsString : ''} />`;
  }

  return `${importStatement}\n\n// Usage:\n${usage}`;
}

/**
 * Map Figma properties to component props.
 * @param {object} figmaProps - Properties from Figma component
 * @param {object[]} componentProps - Props from the code component
 * @returns {object[]} Mapped props with name and value
 */
function mapFigmaPropsToComponent(figmaProps, componentProps) {
  if (!figmaProps || typeof figmaProps !== 'object') return [];

  const mapped = [];
  const figmaEntries = Object.entries(figmaProps);

  for (const [figmaKey, figmaValue] of figmaEntries) {
    const normalizedFigmaKey = normalizeName(figmaKey);

    // Find matching component prop
    const matchingProp = componentProps.find((cp) => {
      const normalizedPropName = normalizeName(cp.name);
      return normalizedPropName === normalizedFigmaKey ||
        normalizedPropName.includes(normalizedFigmaKey) ||
        normalizedFigmaKey.includes(normalizedPropName);
    });

    if (matchingProp) {
      mapped.push({
        name: matchingProp.name,
        value: formatPropValue(figmaValue),
        figmaKey,
      });
    } else {
      // Include unmapped Figma props as-is with camelCase name
      const camelName = toCamelCase(figmaKey);
      if (isValidPropName(camelName)) {
        mapped.push({
          name: camelName,
          value: formatPropValue(figmaValue),
          figmaKey,
        });
      }
    }
  }

  return mapped;
}

/**
 * Format a prop value for JSX output.
 */
function formatPropValue(value) {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return 'undefined';
  return JSON.stringify(value);
}

/**
 * Build a JSX props string from mapped props.
 */
function buildPropsString(mappedProps) {
  if (!mappedProps || mappedProps.length === 0) return '';

  return mappedProps
    .filter((p) => p.name !== 'children')
    .map((p) => {
      if (p.value === 'true') return p.name;
      if (typeof p.value === 'string' && p.value.startsWith('"')) {
        return `${p.name}=${p.value}`;
      }
      return `${p.name}={${p.value}}`;
    })
    .join(' ');
}

/**
 * Convert a string to camelCase.
 */
function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}
