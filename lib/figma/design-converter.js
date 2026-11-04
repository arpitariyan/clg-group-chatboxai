/**
 * Design Converter
 * Converts parsed Figma nodes into production-ready React components with Tailwind CSS.
 * Uses AI (Google GenAI) for intelligent code generation with Tailwind mapping utilities.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeDesignContext } from './design-context-analyzer';
import { flattenNodeTree, extractTextNodes, extractImageNodes } from './figma-node-parser';

/**
 * Map auto-layout properties to Tailwind flexbox/grid classes.
 * @param {object} autoLayout - AutoLayout info from parsed node
 * @returns {string} Tailwind classes string
 */
export function mapAutoLayoutToTailwind(autoLayout) {
  if (!autoLayout) return '';

  const classes = [];

  // Display
  classes.push('flex');

  // Direction
  if (autoLayout.direction === 'column') {
    classes.push('flex-col');
  }
  // row is default for flex, no class needed

  // Wrap
  if (autoLayout.wrap) {
    classes.push('flex-wrap');
  }

  // Primary axis alignment (justify-content)
  const justifyMap = {
    'flex-start': 'justify-start',
    'flex-end': 'justify-end',
    'center': 'justify-center',
    'space-between': 'justify-between',
  };
  if (autoLayout.alignment?.primary && justifyMap[autoLayout.alignment.primary]) {
    classes.push(justifyMap[autoLayout.alignment.primary]);
  }

  // Counter axis alignment (align-items)
  const alignMap = {
    'flex-start': 'items-start',
    'flex-end': 'items-end',
    'center': 'items-center',
  };
  if (autoLayout.alignment?.counter && alignMap[autoLayout.alignment.counter]) {
    classes.push(alignMap[autoLayout.alignment.counter]);
  }

  // Gap (spacing)
  if (autoLayout.spacing > 0) {
    classes.push(mapNumberToTailwind('gap', autoLayout.spacing));
  }

  // Padding
  if (autoLayout.padding) {
    const { top, right, bottom, left } = autoLayout.padding;
    if (top === right && right === bottom && bottom === left && top > 0) {
      classes.push(mapNumberToTailwind('p', top));
    } else {
      if (top > 0) classes.push(mapNumberToTailwind('pt', top));
      if (right > 0) classes.push(mapNumberToTailwind('pr', right));
      if (bottom > 0) classes.push(mapNumberToTailwind('pb', bottom));
      if (left > 0) classes.push(mapNumberToTailwind('pl', left));
    }
  }

  return classes.join(' ');
}

/**
 * Map a fill (color) to Tailwind background/text class.
 * @param {object} fill - Fill object from parsed node
 * @returns {string} Tailwind class string
 */
export function mapFillToTailwind(fill) {
  if (!fill || fill.type !== 'SOLID' || !fill.color) return '';

  const hex = fill.color.toLowerCase();
  const tailwindColor = hexToTailwindColor(hex);

  if (tailwindColor) {
    return `bg-${tailwindColor}`;
  }

  // Fallback to arbitrary value
  return `bg-[${hex}]`;
}

/**
 * Map typography style to Tailwind text utility classes.
 * @param {object} style - Typography style object
 * @returns {string} Tailwind classes string
 */
export function mapTypographyToTailwind(style) {
  if (!style) return '';

  const classes = [];

  // Font size
  if (style.fontSize) {
    classes.push(mapFontSize(style.fontSize));
  }

  // Font weight
  if (style.fontWeight) {
    classes.push(mapFontWeight(style.fontWeight));
  }

  // Line height
  if (style.lineHeight) {
    classes.push(mapLineHeight(style.lineHeight, style.fontSize));
  }

  // Letter spacing
  if (style.letterSpacing && style.letterSpacing !== 0) {
    classes.push(mapLetterSpacing(style.letterSpacing));
  }

  // Text alignment
  if (style.textAlign && style.textAlign !== 'left') {
    const alignMap = { center: 'text-center', right: 'text-right', justify: 'text-justify' };
    if (alignMap[style.textAlign]) {
      classes.push(alignMap[style.textAlign]);
    }
  }

  // Text color
  if (style.color && style.color !== '#000000') {
    const tailwindColor = hexToTailwindColor(style.color);
    if (tailwindColor) {
      classes.push(`text-${tailwindColor}`);
    } else {
      classes.push(`text-[${style.color}]`);
    }
  }

  return classes.join(' ');
}

