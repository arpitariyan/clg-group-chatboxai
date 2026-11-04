/**
 * Figma Node Parser
 * Transforms raw Figma API node data into structured FigmaNode objects.
 * Handles all supported node types: FRAME, COMPONENT, TEXT, RECTANGLE,
 * GROUP, INSTANCE, VECTOR, ELLIPSE.
 */

const SUPPORTED_NODE_TYPES = [
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'TEXT',
  'RECTANGLE',
  'GROUP',
  'INSTANCE',
  'VECTOR',
  'ELLIPSE',
];

/**
 * Parse a raw Figma API node into a structured FigmaNode object.
 * Recursively parses all children.
 * @param {object} rawNode - Raw node data from Figma API
 * @returns {object} FigmaNode
 */
export function parseFigmaNode(rawNode) {
  if (!rawNode || typeof rawNode !== 'object') {
    return null;
  }

  const node = {
    id: rawNode.id || '',
    name: rawNode.name || '',
    type: rawNode.type || 'UNKNOWN',
    visible: rawNode.visible !== false,
    bounds: extractBounds(rawNode),
    constraints: extractConstraints(rawNode),
    fills: extractFills(rawNode.fills),
    strokes: extractStrokes(rawNode.strokes),
    effects: extractEffects(rawNode.effects),
    cornerRadius: extractCornerRadius(rawNode),
    opacity: rawNode.opacity ?? 1,
    blendMode: rawNode.blendMode || 'NORMAL',
    autoLayout: detectAutoLayout(rawNode),
    children: [],
    text: null,
    componentProperties: null,
    variantProperties: null,
  };

  // Extract text properties for TEXT nodes
  if (rawNode.type === 'TEXT') {
    node.text = extractTextProperties(rawNode);
  }

  // Extract component properties for COMPONENT and INSTANCE nodes
  if (rawNode.type === 'COMPONENT' || rawNode.type === 'INSTANCE') {
    node.componentProperties = extractComponentProperties(rawNode);
  }

  // Extract variant properties
  if (rawNode.type === 'COMPONENT_SET' || rawNode.type === 'COMPONENT') {
    node.variantProperties = extractVariantProperties(rawNode);
  }

  // Recursively parse children
  if (Array.isArray(rawNode.children)) {
    node.children = rawNode.children
      .map((child) => parseFigmaNode(child))
      .filter(Boolean);
  }

  return node;
}

/**
 * Flatten a node tree into a flat array of FigmaNode objects.
 * Performs depth-first traversal.
 * @param {object} rootNode - Parsed FigmaNode (or raw node to parse first)
 * @returns {object[]} Flat array of FigmaNode objects
 */
export function flattenNodeTree(rootNode) {
  if (!rootNode) return [];

  // If raw node, parse it first
  const parsed = rootNode.bounds !== undefined ? rootNode : parseFigmaNode(rootNode);
  if (!parsed) return [];

  const result = [parsed];

  if (Array.isArray(parsed.children)) {
    for (const child of parsed.children) {
      result.push(...flattenNodeTree(child));
    }
  }

  return result;
}

/**
 * Extract all TEXT nodes from a node tree.
 * @param {object} node - Parsed FigmaNode or raw node
 * @returns {object[]} Array of TextNode objects
 */
export function extractTextNodes(node) {
  const allNodes = flattenNodeTree(node);
  return allNodes
    .filter((n) => n.type === 'TEXT' && n.text)
    .map((n) => ({
      id: n.id,
      name: n.name,
      content: n.text.content,
      style: n.text.style,
      bounds: n.bounds,
      truncation: n.text.truncation,
      autoResize: n.text.autoResize,
      textDecoration: n.text.textDecoration,
    }));
}

/**
 * Extract all nodes with image fills from a node tree.
 * @param {object} node - Parsed FigmaNode or raw node
 * @returns {object[]} Array of ImageNode objects
 */
export function extractImageNodes(node) {
  const allNodes = flattenNodeTree(node);
  return allNodes
    .filter((n) => hasImageFill(n.fills))
    .map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      bounds: n.bounds,
      imageFills: n.fills.filter((f) => f.type === 'IMAGE'),
    }));
}

/**
 * Detect auto-layout properties from a raw or parsed node.
 * @param {object} node - Raw Figma node or parsed node
 * @returns {object|null} AutoLayoutInfo or null if no auto-layout
 */
export function detectAutoLayout(node) {
  if (!node) return null;

  // Check for auto-layout indicators
  const layoutMode = node.layoutMode || node.autoLayout?.direction;
  if (!layoutMode || layoutMode === 'NONE') return null;

  return {
    direction: layoutMode === 'VERTICAL' ? 'column' : 'row',
    alignment: mapAlignment(node.primaryAxisAlignItems, node.counterAxisAlignItems),
    padding: {
      top: node.paddingTop ?? node.padding ?? 0,
      right: node.paddingRight ?? node.padding ?? 0,
      bottom: node.paddingBottom ?? node.padding ?? 0,
      left: node.paddingLeft ?? node.padding ?? 0,
    },
    spacing: node.itemSpacing ?? 0,
    primaryAxisSizing: node.primaryAxisSizingMode || 'AUTO',
    counterAxisSizing: node.counterAxisSizingMode || 'AUTO',
    wrap: node.layoutWrap === 'WRAP',
  };
}

