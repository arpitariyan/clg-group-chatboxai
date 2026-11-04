/**
 * Asset Extractor
 * Exports images, icons, and SVG code from Figma design nodes.
 * Uses the Figma Images API for rendering and provides optimized SVG output.
 */

import { getFigmaImages } from './figma-api.js';

/**
 * Unsupported SVG effects that require PNG fallback.
 * These effects cannot be reliably represented in inline SVG.
 */
const UNSUPPORTED_SVG_EFFECTS = [
  'LAYER_BLUR',
  'BACKGROUND_BLUR',
  '3D_TRANSFORM',
  'BLEND_MODE_COMPLEX',
];

/**
 * Attributes to remove during SVG optimization.
 */
const UNNECESSARY_SVG_ATTRIBUTES = [
  'xmlns:xlink',
  'xml:space',
  'data-name',
  'id',
  'class',
  'style',
];

/**
 * Elements/attributes that are safe to remove from SVG for optimization.
 */
const UNNECESSARY_SVG_ELEMENTS_REGEX = [
  /<!--[\s\S]*?-->/g, // HTML comments
  /<title>[\s\S]*?<\/title>/g, // Title elements
  /<desc>[\s\S]*?<\/desc>/g, // Description elements
  /<metadata>[\s\S]*?<\/metadata>/g, // Metadata elements
  /\s+data-[\w-]+="[^"]*"/g, // data-* attributes
];

/**
 * Export assets from Figma nodes in the specified format and scale.
 * Supports batch export of multiple nodes.
 *
 * @param {string} accessToken - Figma OAuth access token
 * @param {string} fileKey - The Figma file key
 * @param {string[]} nodeIds - Array of node IDs to export
 * @param {string} [format='png'] - Export format: 'png' or 'svg'
 * @param {number|number[]} [scale=1] - Scale factor(s). For PNG: 1, 2, 3. For SVG: always 1.
 * @returns {Promise<AssetResult[]>} Array of export results
 */
export async function exportAssets(accessToken, fileKey, nodeIds, format = 'png', scale = 1) {
  if (!accessToken || !fileKey || !nodeIds || nodeIds.length === 0) {
    throw new Error('Missing required parameters: accessToken, fileKey, and nodeIds are required');
  }

  const normalizedFormat = format.toLowerCase();
  const results = [];

  if (normalizedFormat === 'svg') {
    // Export as SVG at 1x scale (SVG is resolution-independent)
    const svgResults = await exportSVG(accessToken, fileKey, nodeIds);
    results.push(...svgResults);
  } else if (normalizedFormat === 'png') {
    // Export as PNG at specified scales
    const scales = Array.isArray(scale) ? scale : [scale];
    const pngResults = await exportPNG(accessToken, fileKey, nodeIds, scales);
    results.push(...pngResults);
  } else {
    throw new Error(`Unsupported format: ${format}. Use 'png' or 'svg'.`);
  }

  return results;
}

/**
 * Export nodes as SVG. Falls back to PNG if unsupported effects are detected.
 * @param {string} accessToken
 * @param {string} fileKey
 * @param {string[]} nodeIds
 * @returns {Promise<AssetResult[]>}
 */