/**
 * Map effects (shadows, blurs) to Tailwind classes.
 * @param {object[]} effects - Array of effect objects
 * @returns {string} Tailwind classes string
 */
export function mapEffectsToTailwind(effects) {
  if (!Array.isArray(effects) || effects.length === 0) return '';

  const classes = [];

  for (const effect of effects) {
    if (effect.type === 'DROP_SHADOW') {
      classes.push(mapShadowToTailwind(effect));
    } else if (effect.type === 'INNER_SHADOW') {
      classes.push('shadow-inner');
    } else if (effect.type === 'LAYER_BLUR') {
      classes.push(mapBlurToTailwind(effect.radius));
    } else if (effect.type === 'BACKGROUND_BLUR') {
      classes.push(mapBackdropBlurToTailwind(effect.radius));
    }
  }

  return classes.join(' ');
}

/**
 * Build the AI prompt for converting a Figma node to React code.
 * @param {object} node - Parsed FigmaNode
 * @param {object} options - Conversion options
 * @returns {string} The full prompt for the AI model
 */
export function buildConversionPrompt(node, options = {}) {
  const {
    conversionType = 'component',
    componentName = 'GeneratedComponent',
    includeResponsive = true,
    includeAccessibility = true,
  } = options;

  const context = analyzeDesignContext(node);
  const textNodes = extractTextNodes(node);
  const imageNodes = extractImageNodes(node);
  const allNodes = flattenNodeTree(node);

  // Build node description
  const nodeDescription = buildNodeDescription(node, context);
  const textContent = textNodes.map((t) => `- "${t.content}" (${t.style?.fontSize || 16}px, weight ${t.style?.fontWeight || 400})`).join('\n');
  const imageInfo = imageNodes.map((img) => `- Image "${img.name}" (${img.bounds.width}x${img.bounds.height})`).join('\n');

  // Build variant/props info
  let variantInfo = '';
  if (context.variants.hasVariants) {
    variantInfo = `\nComponent Variants (implement as props):\n`;
    for (const [key, values] of Object.entries(context.variants.properties)) {
      variantInfo += `- ${key}: ${values.join(', ')}\n`;
    }
  }

  // Build interactive states info
  let statesInfo = '';
  if (context.interactiveStates.hasInteractiveStates) {
    statesInfo = `\nInteractive States (use Tailwind modifiers):\n`;
    statesInfo += context.interactiveStates.detectedStates
      .map((s) => `- ${s}`)
      .join('\n');
  }

  // Build layout classes hint
  const layoutClasses = mapAutoLayoutToTailwind(node.autoLayout);
  const effectClasses = mapEffectsToTailwind(node.effects || []);

  const prompt = `You are an expert React/Next.js developer. Convert the following Figma design node into a production-ready React functional component using Tailwind CSS.

## Component Details
- Name: ${componentName}
- Type: ${conversionType} (${conversionType === 'page' ? 'full page layout with all sections' : 'single reusable component'})
- Root node: "${node.name}" (${node.type}, ${node.bounds?.width || 0}x${node.bounds?.height || 0}px)
- Total child elements: ${allNodes.length}

## Layout Information
${nodeDescription}
${layoutClasses ? `- Suggested layout classes: ${layoutClasses}` : ''}
${effectClasses ? `- Suggested effect classes: ${effectClasses}` : ''}

## Text Content
${textContent || 'No text nodes found'}

## Images
${imageInfo || 'No images found'}
${variantInfo}${statesInfo}

## Requirements
1. Generate a valid React functional component with "export default"
2. Use Tailwind CSS utility classes for ALL styling (no inline styles, no CSS modules)
3. Map auto-layout to flexbox classes (flex, flex-col, gap-*, items-*, justify-*)
4. Map colors to Tailwind color classes or arbitrary values [#hex]
5. Map typography to text-*, font-*, leading-*, tracking-* classes
${includeResponsive ? '6. Add responsive breakpoint classes (sm:, md:, lg:, xl:) for layout changes' : ''}
${includeAccessibility ? '7. Include ARIA labels for interactive elements, use semantic HTML (h1-h6, p, nav, main, section, article, button)' : ''}
8. For images, use Next.js Image component with appropriate width, height, and alt text
9. Preserve all text content exactly as provided
10. Use proper component structure with clear prop types via JSDoc or destructuring
${context.variants.hasVariants ? '11. Implement variants as component props with conditional rendering' : ''}
${context.interactiveStates.hasInteractiveStates ? '12. Use Tailwind state modifiers (hover:, focus:, active:, disabled:) for interactive states' : ''}

## Output Format
Return ONLY the complete React component code. No explanations, no markdown code blocks.
Start with import statements and end with the export default statement.
Use this exact structure:
import Image from 'next/image';

export default function ${componentName}(${context.variants.hasVariants ? '{ ' + context.variants.suggestedProps.map((p) => p.name).join(', ') + ' }' : ''}) {
  return (
    // component JSX here
  );
}`;

  return prompt;
}

