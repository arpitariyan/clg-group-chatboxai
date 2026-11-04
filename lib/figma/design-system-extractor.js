/**
 * Design System Extractor
 * Extracts design tokens from Figma file styles and variables.
 * Produces DesignToken objects for colors, typography, spacing, borders, and shadows.
 */

import { getFigmaFile, getFigmaFileStyles, getFigmaVariables } from './figma-api.js';
import { parseFigmaNode, flattenNodeTree } from './figma-node-parser.js';

/**
 * Extract a complete design system from a Figma file.
 * @param {string} accessToken - Figma OAuth access token
 * @param {string} fileKey - The Figma file key
 * @returns {Promise<object>} DesignSystemOutput with tokens by category and metadata
 */
export async function extractDesignSystem(accessToken, fileKey) {
  // Fetch file data, styles, and variables in parallel
  const [fileData, stylesData, variablesData] = await Promise.all([
    getFigmaFile(accessToken, fileKey),
    getFigmaFileStyles(accessToken, fileKey).catch(() => ({ meta: { styles: [] } })),
    getFigmaVariables(accessToken, fileKey).catch(() => ({ meta: { variables: {}, variableCollections: {} } })),
  ]);

  const styles = stylesData?.meta?.styles || [];
  const variables = variablesData?.meta?.variables || {};
  const variableCollections = variablesData?.meta?.variableCollections || {};

  // Parse the full node tree for spacing/border/shadow extraction
  const rootNode = fileData?.document;
  const allNodes = rootNode ? flattenNodeTree(parseFigmaNode(rootNode)) : [];

  // Extract style definitions from the file's local styles
  const localStyles = fileData?.styles || {};

  // Extract tokens by category
  const colorTokens = extractColorTokens(localStyles, variables, variableCollections);
  const typographyTokens = extractTypographyTokens(localStyles, fileData);
  const spacingTokens = extractSpacingTokens(allNodes);
  const borderTokens = extractBorderTokens(allNodes);
  const shadowTokens = extractShadowTokens(allNodes);

  const allTokens = [
    ...colorTokens,
    ...typographyTokens,
    ...spacingTokens,
    ...borderTokens,
    ...shadowTokens,
  ];

  return {
    tokens: allTokens,
    categories: {
      color: colorTokens,
      typography: typographyTokens,
      spacing: spacingTokens,
      border: borderTokens,
      shadow: shadowTokens,
    },
    metadata: {
      fileName: fileData?.name || '',
      fileKey,
      lastModified: fileData?.lastModified || '',
      totalTokens: allTokens.length,
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Extract color tokens from Figma styles and variables.
 * @param {object} styles - Local styles from the Figma file
 * @param {object} variables - Variables from the Figma file
 * @param {object} variableCollections - Variable collections metadata
 * @returns {object[]} Array of DesignToken objects
 */
export function extractColorTokens(styles, variables = {}, variableCollections = {}) {
  const tokens = [];

  // Extract from local styles (paint styles)
  if (styles && typeof styles === 'object') {
    for (const [styleId, styleDef] of Object.entries(styles)) {
      if (styleDef.styleType === 'FILL' || styleDef.style_type === 'FILL') {
        const name = styleDef.name || styleDef.key || styleId;
        const tokenName = sanitizeTokenName(name);
        tokens.push({
          name: tokenName,
          category: 'color',
          value: styleDef.description || name,
          cssVariable: `--color-${tokenName}`,
          tailwindKey: `colors.${tokenName.replace(/-/g, '.')}`,
          description: styleDef.description || `Color style: ${name}`,
        });
      }
    }
  }

  // Extract from variables (color type)
  if (variables && typeof variables === 'object') {
    for (const [varId, varDef] of Object.entries(variables)) {
      if (varDef.resolvedType === 'COLOR') {
        const name = varDef.name || varId;
        const tokenName = sanitizeTokenName(name);

        // Get the value from the variable's value by mode
        let colorValue = '';
        if (varDef.valuesByMode) {
          const modeValues = Object.values(varDef.valuesByMode);
          if (modeValues.length > 0) {
            const firstValue = modeValues[0];
            if (firstValue && typeof firstValue === 'object' && 'r' in firstValue) {
              colorValue = rgbaToHex(firstValue.r, firstValue.g, firstValue.b, firstValue.a);
            }
          }
        }

        tokens.push({
          name: tokenName,
          category: 'color',
          value: colorValue || name,
          cssVariable: `--color-${tokenName}`,
          tailwindKey: `colors.${tokenName.replace(/-/g, '.')}`,
          description: varDef.description || `Color variable: ${name}`,
        });
      }
    }
  }

  return tokens;
}

/**
 * Extract typography tokens from Figma text styles.
 * @param {object} styles - Local styles from the Figma file
 * @param {object} fileData - Full file data for resolving text style details
 * @returns {object[]} Array of DesignToken objects
 */
export function extractTypographyTokens(styles, fileData = null) {
  const tokens = [];

  if (!styles || typeof styles !== 'object') return tokens;

  for (const [styleId, styleDef] of Object.entries(styles)) {
    if (styleDef.styleType === 'TEXT' || styleDef.style_type === 'TEXT') {
      const name = styleDef.name || styleDef.key || styleId;
      const tokenName = sanitizeTokenName(name);

      // Build typography value object
      const typographyValue = {
        fontFamily: styleDef.fontFamily || 'Inter',
        fontSize: styleDef.fontSize || 16,
        fontWeight: styleDef.fontWeight || 400,
        lineHeight: styleDef.lineHeight || 1.5,
        letterSpacing: styleDef.letterSpacing || 0,
      };

      tokens.push({
        name: tokenName,
        category: 'typography',
        value: JSON.stringify(typographyValue),
        cssVariable: `--font-${tokenName}`,
        tailwindKey: `fontSize.${tokenName}`,
        description: styleDef.description || `Typography style: ${name}`,
      });
    }
  }

  return tokens;
}

/**
 * Extract spacing tokens from node auto-layout properties.
 * Identifies common spacing values used across the design.
 * @param {object[]} nodes - Flat array of parsed FigmaNode objects
 * @returns {object[]} Array of DesignToken objects
 */
export function extractSpacingTokens(nodes) {
  if (!Array.isArray(nodes)) return [];

  const spacingValues = new Map(); // value → count

  for (const node of nodes) {
    if (node.autoLayout) {
      const { padding, spacing } = node.autoLayout;

      // Track padding values
      if (padding) {
        trackSpacing(spacingValues, padding.top);
        trackSpacing(spacingValues, padding.right);
        trackSpacing(spacingValues, padding.bottom);
        trackSpacing(spacingValues, padding.left);
      }

      // Track item spacing (gap)
      if (spacing > 0) {
        trackSpacing(spacingValues, spacing);
      }
    }
  }

  // Convert to tokens, sorted by value
  const tokens = [];
  const sortedValues = [...spacingValues.entries()]
    .filter(([value]) => value > 0)
    .sort((a, b) => a[0] - b[0]);

  for (const [value, count] of sortedValues) {
    // Only include spacing values used more than once (patterns)
    if (count >= 1) {
      const name = `spacing-${value}`;
      tokens.push({
        name,
        category: 'spacing',
        value: `${value}px`,
        cssVariable: `--spacing-${value}`,
        tailwindKey: `spacing.${value}`,
        description: `Spacing: ${value}px (used ${count} times)`,
      });
    }
  }

  return tokens;
}

/**
 * Extract border tokens from node strokes and corner radii.
 * @param {object[]} nodes - Flat array of parsed FigmaNode objects
 * @returns {object[]} Array of DesignToken objects
 */
export function extractBorderTokens(nodes) {
  if (!Array.isArray(nodes)) return [];

  const borderRadii = new Map(); // value → count
  const borderWidths = new Map(); // value → count
  const borderColors = new Map(); // hex → count
  const tokens = [];

  for (const node of nodes) {
    // Track corner radii
    if (node.cornerRadius) {
      const { topLeft, topRight, bottomRight, bottomLeft } = node.cornerRadius;
      const values = [topLeft, topRight, bottomRight, bottomLeft].filter((v) => v > 0);
      for (const v of values) {
        borderRadii.set(v, (borderRadii.get(v) || 0) + 1);
      }
    }

    // Track stroke widths and colors
    if (Array.isArray(node.strokes) && node.strokes.length > 0) {
      for (const stroke of node.strokes) {
        if (stroke.color) {
          borderColors.set(stroke.color, (borderColors.get(stroke.color) || 0) + 1);
        }
      }
    }
  }

  // Generate border-radius tokens
  const sortedRadii = [...borderRadii.entries()]
    .filter(([value]) => value > 0)
    .sort((a, b) => a[0] - b[0]);

  for (const [value, count] of sortedRadii) {
    if (count >= 1) {
      const name = `radius-${value}`;
      tokens.push({
        name,
        category: 'border',
        value: `${value}px`,
        cssVariable: `--radius-${value}`,
        tailwindKey: `borderRadius.${value}`,
        description: `Border radius: ${value}px (used ${count} times)`,
      });
    }
  }

  // Generate border-color tokens
  const sortedColors = [...borderColors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Limit to top 20 border colors

  for (const [color, count] of sortedColors) {
    const name = `border-color-${sanitizeTokenName(color)}`;
    tokens.push({
      name,
      category: 'border',
      value: color,
      cssVariable: `--${name}`,
      tailwindKey: `borderColor.${sanitizeTokenName(color)}`,
      description: `Border color: ${color} (used ${count} times)`,
    });
  }

  return tokens;
}

/**
 * Extract shadow tokens from node effects.
 * @param {object[]} nodes - Flat array of parsed FigmaNode objects (or effects array)
 * @returns {object[]} Array of DesignToken objects
 */
export function extractShadowTokens(nodes) {
  if (!Array.isArray(nodes)) return [];

  const shadowMap = new Map(); // serialized shadow → { value, count }
  const tokens = [];

  for (const node of nodes) {
    const effects = node.effects || (node.type ? [] : [node]); // Support both nodes and raw effects

    for (const effect of effects) {
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        const shadowValue = buildShadowValue(effect);
        const key = shadowValue;

        if (!shadowMap.has(key)) {
          shadowMap.set(key, { value: shadowValue, effect, count: 0 });
        }
        shadowMap.get(key).count++;
      }
    }
  }

  let index = 0;
  const sortedShadows = [...shadowMap.entries()].sort((a, b) => b[1].count - a[1].count);

  for (const [, { value, effect, count }] of sortedShadows) {
    const name = `shadow-${index + 1}`;
    const isInner = effect.type === 'INNER_SHADOW';

    tokens.push({
      name,
      category: 'shadow',
      value,
      cssVariable: `--${name}`,
      tailwindKey: `boxShadow.${name.replace('shadow-', '')}`,
      description: `${isInner ? 'Inner shadow' : 'Drop shadow'} (used ${count} times)`,
    });
    index++;
  }

  return tokens;
}

// --- Internal helper functions ---

function sanitizeTokenName(name) {
  if (!name || typeof name !== 'string') return 'unnamed';
  return name
    .toLowerCase()
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unnamed';
}

function trackSpacing(map, value) {
  if (typeof value === 'number' && value > 0) {
    map.set(value, (map.get(value) || 0) + 1);
  }
}

function rgbaToHex(r, g, b, a = 1) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a < 1) {
    return `${hex}${toHex(a)}`;
  }
  return hex;
}

function buildShadowValue(effect) {
  const x = effect.offset?.x ?? 0;
  const y = effect.offset?.y ?? 0;
  const blur = effect.radius ?? 0;
  const spread = effect.spread ?? 0;
  const color = effect.rgba || effect.color || 'rgba(0,0,0,0.25)';
  const inset = effect.type === 'INNER_SHADOW' ? 'inset ' : '';
  return `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
}
