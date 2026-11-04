/**
 * Token Formatter
 * Formats DesignToken objects into CSS custom properties, Tailwind config, and JSON.
 * Also parses these formats back into DesignToken objects (round-trip support).
 *
 * DesignToken: { name, category, value, cssVariable, tailwindKey, description }
 * Categories: color, typography, spacing, border, shadow, opacity
 */

/**
 * Format tokens as CSS custom properties.
 * Groups tokens by category with comments.
 * @param {object[]} tokens - Array of DesignToken objects
 * @returns {string} CSS custom properties string
 */
export function formatTokensAsCSS(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return ':root {\n}\n';

  const grouped = groupByCategory(tokens);
  const lines = [':root {'];

  for (const [category, categoryTokens] of Object.entries(grouped)) {
    lines.push(`  /* ${category} */`);
    for (const token of categoryTokens) {
      const variable = token.cssVariable || `--${token.name}`;
      const desc = token.description ? ` /* ${token.description} */` : '';
      lines.push(`  ${variable}: ${token.value};${desc}`);
    }
  }

  lines.push('}');
  return lines.join('\n') + '\n';
}

/**
 * Format tokens as a Tailwind CSS theme.extend configuration object.
 * @param {object[]} tokens - Array of DesignToken objects
 * @returns {string} Tailwind config string (module.exports format)
 */
export function formatTokensAsTailwind(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return 'module.exports = {\n  theme: {\n    extend: {}\n  }\n};\n';
  }

  const extend = {};

  for (const token of tokens) {
    const parts = (token.tailwindKey || token.name).split('.');
    if (parts.length < 2) continue;

    const section = parts[0];
    const key = parts.slice(1).join('.');

    if (!extend[section]) extend[section] = {};
    extend[section][key] = token.value;
  }

  const configStr = buildTailwindConfigString(extend);
  return `module.exports = {\n  theme: {\n    extend: ${configStr}\n  }\n};\n`;
}

/**
 * Format tokens as JSON following the Design Tokens Community Group (DTCG) format.
 * @param {object[]} tokens - Array of DesignToken objects
 * @returns {string} JSON string in DTCG format
 */
export function formatTokensAsJSON(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return JSON.stringify({ tokens: [] }, null, 2);

  const output = {
    tokens: tokens.map((token) => ({
      name: token.name,
      category: token.category,
      $value: token.value,
      $type: mapCategoryToDTCGType(token.category),
      cssVariable: token.cssVariable,
      tailwindKey: token.tailwindKey,
      $description: token.description || '',
    })),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Parse CSS custom properties back into DesignToken objects.
 * @param {string} css - CSS string with custom properties
 * @returns {object[]} Array of DesignToken objects
 */
export function parseTokensFromCSS(css) {
  if (!css || typeof css !== 'string') return [];

  const tokens = [];
  let currentCategory = 'color'; // default category

  const lines = css.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect category from comments like /* color */
    const categoryMatch = trimmed.match(/^\/\*\s*(color|typography|spacing|border|shadow|opacity)\s*\*\/$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1];
      continue;
    }

    // Parse CSS variable declarations
    const varMatch = trimmed.match(/^(--[a-z0-9-]+):\s*(.+?);(?:\s*\/\*\s*(.*?)\s*\*\/)?$/);
    if (varMatch) {
      const [, cssVariable, value, description] = varMatch;
      const name = deriveNameFromCSSVariable(cssVariable);
      const category = deriveCategoryFromVariable(cssVariable, currentCategory);

      tokens.push({
        name,
        category,
        value,
        cssVariable,
        tailwindKey: deriveTailwindKeyFromToken(name, category),
        description: description || '',
      });
    }
  }

  return tokens;
}

/**
 * Parse a Tailwind config string back into DesignToken objects.
 * @param {string} config - Tailwind config string
 * @returns {object[]} Array of DesignToken objects
 */
export function parseTokensFromTailwind(config) {
  if (!config || typeof config !== 'string') return [];

  const tokens = [];

  // Find the extend block by matching balanced braces
  const extendIndex = config.indexOf('extend:');
  if (extendIndex === -1) return [];

  // Find the opening brace after "extend:"
  const afterExtend = config.substring(extendIndex + 'extend:'.length);
  const braceStart = afterExtend.indexOf('{');
  if (braceStart === -1) return [];

  // Extract balanced braces content
  const extendStr = extractBalancedBraces(afterExtend.substring(braceStart));
  if (!extendStr) return [];

  let extendObj;
  try {
    // Use Function constructor to safely evaluate the object literal
    extendObj = new Function(`return (${extendStr})`)();
  } catch {
    return [];
  }

  // Convert the nested object back to tokens
  for (const [section, values] of Object.entries(extendObj)) {
    if (!values || typeof values !== 'object') continue;

    const category = mapTailwindSectionToCategory(section);

    for (const [key, value] of Object.entries(values)) {
      const tailwindKey = `${section}.${key}`;
      const name = deriveNameFromTailwindKey(tailwindKey, category);

      tokens.push({
        name,
        category,
        value: String(value),
        cssVariable: deriveCSSVariableFromToken(name, category),
        tailwindKey,
        description: '',
      });
    }
  }

  return tokens;
}