/**
 * Convert a parsed Figma node to production-ready React code using AI.
 * @param {object} parsedNode - Parsed FigmaNode object
 * @param {object} options - Conversion options
 * @returns {Promise<object>} CodeOutput with code, componentName, imports
 */
export async function convertNodeToCode(parsedNode, options = {}) {
  if (!parsedNode) {
    throw new Error('A parsed Figma node is required for conversion');
  }

  const {
    conversionType = 'component',
    componentName: rawName,
  } = options;

  // Generate component name from node name if not provided
  const componentName = rawName || generateComponentName(parsedNode.name);
  const mergedOptions = { ...options, componentName, conversionType };

  // Build the prompt
  const prompt = buildConversionPrompt(parsedNode, mergedOptions);

  // Call AI to generate code
  const generatedCode = await generateCodeWithAI(prompt);

  // Extract imports from generated code
  const imports = extractImports(generatedCode);

  return {
    code: generatedCode,
    componentName,
    imports,
    conversionType,
    metadata: {
      nodeId: parsedNode.id,
      nodeName: parsedNode.name,
      nodeType: parsedNode.type,
      generatedAt: new Date().toISOString(),
    },
  };
}

// --- AI Generation ---

/**
 * Generate React code using Google GenAI.
 * Retries once with simplified prompt on failure.
 * @param {string} prompt - The full conversion prompt
 * @returns {Promise<string>} Generated React component code
 */