/**
 * Detect component variants from a node (typically a COMPONENT_SET).
 * Parses variant names to extract variant properties and values.
 * @param {object} node - Raw or parsed Figma node
 * @returns {object[]} Array of VariantInfo objects
 */
export function detectComponentVariants(node) {
  if (!node) return [];

  const variants = [];

  // For COMPONENT_SET nodes, children are the variants
  const children = node.children || [];
  for (const child of children) {
    const rawChild = child.type ? child : parseFigmaNode(child);
    if (!rawChild) continue;

    if (rawChild.type === 'COMPONENT') {
      const variantProps = parseVariantName(rawChild.name);
      if (Object.keys(variantProps).length > 0) {
        variants.push({
          id: rawChild.id,
          name: rawChild.name,
          properties: variantProps,
          isInteractiveState: detectInteractiveState(variantProps),
        });
      }
    }
  }

  // Also check componentPropertyDefinitions on the node itself
  if (node.componentPropertyDefinitions) {
    const propDefs = node.componentPropertyDefinitions;
    for (const [key, def] of Object.entries(propDefs)) {
      if (def.type === 'VARIANT') {
        const existing = variants.find((v) => v.properties[key]);
        if (!existing) {
          variants.push({
            id: node.id,
            name: key,
            properties: { [key]: def.defaultValue || '' },
            isInteractiveState: detectInteractiveState({ [key]: def.defaultValue }),
          });
        }
      }
    }
  }

  return variants;
}

// --- Internal helper functions ---

function extractBounds(rawNode) {
  const box = rawNode.absoluteBoundingBox || rawNode.absoluteRenderBounds;
  if (!box) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return {
    x: box.x ?? 0,
    y: box.y ?? 0,
    width: box.width ?? 0,
    height: box.height ?? 0,
  };
}

function extractConstraints(rawNode) {
  const constraints = rawNode.constraints;
  if (!constraints) {
    return { horizontal: 'LEFT', vertical: 'TOP' };
  }
  return {
    horizontal: constraints.horizontal || 'LEFT',
    vertical: constraints.vertical || 'TOP',
  };
}

function extractFills(fills) {
  if (!Array.isArray(fills)) return [];

  return fills
    .filter((fill) => fill.visible !== false)
    .map((fill) => {
      const base = {
        type: fill.type || 'SOLID',
        opacity: fill.opacity ?? 1,
        visible: fill.visible !== false,
      };

      if (fill.type === 'SOLID' && fill.color) {
        base.color = colorToHex(fill.color);
        base.rgba = colorToRgba(fill.color, fill.opacity);
      } else if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
        base.gradientStops = (fill.gradientStops || []).map((stop) => ({
          color: colorToHex(stop.color),
          position: stop.position ?? 0,
        }));
        base.gradientHandlePositions = fill.gradientHandlePositions || [];
      } else if (fill.type === 'IMAGE') {
        base.imageRef = fill.imageRef || null;
        base.scaleMode = fill.scaleMode || 'FILL';
      }

      return base;
    });
}

function extractStrokes(strokes) {
  if (!Array.isArray(strokes)) return [];

  return strokes
    .filter((stroke) => stroke.visible !== false)
    .map((stroke) => ({
      type: stroke.type || 'SOLID',
      color: stroke.color ? colorToHex(stroke.color) : '#000000',
      rgba: stroke.color ? colorToRgba(stroke.color, stroke.opacity) : 'rgba(0,0,0,1)',
      opacity: stroke.opacity ?? 1,
    }));
}

function extractEffects(effects) {
  if (!Array.isArray(effects)) return [];

  return effects
    .filter((effect) => effect.visible !== false)
    .map((effect) => {
      const base = {
        type: effect.type || 'DROP_SHADOW',
        visible: effect.visible !== false,
      };

      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        base.color = effect.color ? colorToHex(effect.color) : '#000000';
        base.rgba = effect.color ? colorToRgba(effect.color, effect.color.a) : 'rgba(0,0,0,0.25)';
        base.offset = { x: effect.offset?.x ?? 0, y: effect.offset?.y ?? 0 };
        base.radius = effect.radius ?? 0;
        base.spread = effect.spread ?? 0;
      } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
        base.radius = effect.radius ?? 0;
      }

      return base;
    });
}

function extractCornerRadius(rawNode) {
  if (typeof rawNode.cornerRadius === 'number') {
    return {
      topLeft: rawNode.cornerRadius,
      topRight: rawNode.cornerRadius,
      bottomRight: rawNode.cornerRadius,
      bottomLeft: rawNode.cornerRadius,
    };
  }

  if (rawNode.rectangleCornerRadii) {
    const [topLeft, topRight, bottomRight, bottomLeft] = rawNode.rectangleCornerRadii;
    return { topLeft, topRight, bottomRight, bottomLeft };
  }

  return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
}

