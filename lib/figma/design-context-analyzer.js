/**
 * Design Context Analyzer
 * Extracts layout, responsive, variant, and interactive state information
 * from parsed FigmaNode objects. Provides detailed design context beyond
 * visual appearance to inform code generation decisions.
 */

import { parseFigmaNode, detectComponentVariants, flattenNodeTree } from './figma-node-parser';

/**
 * Extract complete layout information from a node.
 * Includes flex direction, alignment, justify content, wrap, and z-index.
 * @param {object} node - Parsed FigmaNode or raw Figma node
 * @returns {object} LayoutInfo
 */
export function extractLayoutInfo(node) {
  const parsed = ensureParsed(node);
  if (!parsed) return getDefaultLayoutInfo();

  const autoLayout = parsed.autoLayout;

  return {
    display: autoLayout ? 'flex' : 'block',
    flexDirection: autoLayout?.direction || null,
    alignItems: autoLayout?.alignment?.counter || null,
    justifyContent: autoLayout?.alignment?.primary || null,
    flexWrap: autoLayout?.wrap ? 'wrap' : 'nowrap',
    gap: autoLayout?.spacing ?? 0,
    padding: autoLayout?.padding || { top: 0, right: 0, bottom: 0, left: 0 },
    width: parsed.bounds.width,
    height: parsed.bounds.height,
    position: determinePosition(parsed),
    zIndex: determineZIndex(parsed),
    overflow: determineOverflow(parsed),
  };
}

/**
 * Extract responsive behavior from a node.
 * Includes constraints, min/max dimensions, and auto-layout resize behavior.
 * @param {object} node - Parsed FigmaNode or raw Figma node
 * @returns {object} ResponsiveInfo
 */
export function extractResponsiveInfo(node) {
  const parsed = ensureParsed(node);
  if (!parsed) return getDefaultResponsiveInfo();

  const rawNode = node.layoutMode !== undefined ? node : null;

  return {
    constraints: {
      horizontal: parsed.constraints.horizontal,
      vertical: parsed.constraints.vertical,
    },
    sizing: {
      primaryAxis: parsed.autoLayout?.primaryAxisSizing || 'FIXED',
      counterAxis: parsed.autoLayout?.counterAxisSizing || 'FIXED',
    },
    minWidth: rawNode?.minWidth ?? null,
    maxWidth: rawNode?.maxWidth ?? null,
    minHeight: rawNode?.minHeight ?? null,
    maxHeight: rawNode?.maxHeight ?? null,
    resizeBehavior: mapConstraintsToCSS(parsed.constraints),
    suggestedBreakpoints: suggestBreakpoints(parsed),
  };
}

/**
 * Extract component variants and their properties from a node.
 * @param {object} node - Parsed FigmaNode or raw Figma node
 * @returns {object} VariantAnalysis
 */
export function extractVariantInfo(node) {
  const parsed = ensureParsed(node);
  if (!parsed) return { variants: [], properties: {}, hasVariants: false };

  const variants = detectComponentVariants(node.componentPropertyDefinitions ? node : parsed);

  // Collect all unique property keys and their possible values
  const properties = {};
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.properties)) {
      if (!properties[key]) {
        properties[key] = new Set();
      }
      properties[key].add(value);
    }
  }

  // Convert Sets to arrays
  const propertiesMap = {};
  for (const [key, values] of Object.entries(properties)) {
    propertiesMap[key] = Array.from(values);
  }

  return {
    variants,
    properties: propertiesMap,
    hasVariants: variants.length > 0,
    suggestedProps: generateSuggestedProps(propertiesMap),
  };
}

/**
 * Extract interactive states from a node and its variants.
 * Identifies default, hover, pressed, focused, and disabled states.
 * @param {object} node - Parsed FigmaNode or raw Figma node
 * @returns {object} InteractiveStateInfo
 */
export function extractInteractiveStates(node) {
  const parsed = ensureParsed(node);
  if (!parsed) return getDefaultInteractiveStates();

  const states = {
    default: null,
    hover: null,
    pressed: null,
    focused: null,
    disabled: null,
  };

  // Check variants for interactive states
  const variants = detectComponentVariants(node.componentPropertyDefinitions ? node : parsed);

  for (const variant of variants) {
    const state = variant.isInteractiveState;
    if (state && states.hasOwnProperty(state)) {
      states[state] = {
        variantId: variant.id,
        variantName: variant.name,
        properties: variant.properties,
      };
    }
  }

  // Also check children for state-named layers
  if (Array.isArray(parsed.children)) {
    for (const child of parsed.children) {
      const stateName = detectStateFromName(child.name);
      if (stateName && states.hasOwnProperty(stateName) && !states[stateName]) {
        states[stateName] = {
          variantId: child.id,
          variantName: child.name,
          properties: {},
        };
      }
    }
  }

  const detectedStates = Object.entries(states)
    .filter(([, value]) => value !== null)
    .map(([key]) => key);

  return {
    states,
    detectedStates,
    hasInteractiveStates: detectedStates.length > 1,
    tailwindModifiers: mapStatesToTailwind(detectedStates),
  };
}