async function generateCodeWithAI(prompt) {
  const apiKey =
    process.env.GOOGLE_AI_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('AI API key not configured. Set GOOGLE_AI_KEY or equivalent env variable.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (error) {
    // Retry once with simplified prompt
    console.warn('[DesignConverter] First AI attempt failed, retrying with simplified prompt:', error.message);
    const simplifiedPrompt = prompt.replace(/## Requirements[\s\S]*?## Output Format/, '## Output Format');
    try {
      result = await model.generateContent(simplifiedPrompt);
    } catch (retryError) {
      throw new Error(`AI code generation failed after retry: ${retryError.message}`);
    }
  }

  let code = result.response.text().trim();

  // Strip markdown code blocks if present
  code = stripCodeBlocks(code);

  return code;
}

// --- Helper Functions ---

/**
 * Build a human-readable description of the node's layout for the AI prompt.
 */
function buildNodeDescription(node, context) {
  const lines = [];
  const layout = context.layout;

  lines.push(`- Display: ${layout.display}`);
  if (layout.flexDirection) lines.push(`- Flex direction: ${layout.flexDirection}`);
  if (layout.alignItems) lines.push(`- Align items: ${layout.alignItems}`);
  if (layout.justifyContent) lines.push(`- Justify content: ${layout.justifyContent}`);
  if (layout.gap > 0) lines.push(`- Gap: ${layout.gap}px`);
  if (layout.width > 0) lines.push(`- Width: ${layout.width}px`);
  if (layout.height > 0) lines.push(`- Height: ${layout.height}px`);

  const padding = layout.padding;
  if (padding.top || padding.right || padding.bottom || padding.left) {
    lines.push(`- Padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`);
  }

  // Responsive info
  if (context.responsive.suggestedBreakpoints.length > 0) {
    lines.push(`- Suggested breakpoints: ${context.responsive.suggestedBreakpoints.map((b) => b.name).join(', ')}`);
  }

  // Corner radius
  if (node.cornerRadius) {
    const { topLeft, topRight, bottomRight, bottomLeft } = node.cornerRadius;
    if (topLeft > 0 || topRight > 0 || bottomRight > 0 || bottomLeft > 0) {
      if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
        lines.push(`- Border radius: ${topLeft}px`);
      } else {
        lines.push(`- Border radius: ${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`);
      }
    }
  }

  // Fills
  if (Array.isArray(node.fills) && node.fills.length > 0) {
    const solidFills = node.fills.filter((f) => f.type === 'SOLID');
    if (solidFills.length > 0) {
      lines.push(`- Background: ${solidFills.map((f) => f.color).join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate a valid React component name from a Figma node name.
 */
function generateComponentName(nodeName) {
  if (!nodeName) return 'GeneratedComponent';

  // Remove special characters, convert to PascalCase
  const cleaned = nodeName
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase());

  return cleaned || 'GeneratedComponent';
}

/**
 * Strip markdown code block wrappers from AI output.
 */
function stripCodeBlocks(code) {
  // Remove ```jsx or ```javascript or ``` wrappers
  const codeBlockMatch = code.match(/^```(?:jsx|javascript|js|tsx|react)?\s*\n?([\s\S]*?)```\s*$/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return code;
}

/**
 * Extract import statements from generated code.
 */
function extractImports(code) {
  const importLines = code.match(/^import\s+.*$/gm) || [];
  return importLines;
}

/**
 * Map a pixel value to the nearest Tailwind spacing class.
 */
function mapNumberToTailwind(prefix, value) {
  // Tailwind spacing scale: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96
  // Each unit = 4px (e.g., 4 = 1rem = 16px)
  const pxToTailwind = {
    0: '0', 1: 'px', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5',
    12: '3', 14: '3.5', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8',
    36: '9', 40: '10', 44: '11', 48: '12', 56: '14', 64: '16',
    80: '20', 96: '24', 112: '28', 128: '32', 144: '36', 160: '40',
    176: '44', 192: '48', 208: '52', 224: '56', 240: '60', 256: '64',
    288: '72', 320: '80', 384: '96',
  };

  // Find closest match
  const closest = Object.keys(pxToTailwind)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev));

  if (Math.abs(closest - value) <= 2) {
    return `${prefix}-${pxToTailwind[closest]}`;
  }

  // Use arbitrary value for non-standard sizes
  return `${prefix}-[${value}px]`;
}

/**
 * Map font size in px to Tailwind text-* class.
 */
function mapFontSize(fontSize) {
  const sizeMap = {
    12: 'text-xs', 14: 'text-sm', 16: 'text-base', 18: 'text-lg',
    20: 'text-xl', 24: 'text-2xl', 30: 'text-3xl', 36: 'text-4xl',
    48: 'text-5xl', 60: 'text-6xl', 72: 'text-7xl', 96: 'text-8xl',
    128: 'text-9xl',
  };

  // Find closest match
  const closest = Object.keys(sizeMap)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - fontSize) < Math.abs(prev - fontSize) ? curr : prev));

  if (Math.abs(closest - fontSize) <= 1) {
    return sizeMap[closest];
  }

  return `text-[${fontSize}px]`;
}

/**
 * Map font weight to Tailwind font-* class.
 */
function mapFontWeight(weight) {
  const weightMap = {
    100: 'font-thin', 200: 'font-extralight', 300: 'font-light',
    400: 'font-normal', 500: 'font-medium', 600: 'font-semibold',
    700: 'font-bold', 800: 'font-extrabold', 900: 'font-black',
  };
  return weightMap[weight] || `font-[${weight}]`;
}

/**
 * Map line height to Tailwind leading-* class.
 */
function mapLineHeight(lineHeight, fontSize) {
  if (!lineHeight || !fontSize) return '';

  const ratio = lineHeight / fontSize;

  if (ratio <= 1) return 'leading-none';
  if (ratio <= 1.25) return 'leading-tight';
  if (ratio <= 1.375) return 'leading-snug';
  if (ratio <= 1.5) return 'leading-normal';
  if (ratio <= 1.625) return 'leading-relaxed';
  return 'leading-loose';
}

/**
 * Map letter spacing to Tailwind tracking-* class.
 */
function mapLetterSpacing(letterSpacing) {
  if (letterSpacing <= -0.5) return 'tracking-tighter';
  if (letterSpacing < 0) return 'tracking-tight';
  if (letterSpacing === 0) return '';
  if (letterSpacing <= 0.5) return 'tracking-wide';
  if (letterSpacing <= 1) return 'tracking-wider';
  return 'tracking-widest';
}

/**
 * Map a shadow effect to Tailwind shadow class.
 */