async function exportSVG(accessToken, fileKey, nodeIds) {
  const results = [];

  // Request SVG from Figma Images API
  let svgResponse;
  try {
    svgResponse = await getFigmaImages(accessToken, fileKey, nodeIds, 'svg', 1);
  } catch (error) {
    throw new Error(`Failed to export SVG from Figma: ${error.message}`);
  }

  const images = svgResponse.images || {};

  for (const nodeId of nodeIds) {
    const imageUrl = images[nodeId];

    if (!imageUrl) {
      // Fallback to PNG if SVG URL not available
      results.push({
        nodeId,
        format: 'png',
        scale: 1,
        url: null,
        svg: null,
        fallback: true,
        fallbackReason: 'SVG export not available for this node',
        expiresAt: null,
      });
      continue;
    }

    // Fetch the SVG content to check for unsupported effects
    let svgContent;
    try {
      const svgFetch = await fetch(imageUrl);
      if (!svgFetch.ok) {
        throw new Error(`Failed to fetch SVG content: ${svgFetch.status}`);
      }
      svgContent = await svgFetch.text();
    } catch (error) {
      // If we can't fetch SVG content, fall back to PNG
      results.push({
        nodeId,
        format: 'png',
        scale: 1,
        url: null,
        svg: null,
        fallback: true,
        fallbackReason: `Failed to retrieve SVG content: ${error.message}`,
        expiresAt: null,
      });
      continue;
    }

    // Check for unsupported effects
    const hasUnsupportedEffects = checkUnsupportedEffects(svgContent);

    if (hasUnsupportedEffects) {
      // Fall back to PNG and notify user
      const pngFallback = await exportPNG(accessToken, fileKey, [nodeId], [1]);
      results.push({
        ...pngFallback[0],
        fallback: true,
        fallbackReason: 'SVG export contains unsupported effects (complex blurs or 3D transforms). Exported as PNG instead.',
      });
    } else {
      // Optimize and return SVG
      const optimizedSvg = optimizeSVG(svgContent);
      results.push({
        nodeId,
        format: 'svg',
        scale: 1,
        url: imageUrl,
        svg: optimizedSvg,
        fallback: false,
        fallbackReason: null,
        expiresAt: getExpiryTime(),
      });
    }
  }

  return results;
}

/**
 * Export nodes as PNG at specified scales.
 * @param {string} accessToken
 * @param {string} fileKey
 * @param {string[]} nodeIds
 * @param {number[]} scales - Array of scale factors (e.g., [1, 2, 3])
 * @returns {Promise<AssetResult[]>}
 */
async function exportPNG(accessToken, fileKey, nodeIds, scales) {
  const results = [];

  for (const scaleValue of scales) {
    // Validate scale
    const validScale = Math.max(0.01, Math.min(4, scaleValue));

    let pngResponse;
    try {
      pngResponse = await getFigmaImages(accessToken, fileKey, nodeIds, 'png', validScale);
    } catch (error) {
      throw new Error(`Failed to export PNG at ${validScale}x from Figma: ${error.message}`);
    }

    const images = pngResponse.images || {};

    for (const nodeId of nodeIds) {
      const imageUrl = images[nodeId];
      results.push({
        nodeId,
        format: 'png',
        scale: validScale,
        url: imageUrl || null,
        svg: null,
        fallback: false,
        fallbackReason: imageUrl ? null : 'Image export failed for this node',
        expiresAt: imageUrl ? getExpiryTime() : null,
      });
    }
  }

  return results;
}

/**
 * Generate an inline SVG React component from SVG code.
 * Creates a functional component with configurable size and color props.
 *
 * @param {string} svgCode - Raw or optimized SVG markup
 * @param {string} componentName - PascalCase name for the React component
 * @returns {string} React component source code
 */
export function generateSVGComponent(svgCode, componentName) {
  if (!svgCode || typeof svgCode !== 'string') {
    throw new Error('svgCode is required and must be a string');
  }

  if (!componentName || typeof componentName !== 'string') {
    throw new Error('componentName is required and must be a string');
  }

  // Sanitize component name to valid PascalCase identifier
  const safeName = sanitizeComponentName(componentName);

  // Optimize the SVG first
  const optimized = optimizeSVG(svgCode);

  // Extract viewBox from SVG
  const viewBoxMatch = optimized.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  // Extract the inner content of the SVG (everything between <svg> and </svg>)
  const innerContent = extractSVGInnerContent(optimized);

  // Replace fill and stroke colors with currentColor for color prop support
  const colorizedContent = replaceColorsWithCurrentColor(innerContent);

  // Build the React component
  const component = `import React from 'react';

/**
 * ${safeName} icon component
 * Generated from Figma SVG export
 * @param {object} props
 * @param {number|string} [props.size=24] - Icon size (width and height)
 * @param {string} [props.color='currentColor'] - Icon color
 * @param {string} [props.className] - Additional CSS classes
 */
const ${safeName} = ({ size = 24, color = 'currentColor', className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="${viewBox}"
    fill="none"
    color={color}
    className={className}
    {...props}
  >
    ${colorizedContent}
  </svg>
);

${safeName}.displayName = '${safeName}';

export default ${safeName};
`;

  return component;
}