/**
 * Parse a JSON design tokens string back into DesignToken objects.
 * @param {string} json - JSON string in DTCG format
 * @returns {object[]} Array of DesignToken objects
 */
export function parseTokensFromJSON(json) {
  if (!json || typeof json !== 'string') return [];

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  if (!parsed.tokens || !Array.isArray(parsed.tokens)) return [];

  return parsed.tokens.map((entry) => ({
    name: entry.name || '',
    category: entry.category || mapDTCGTypeToCategory(entry.$type) || 'color',
    value: entry.$value || '',
    cssVariable: entry.cssVariable || deriveCSSVariableFromToken(entry.name, entry.category),
    tailwindKey: entry.tailwindKey || deriveTailwindKeyFromToken(entry.name, entry.category),
    description: entry.$description || '',
  }));
}

// --- Internal helper functions ---

function groupByCategory(tokens) {
  const grouped = {};
  for (const token of tokens) {
    const cat = token.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(token);
  }
  return grouped;
}

function buildTailwindConfigString(extend) {
  const entries = [];

  for (const [section, values] of Object.entries(extend)) {
    const valueEntries = [];
    for (const [key, value] of Object.entries(values)) {
      // Quote the value if it contains special characters
      const quotedValue = JSON.stringify(value);
      valueEntries.push(`        '${key}': ${quotedValue}`);
    }
    entries.push(`      ${section}: {\n${valueEntries.join(',\n')}\n      }`);
  }

  return `{\n${entries.join(',\n')}\n    }`;
}

function mapCategoryToDTCGType(category) {
  const map = {
    color: 'color',
    typography: 'typography',
    spacing: 'dimension',
    border: 'border',
    shadow: 'shadow',
    opacity: 'number',
  };
  return map[category] || 'other';
}

function mapDTCGTypeToCategory(type) {
  const map = {
    color: 'color',
    typography: 'typography',
    dimension: 'spacing',
    border: 'border',
    shadow: 'shadow',
    number: 'opacity',
  };
  return map[type] || 'color';
}

function mapTailwindSectionToCategory(section) {
  const map = {
    colors: 'color',
    fontSize: 'typography',
    fontFamily: 'typography',
    fontWeight: 'typography',
    lineHeight: 'typography',
    letterSpacing: 'typography',
    spacing: 'spacing',
    padding: 'spacing',
    margin: 'spacing',
    gap: 'spacing',
    borderRadius: 'border',
    borderWidth: 'border',
    borderColor: 'border',
    boxShadow: 'shadow',
    opacity: 'opacity',
  };
  return map[section] || 'color';
}

function deriveNameFromCSSVariable(cssVariable) {
  // Remove the -- prefix and category prefix
  let name = cssVariable.replace(/^--/, '');
  // Remove common category prefixes
  name = name.replace(/^(color|font|spacing|radius|border-color|shadow)-/, '');
  return name || cssVariable.replace(/^--/, '');
}

function deriveCategoryFromVariable(cssVariable, fallback) {
  if (cssVariable.startsWith('--color-')) return 'color';
  if (cssVariable.startsWith('--font-')) return 'typography';
  if (cssVariable.startsWith('--spacing-')) return 'spacing';
  if (cssVariable.startsWith('--radius-') || cssVariable.startsWith('--border-color-')) return 'border';
  if (cssVariable.startsWith('--shadow-')) return 'shadow';
  if (cssVariable.startsWith('--opacity-')) return 'opacity';
  return fallback;
}

function deriveTailwindKeyFromToken(name, category) {
  const sectionMap = {
    color: 'colors',
    typography: 'fontSize',
    spacing: 'spacing',
    border: 'borderRadius',
    shadow: 'boxShadow',
    opacity: 'opacity',
  };
  const section = sectionMap[category] || 'colors';
  return `${section}.${name}`;
}

function deriveCSSVariableFromToken(name, category) {
  const prefixMap = {
    color: '--color-',
    typography: '--font-',
    spacing: '--spacing-',
    border: '--radius-',
    shadow: '--shadow-',
    opacity: '--opacity-',
  };
  const prefix = prefixMap[category] || '--';
  return `${prefix}${name}`;
}

function deriveNameFromTailwindKey(tailwindKey, category) {
  const parts = tailwindKey.split('.');
  if (parts.length < 2) return tailwindKey;
  return parts.slice(1).join('-');
}

function extractBalancedBraces(str) {
  if (!str || str[0] !== '{') return null;

  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return str.substring(0, i + 1);
      }
    }
  }
  return null;
}