function mapShadowToTailwind(effect) {
  if (!effect) return 'shadow';

  const blur = effect.radius || 0;
  const offsetY = effect.offset?.y || 0;

  if (blur <= 2 && offsetY <= 1) return 'shadow-sm';
  if (blur <= 6 && offsetY <= 3) return 'shadow';
  if (blur <= 15 && offsetY <= 6) return 'shadow-md';
  if (blur <= 25 && offsetY <= 10) return 'shadow-lg';
  if (blur <= 50 && offsetY <= 25) return 'shadow-xl';
  return 'shadow-2xl';
}

/**
 * Map blur radius to Tailwind blur class.
 */
function mapBlurToTailwind(radius) {
  if (!radius || radius <= 0) return '';
  if (radius <= 4) return 'blur-sm';
  if (radius <= 8) return 'blur';
  if (radius <= 12) return 'blur-md';
  if (radius <= 16) return 'blur-lg';
  if (radius <= 24) return 'blur-xl';
  if (radius <= 40) return 'blur-2xl';
  return 'blur-3xl';
}

/**
 * Map backdrop blur radius to Tailwind backdrop-blur class.
 */
function mapBackdropBlurToTailwind(radius) {
  if (!radius || radius <= 0) return '';
  if (radius <= 4) return 'backdrop-blur-sm';
  if (radius <= 8) return 'backdrop-blur';
  if (radius <= 12) return 'backdrop-blur-md';
  if (radius <= 16) return 'backdrop-blur-lg';
  if (radius <= 24) return 'backdrop-blur-xl';
  if (radius <= 40) return 'backdrop-blur-2xl';
  return 'backdrop-blur-3xl';
}

/**
 * Map a hex color to the closest Tailwind named color.
 * Returns null if no close match found.
 */
function hexToTailwindColor(hex) {
  if (!hex) return null;

  const colorMap = {
    '#ffffff': 'white',
    '#000000': 'black',
    '#f8fafc': 'slate-50', '#f1f5f9': 'slate-100', '#e2e8f0': 'slate-200',
    '#cbd5e1': 'slate-300', '#94a3b8': 'slate-400', '#64748b': 'slate-500',
    '#475569': 'slate-600', '#334155': 'slate-700', '#1e293b': 'slate-800',
    '#0f172a': 'slate-900',
    '#f9fafb': 'gray-50', '#f3f4f6': 'gray-100', '#e5e7eb': 'gray-200',
    '#d1d5db': 'gray-300', '#9ca3af': 'gray-400', '#6b7280': 'gray-500',
    '#4b5563': 'gray-600', '#374151': 'gray-700', '#1f2937': 'gray-800',
    '#111827': 'gray-900',
    '#fef2f2': 'red-50', '#fee2e2': 'red-100', '#fecaca': 'red-200',
    '#fca5a5': 'red-300', '#f87171': 'red-400', '#ef4444': 'red-500',
    '#dc2626': 'red-600', '#b91c1c': 'red-700', '#991b1b': 'red-800',
    '#eff6ff': 'blue-50', '#dbeafe': 'blue-100', '#bfdbfe': 'blue-200',
    '#93c5fd': 'blue-300', '#60a5fa': 'blue-400', '#3b82f6': 'blue-500',
    '#2563eb': 'blue-600', '#1d4ed8': 'blue-700', '#1e40af': 'blue-800',
    '#ecfdf5': 'green-50', '#d1fae5': 'green-100', '#a7f3d0': 'green-200',
    '#6ee7b7': 'green-300', '#34d399': 'green-400', '#10b981': 'green-500',
    '#059669': 'green-600', '#047857': 'green-700', '#065f46': 'green-800',
    '#fefce8': 'yellow-50', '#fef9c3': 'yellow-100', '#fef08a': 'yellow-200',
    '#fde047': 'yellow-300', '#facc15': 'yellow-400', '#eab308': 'yellow-500',
    '#ca8a04': 'yellow-600', '#a16207': 'yellow-700',
    '#faf5ff': 'purple-50', '#f3e8ff': 'purple-100', '#e9d5ff': 'purple-200',
    '#d8b4fe': 'purple-300', '#c084fc': 'purple-400', '#a855f7': 'purple-500',
    '#9333ea': 'purple-600', '#7e22ce': 'purple-700',
  };

  const lower = hex.toLowerCase();
  if (colorMap[lower]) return colorMap[lower];

  return null;
}