/**
 * Optimize raw SVG by removing unnecessary attributes, elements, and whitespace.
 *
 * @param {string} rawSVG - Raw SVG markup from Figma
 * @returns {string} Optimized SVG markup
 */
export function optimizeSVG(rawSVG) {
  if (!rawSVG || typeof rawSVG !== 'string') {
    return '';
  }

  let svg = rawSVG.trim();

  // Remove XML declaration if present
  svg = svg.replace(/<\?xml[^?]*\?>\s*/g, '');

  // Remove DOCTYPE if present
  svg = svg.replace(/<!DOCTYPE[^>]*>\s*/g, '');

  // Remove unnecessary elements (comments, title, desc, metadata)
  for (const regex of UNNECESSARY_SVG_ELEMENTS_REGEX) {
    svg = svg.replace(regex, '');
  }

  // Remove unnecessary attributes from all elements
  for (const attr of UNNECESSARY_SVG_ATTRIBUTES) {
    // Match attribute with double quotes
    const attrRegex = new RegExp(`\\s+${attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}="[^"]*"`, 'g');
    svg = svg.replace(attrRegex, '');
  }

  // Remove empty groups
  svg = svg.replace(/<g\s*>\s*<\/g>/g, '');

  // Collapse multiple whitespace/newlines into single space
  svg = svg.replace(/\s{2,}/g, ' ');

  // Remove whitespace between tags
  svg = svg.replace(/>\s+</g, '><');

  // Trim leading/trailing whitespace within the SVG
  svg = svg.trim();

  return svg;
}

// --- Internal helper functions ---

/**
 * Check if SVG content contains unsupported effects that require PNG fallback.
 */
function checkUnsupportedEffects(svgContent) {
  if (!svgContent) return false;

  // Check for complex filter effects that indicate unsupported rendering
  const hasComplexBlur = /<feGaussianBlur[^>]*stdDeviation="[^"]*\s[^"]*"/.test(svgContent);
  const hasMultipleFilters = (svgContent.match(/<filter/g) || []).length > 3;
  const has3DTransform = /transform.*(?:matrix3d|perspective|rotateX|rotateY|rotateZ)/i.test(svgContent);
  const hasComplexBlendMode = /<feBlend[^>]*mode="(?!normal|multiply|screen)[^"]*"/i.test(svgContent);

  return hasComplexBlur || hasMultipleFilters || has3DTransform || hasComplexBlendMode;
}

/**
 * Extract the inner content between <svg> and </svg> tags.
 */
function extractSVGInnerContent(svg) {
  // Match everything between the opening <svg ...> and closing </svg>
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return match ? match[1].trim() : svg;
}

/**
 * Replace hardcoded fill and stroke colors with currentColor.
 * Preserves 'none' values and gradient references.
 */
function replaceColorsWithCurrentColor(svgContent) {
  // Replace fill colors (but not fill="none" or fill="url(...)")
  let result = svgContent.replace(
    /fill="(?!none|url\()([^"]+)"/g,
    'fill="currentColor"'
  );

  // Replace stroke colors (but not stroke="none" or stroke="url(...)")
  result = result.replace(
    /stroke="(?!none|url\()([^"]+)"/g,
    'stroke="currentColor"'
  );

  return result;
}

/**
 * Sanitize a string into a valid PascalCase React component name.
 */
function sanitizeComponentName(name) {
  // Remove file extensions
  let clean = name.replace(/\.\w+$/, '');

  // Replace non-alphanumeric characters with spaces
  clean = clean.replace(/[^a-zA-Z0-9]/g, ' ');

  // Convert to PascalCase
  clean = clean
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Ensure it starts with a letter
  if (!/^[A-Z]/.test(clean)) {
    clean = 'Icon' + clean;
  }

  return clean || 'SvgIcon';
}

/**
 * Get expiry time for download URLs (30 minutes from now).
 * Figma image URLs are typically valid for ~30 minutes.
 */
function getExpiryTime() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}