/**
 * Extract text properties including truncation, auto-resize, and decoration.
 * @param {object} node - Parsed FigmaNode or raw Figma node
 * @returns {object} TextContextInfo
 */
export function extractTextContext(node) {
  const parsed = ensureParsed(node);
  if (!parsed) return getDefaultTextContext();

  // If this is a text node directly
  if (parsed.type === 'TEXT' && parsed.text) {
    return buildTextContext(parsed);
  }

  // Otherwise, find text nodes in children
  const allNodes = flattenNodeTree(parsed);
  const textNodes = allNodes.filter((n) => n.type === 'TEXT' && n.text);

  return {
    textNodes: textNodes.map((tn) => buildTextContext(tn)),
    totalTextNodes: textNodes.length,
    hasTextContent: textNodes.length > 0,
  };
}

/**
 * Extract image fills and asset information from a node.
 * @param {object} node - Parsed FigmaNode or raw Figma node
 * @returns {object} ImageContextInfo
 */
export function extractImageContext(node) {
  const parsed = ensureParsed(node);
  if (!parsed) return { images: [], hasImages: false };

  const allNodes = flattenNodeTree(parsed);
  const imageNodes = allNodes.filter((n) =>
    Array.isArray(n.fills) && n.fills.some((f) => f.type === 'IMAGE')
  );

  const images = imageNodes.map((imgNode) => {
    const imageFill = imgNode.fills.find((f) => f.type === 'IMAGE');
    return {
      id: imgNode.id,
      name: imgNode.name,
      bounds: imgNode.bounds,
      scaleMode: imageFill?.scaleMode || 'FILL',
      imageRef: imageFill?.imageRef || null,
      suggestedExportFormats: suggestExportFormats(imgNode),
      dimensions: {
        width: imgNode.bounds.width,
        height: imgNode.bounds.height,
        aspectRatio: imgNode.bounds.height > 0
          ? (imgNode.bounds.width / imgNode.bounds.height).toFixed(2)
          : '1.00',
      },
    };
  });

  return {
    images,
    hasImages: images.length > 0,
    totalImages: images.length,
  };
}

/**
 * Perform a full design context analysis on a node.
 * Combines all extraction methods into a comprehensive context object.
 * @param {object} node - Parsed FigmaNode or raw Figma node
 * @returns {object} Full DesignContext
 */
export function analyzeDesignContext(node) {
  return {
    layout: extractLayoutInfo(node),
    responsive: extractResponsiveInfo(node),
    variants: extractVariantInfo(node),
    interactiveStates: extractInteractiveStates(node),
    text: extractTextContext(node),
    images: extractImageContext(node),
  };
}

// --- Internal helper functions ---

function ensureParsed(node) {
  if (!node) return null;
  // If it already has the parsed structure (bounds object with x/y/width/height)
  if (node.bounds && typeof node.bounds.width === 'number') {
    return node;
  }
  // Otherwise parse it
  return parseFigmaNode(node);
}

function getDefaultLayoutInfo() {
  return {
    display: 'block',
    flexDirection: null,
    alignItems: null,
    justifyContent: null,
    flexWrap: 'nowrap',
    gap: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    width: 0,
    height: 0,
    position: 'relative',
    zIndex: 'auto',
    overflow: 'visible',
  };
}

function getDefaultResponsiveInfo() {
  return {
    constraints: { horizontal: 'LEFT', vertical: 'TOP' },
    sizing: { primaryAxis: 'FIXED', counterAxis: 'FIXED' },
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
    resizeBehavior: { width: 'fixed', height: 'fixed' },
    suggestedBreakpoints: [],
  };
}

function getDefaultInteractiveStates() {
  return {
    states: { default: null, hover: null, pressed: null, focused: null, disabled: null },
    detectedStates: [],
    hasInteractiveStates: false,
    tailwindModifiers: [],
  };
}