function extractTextProperties(rawNode) {
  return {
    content: rawNode.characters || '',
    style: {
      fontFamily: rawNode.style?.fontFamily || rawNode.fontName?.family || '',
      fontSize: rawNode.style?.fontSize || rawNode.fontSize || 16,
      fontWeight: rawNode.style?.fontWeight || rawNode.fontWeight || 400,
      lineHeight: extractLineHeight(rawNode),
      letterSpacing: extractLetterSpacing(rawNode),
      textAlign: (rawNode.style?.textAlignHorizontal || rawNode.textAlignHorizontal || 'LEFT').toLowerCase(),
      color: rawNode.fills?.[0]?.color ? colorToHex(rawNode.fills[0].color) : '#000000',
    },
    truncation: rawNode.textTruncation || 'DISABLED',
    autoResize: rawNode.textAutoResize || 'NONE',
    textDecoration: rawNode.textDecoration || 'NONE',
  };
}

function extractLineHeight(rawNode) {
  const lh = rawNode.style?.lineHeightPx || rawNode.lineHeight;
  if (typeof lh === 'number') return lh;
  if (lh && typeof lh === 'object') {
    if (lh.unit === 'PIXELS') return lh.value;
    if (lh.unit === 'PERCENT') return lh.value;
  }
  return null;
}

function extractLetterSpacing(rawNode) {
  const ls = rawNode.style?.letterSpacing || rawNode.letterSpacing;
  if (typeof ls === 'number') return ls;
  if (ls && typeof ls === 'object') {
    if (ls.unit === 'PIXELS') return ls.value;
    if (ls.unit === 'PERCENT') return ls.value;
  }
  return 0;
}

function extractComponentProperties(rawNode) {
  const props = {};

  if (rawNode.componentProperties) {
    for (const [key, value] of Object.entries(rawNode.componentProperties)) {
      props[key] = {
        type: value.type || 'TEXT',
        value: value.value ?? value.defaultValue ?? '',
      };
    }
  }

  if (rawNode.componentId) {
    props._componentId = rawNode.componentId;
  }

  return Object.keys(props).length > 0 ? props : null;
}

function extractVariantProperties(rawNode) {
  // From componentPropertyDefinitions (COMPONENT_SET)
  if (rawNode.componentPropertyDefinitions) {
    const variantProps = {};
    for (const [key, def] of Object.entries(rawNode.componentPropertyDefinitions)) {
      if (def.type === 'VARIANT') {
        variantProps[key] = {
          defaultValue: def.defaultValue || '',
          values: def.variantOptions || [],
        };
      }
    }
    if (Object.keys(variantProps).length > 0) return variantProps;
  }

  // From variant name parsing (individual COMPONENT within a set)
  const parsed = parseVariantName(rawNode.name);
  if (Object.keys(parsed).length > 0) return parsed;

  return null;
}

/**
 * Parse a Figma variant name like "Size=Large, State=Hover" into key-value pairs.
 */
function parseVariantName(name) {
  if (!name || typeof name !== 'string') return {};

  const props = {};
  // Figma variant names use "Property=Value, Property=Value" format
  const parts = name.split(',').map((s) => s.trim());

  for (const part of parts) {
    const eqIndex = part.indexOf('=');
    if (eqIndex > 0) {
      const key = part.substring(0, eqIndex).trim();
      const value = part.substring(eqIndex + 1).trim();
      if (key && value) {
        props[key] = value;
      }
    }
  }

  return props;
}

/**
 * Detect if variant properties indicate an interactive state.
 */
function detectInteractiveState(properties) {
  if (!properties || typeof properties !== 'object') return null;

  const stateKeywords = ['default', 'hover', 'pressed', 'focused', 'disabled', 'active', 'selected'];
  const stateKeys = ['state', 'status', 'interaction', 'mode'];

  for (const [key, value] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();
    const lowerValue = typeof value === 'string' ? value.toLowerCase() : '';

    // Check if the key is a state-related property
    if (stateKeys.some((sk) => lowerKey.includes(sk))) {
      if (stateKeywords.includes(lowerValue)) {
        return lowerValue;
      }
    }

    // Check if the value itself is a state keyword
    if (stateKeywords.includes(lowerValue)) {
      return lowerValue;
    }
  }

  return null;
}

function mapAlignment(primaryAxis, counterAxis) {
  return {
    primary: mapAxisAlignment(primaryAxis),
    counter: mapAxisAlignment(counterAxis),
  };
}

function mapAxisAlignment(alignment) {
  switch (alignment) {
    case 'MIN':
      return 'flex-start';
    case 'MAX':
      return 'flex-end';
    case 'CENTER':
      return 'center';
    case 'SPACE_BETWEEN':
      return 'space-between';
    default:
      return 'flex-start';
  }
}

function colorToHex(color) {
  if (!color) return '#000000';
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function colorToRgba(color, opacity) {
  if (!color) return 'rgba(0,0,0,1)';
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = opacity ?? color.a ?? 1;
  return `rgba(${r},${g},${b},${Number(a).toFixed(2)})`;
}

function hasImageFill(fills) {
  if (!Array.isArray(fills)) return false;
  return fills.some((f) => f.type === 'IMAGE');
}