function getDefaultTextContext() {
  return {
    textNodes: [],
    totalTextNodes: 0,
    hasTextContent: false,
  };
}

function determinePosition(parsed) {
  // Nodes with absolute positioning constraints
  if (parsed.constraints.horizontal === 'SCALE' || parsed.constraints.vertical === 'SCALE') {
    return 'absolute';
  }
  // If parent has auto-layout, children are in flow
  return 'relative';
}

function determineZIndex(parsed) {
  // Figma doesn't have explicit z-index; layer order determines stacking
  return 'auto';
}

function determineOverflow(parsed) {
  // Check if node clips content (clipsContent property in raw data)
  if (parsed._clipsContent) return 'hidden';
  return 'visible';
}

function mapConstraintsToCSS(constraints) {
  const result = { width: 'fixed', height: 'fixed' };

  switch (constraints.horizontal) {
    case 'LEFT_RIGHT':
      result.width = 'stretch';
      break;
    case 'SCALE':
      result.width = 'percentage';
      break;
    case 'CENTER':
      result.width = 'fixed-centered';
      break;
    default:
      result.width = 'fixed';
  }

  switch (constraints.vertical) {
    case 'TOP_BOTTOM':
      result.height = 'stretch';
      break;
    case 'SCALE':
      result.height = 'percentage';
      break;
    case 'CENTER':
      result.height = 'fixed-centered';
      break;
    default:
      result.height = 'fixed';
  }

  return result;
}

function suggestBreakpoints(parsed) {
  const width = parsed.bounds.width;
  const breakpoints = [];

  // Suggest breakpoints based on common design widths
  if (width >= 1440) breakpoints.push({ name: 'xl', width: 1280 });
  if (width >= 1024) breakpoints.push({ name: 'lg', width: 1024 });
  if (width >= 768) breakpoints.push({ name: 'md', width: 768 });
  if (width >= 640) breakpoints.push({ name: 'sm', width: 640 });

  return breakpoints;
}

function generateSuggestedProps(propertiesMap) {
  const props = [];

  for (const [key, values] of Object.entries(propertiesMap)) {
    const propName = key.toLowerCase().replace(/\s+/g, '');
    props.push({
      name: propName,
      type: values.length <= 5 ? 'enum' : 'string',
      values,
      defaultValue: values[0] || '',
    });
  }

  return props;
}

function detectStateFromName(name) {
  if (!name || typeof name !== 'string') return null;

  const lower = name.toLowerCase();
  const stateKeywords = ['default', 'hover', 'pressed', 'focused', 'disabled', 'active'];

  for (const keyword of stateKeywords) {
    if (lower.includes(keyword)) {
      return keyword === 'active' ? 'pressed' : keyword;
    }
  }

  return null;
}

function mapStatesToTailwind(states) {
  const modifierMap = {
    hover: 'hover:',
    pressed: 'active:',
    focused: 'focus:',
    disabled: 'disabled:',
  };

  return states
    .filter((s) => s !== 'default' && modifierMap[s])
    .map((s) => modifierMap[s]);
}

function buildTextContext(textNode) {
  return {
    id: textNode.id,
    name: textNode.name,
    content: textNode.text?.content || '',
    style: textNode.text?.style || {},
    truncation: textNode.text?.truncation || 'DISABLED',
    autoResize: textNode.text?.autoResize || 'NONE',
    textDecoration: textNode.text?.textDecoration || 'NONE',
    semanticTag: suggestSemanticTag(textNode),
  };
}

function suggestSemanticTag(textNode) {
  const fontSize = textNode.text?.style?.fontSize || 16;
  const fontWeight = textNode.text?.style?.fontWeight || 400;

  // Suggest semantic HTML tag based on text properties
  if (fontSize >= 32 && fontWeight >= 600) return 'h1';
  if (fontSize >= 24 && fontWeight >= 600) return 'h2';
  if (fontSize >= 20 && fontWeight >= 500) return 'h3';
  if (fontSize >= 18 && fontWeight >= 500) return 'h4';
  if (fontSize >= 16 && fontWeight >= 600) return 'h5';
  if (fontSize < 14) return 'span';
  return 'p';
}

function suggestExportFormats(imgNode) {
  const formats = ['png'];
  const width = imgNode.bounds?.width || 0;
  const height = imgNode.bounds?.height || 0;

  // Small images (likely icons) → suggest SVG
  if (width <= 64 && height <= 64) {
    formats.unshift('svg');
  }

  // Large images → suggest webp for optimization
  if (width > 200 || height > 200) {
    formats.push('webp');
  }

  return formats;
}
