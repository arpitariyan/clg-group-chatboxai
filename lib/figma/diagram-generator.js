/**
 * Diagram Generator
 * AI-powered diagram structure generation and SVG rendering.
 * Supports: flowchart, architecture, ER, Gantt, wireframe, mindmap, user flow, state diagram
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const SUPPORTED_DIAGRAM_TYPES = [
  'flowchart',
  'architecture',
  'er',
  'gantt',
  'wireframe',
  'mindmap',
  'user-flow',
  'state-diagram',
];

const DIAGRAM_TYPE_KEYWORDS = {
  flowchart: ['flow', 'flowchart', 'process', 'steps', 'workflow', 'decision'],
  architecture: ['architecture', 'system', 'service', 'microservice', 'infrastructure', 'deploy'],
  er: ['entity', 'relationship', 'database', 'schema', 'table', 'er diagram', 'erd'],
  gantt: ['gantt', 'timeline', 'schedule', 'project plan', 'milestones', 'phases'],
  wireframe: ['wireframe', 'layout', 'ui', 'mockup', 'screen', 'page layout'],
  mindmap: ['mind map', 'mindmap', 'brainstorm', 'ideas', 'concept map', 'topics'],
  'user-flow': ['user flow', 'user journey', 'navigation', 'user path', 'ux flow'],
  'state-diagram': ['state', 'state machine', 'fsm', 'transitions', 'states'],
};

/**
 * Infers the most appropriate diagram type from a text prompt.
 * Analyzes keywords and context to determine the best match.
 * @param {string} prompt - The user's text prompt
 * @returns {string} The inferred diagram type
 */
export function inferDiagramType(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return 'flowchart';
  }

  const lowerPrompt = prompt.toLowerCase();
  let bestMatch = 'flowchart';
  let highestScore = 0;

  for (const [type, keywords] of Object.entries(DIAGRAM_TYPE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        // Longer keywords get higher weight (more specific)
        score += keyword.length;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = type;
    }
  }

  return bestMatch;
}

/**
 * Generates a diagram from a text prompt using AI.
 * @param {string} prompt - The user's text description of the diagram
 * @param {string} diagramType - The type of diagram ('auto' to infer)
 * @param {object} [style={}] - Optional style overrides (colors, fonts, etc.)
 * @returns {Promise<object>} DiagramOutput with nodes, edges, svg, and metadata
 */
export async function generateDiagram(prompt, diagramType = 'auto', style = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('A text prompt is required to generate a diagram');
  }

  // Resolve diagram type
  const resolvedType = diagramType === 'auto'
    ? inferDiagramType(prompt)
    : diagramType;

  if (!SUPPORTED_DIAGRAM_TYPES.includes(resolvedType)) {
    throw new Error(
      `Unsupported diagram type: "${resolvedType}". Supported types: ${SUPPORTED_DIAGRAM_TYPES.join(', ')}`
    );
  }

  // Generate structured diagram data via AI
  const diagramData = await generateDiagramStructure(prompt, resolvedType);

  // Layout the nodes based on diagram type
  const positionedNodes = layoutNodes(diagramData.nodes, diagramData.edges, resolvedType);

  // Render to SVG
  const svg = renderDiagramToSVG(positionedNodes, diagramData.edges, {
    ...getDefaultStyle(resolvedType),
    ...style,
  });

  return {
    diagramType: resolvedType,
    nodes: positionedNodes,
    edges: diagramData.edges,
    svg,
    metadata: {
      prompt,
      inferredType: diagramType === 'auto' ? resolvedType : null,
      nodeCount: positionedNodes.length,
      edgeCount: diagramData.edges.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Uses AI to generate structured diagram data (nodes and edges) from a prompt.
 * @param {string} prompt - The user's text description
 * @param {string} diagramType - The resolved diagram type
 * @returns {Promise<{nodes: object[], edges: object[]}>}
 */
async function generateDiagramStructure(prompt, diagramType) {
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

  const systemPrompt = buildDiagramPrompt(prompt, diagramType);

  const result = await model.generateContent(systemPrompt);
  const responseText = result.response.text().trim();

  // Parse JSON from AI response
  let diagramData;
  try {
    diagramData = JSON.parse(responseText);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      diagramData = JSON.parse(jsonMatch[1].trim());
    } else {
      // Try to find raw JSON object
      const rawMatch = responseText.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        diagramData = JSON.parse(rawMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as diagram structure');
      }
    }
  }

  // Validate structure
  if (!Array.isArray(diagramData.nodes) || !Array.isArray(diagramData.edges)) {
    throw new Error('AI response missing required nodes or edges arrays');
  }

  return diagramData;
}

/**
 * Builds the AI prompt for diagram structure generation.
 * @param {string} userPrompt - The user's description
 * @param {string} diagramType - The diagram type
 * @returns {string} The full prompt for the AI model
 */
function buildDiagramPrompt(userPrompt, diagramType) {
  const typeInstructions = getDiagramTypeInstructions(diagramType);

  return `You are a diagram structure generator. Generate a structured JSON representation of a ${diagramType} diagram based on the user's description.

${typeInstructions}

User's description: "${userPrompt}"

Return ONLY valid JSON (no markdown, no code blocks, no extra text) with this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "process|decision|terminal|data|connector|entity",
      "label": "Node label text",
      "metadata": {}
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "source": "source_node_id",
      "target": "target_node_id",
      "label": "optional edge label",
      "direction": "forward|backward|bidirectional"
    }
  ]
}

Rules:
- Each node must have a unique id, a type, and a label
- Each edge must reference valid source and target node ids
- Use descriptive labels that match the user's intent
- Generate between 3-15 nodes depending on complexity
- Ensure the diagram is logically connected (no orphan nodes unless intentional)`;
}

/**
 * Returns type-specific instructions for the AI prompt.
 */
function getDiagramTypeInstructions(diagramType) {
  const instructions = {
    flowchart: `For flowcharts:
- Use "terminal" type for start/end nodes
- Use "decision" type for yes/no or conditional branching points
- Use "process" type for action/step nodes
- Use "data" type for input/output data nodes
- Edges from decision nodes should have labels like "Yes"/"No" or "True"/"False"
- Ensure there is exactly one start terminal and at least one end terminal`,

    architecture: `For architecture diagrams:
- Use "process" type for services/servers/components
- Use "data" type for databases/storage
- Use "connector" type for load balancers, API gateways, message queues
- Add a "group" field in metadata to indicate logical groupings (e.g., "frontend", "backend", "data")
- Edge labels should describe the communication (e.g., "REST API", "gRPC", "WebSocket")`,

    er: `For ER (Entity-Relationship) diagrams:
- Use "entity" type for all entities/tables
- Add "attributes" array in metadata with attribute objects: { "name": "attr_name", "type": "string|int|bool|date", "isPrimary": true/false }
- Edge labels must indicate cardinality: "1:1", "1:N", or "M:N"
- Use "connector" type for relationship diamonds if needed`,

    gantt: `For Gantt charts:
- Use "process" type for all tasks
- Add metadata: { "startDay": number, "duration": number, "dependencies": ["task_id"] }
- Edges represent dependencies between tasks
- Order nodes chronologically`,

    wireframe: `For wireframes:
- Use "process" type for UI sections (header, sidebar, content, footer)
- Use "data" type for form fields, inputs
- Use "terminal" type for buttons/CTAs
- Add metadata: { "width": "full|half|third", "height": "auto|fixed" }
- Edges represent visual containment or flow`,

    mindmap: `For mind maps:
- Use "terminal" type for the central/root topic
- Use "process" type for main branches
- Use "data" type for sub-branches/leaves
- Edges connect parent to child topics
- No edge labels needed for mind maps`,

    'user-flow': `For user flows:
- Use "terminal" type for entry/exit points
- Use "process" type for screens/pages
- Use "decision" type for user choices/branches
- Use "data" type for system actions/notifications
- Edge labels describe user actions (e.g., "clicks button", "submits form")`,

    'state-diagram': `For state diagrams:
- Use "terminal" type for initial and final states
- Use "process" type for regular states
- Use "decision" type for composite/nested states
- Edge labels describe transitions/events (e.g., "submit", "timeout", "error")
- Ensure there is one initial state`,
  };

  return instructions[diagramType] || instructions.flowchart;
}

/**
 * Positions nodes based on diagram type and edge relationships.
 * @param {object[]} nodes - Array of diagram nodes
 * @param {object[]} edges - Array of diagram edges
 * @param {string} diagramType - The diagram type for layout strategy
 * @returns {object[]} Nodes with position and dimensions added
 */
export function layoutNodes(nodes, edges, diagramType) {
  if (!nodes || nodes.length === 0) return [];

  const NODE_WIDTH = 160;
  const NODE_HEIGHT = 60;
  const HORIZONTAL_GAP = 80;
  const VERTICAL_GAP = 80;

  // Build adjacency for topological ordering
  const adjacency = new Map();
  const inDegree = new Map();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (adjacency.has(edge.source) && inDegree.has(edge.target)) {
      adjacency.get(edge.source).push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // Topological sort (Kahn's algorithm) to determine layers
  const layers = [];
  const queue = [];

  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(nodeId);
  }

  const visited = new Set();
  while (queue.length > 0) {
    const currentLayer = [...queue];
    layers.push(currentLayer);
    queue.length = 0;

    for (const nodeId of currentLayer) {
      visited.add(nodeId);
      for (const neighbor of adjacency.get(nodeId) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0 && !visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }

  // Add any unvisited nodes (cycles or disconnected) to the last layer
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (layers.length === 0) layers.push([]);
      layers[layers.length - 1].push(node.id);
    }
  }

  // Assign positions based on layout strategy
  const nodePositions = new Map();

  if (diagramType === 'mindmap') {
    // Radial layout for mind maps
    layoutRadial(nodes, layers, nodePositions, NODE_WIDTH, NODE_HEIGHT, HORIZONTAL_GAP, VERTICAL_GAP);
  } else {
    // Top-down layered layout for most diagram types
    layoutLayered(layers, nodePositions, NODE_WIDTH, NODE_HEIGHT, HORIZONTAL_GAP, VERTICAL_GAP);
  }

  // Return nodes with positions and dimensions
  return nodes.map((node) => {
    const pos = nodePositions.get(node.id) || { x: 0, y: 0 };
    const dimensions = getNodeDimensions(node, NODE_WIDTH, NODE_HEIGHT);

    return {
      ...node,
      position: { x: pos.x, y: pos.y },
      dimensions,
    };
  });
}

/**
 * Layered (top-down) layout strategy.
 */
function layoutLayered(layers, nodePositions, nodeWidth, nodeHeight, hGap, vGap) {
  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const layerWidth = layer.length * (nodeWidth + hGap) - hGap;
    const startX = -layerWidth / 2 + nodeWidth / 2;

    for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
      nodePositions.set(layer[nodeIdx], {
        x: startX + nodeIdx * (nodeWidth + hGap),
        y: layerIdx * (nodeHeight + vGap),
      });
    }
  }
}

/**
 * Radial layout strategy for mind maps.
 */
function layoutRadial(nodes, layers, nodePositions, nodeWidth, nodeHeight, hGap, vGap) {
  if (layers.length === 0) return;

  // Center node
  const centerNodes = layers[0];
  if (centerNodes.length > 0) {
    nodePositions.set(centerNodes[0], { x: 0, y: 0 });
  }

  // Arrange subsequent layers in concentric rings
  for (let layerIdx = 1; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const radius = layerIdx * (nodeWidth + hGap);
    const angleStep = (2 * Math.PI) / Math.max(layer.length, 1);

    for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
      const angle = nodeIdx * angleStep - Math.PI / 2;
      nodePositions.set(layer[nodeIdx], {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
  }
}

/**
 * Returns dimensions for a node based on its type.
 */
function getNodeDimensions(node, defaultWidth, defaultHeight) {
  switch (node.type) {
    case 'decision':
      // Diamonds are square-ish
      return { width: defaultWidth, height: defaultWidth * 0.75 };
    case 'terminal':
      // Rounded terminals are shorter
      return { width: defaultWidth * 0.8, height: defaultHeight * 0.7 };
    case 'entity':
      // Entities may be taller to accommodate attributes
      const attrCount = node.metadata?.attributes?.length || 0;
      return { width: defaultWidth * 1.2, height: defaultHeight + attrCount * 20 };
    default:
      return { width: defaultWidth, height: defaultHeight };
  }
}

/**
 * Returns default style settings for a diagram type.
 */
function getDefaultStyle(diagramType) {
  const baseStyle = {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    nodeFill: '#ffffff',
    nodeStroke: '#334155',
    nodeStrokeWidth: 1.5,
    edgeStroke: '#64748b',
    edgeStrokeWidth: 1.5,
    labelColor: '#1e293b',
    backgroundColor: '#f8fafc',
    arrowSize: 8,
  };

  const typeOverrides = {
    flowchart: { nodeFill: '#eff6ff', nodeStroke: '#3b82f6' },
    architecture: { nodeFill: '#f0fdf4', nodeStroke: '#22c55e' },
    er: { nodeFill: '#fefce8', nodeStroke: '#eab308' },
    gantt: { nodeFill: '#faf5ff', nodeStroke: '#a855f7' },
    wireframe: { nodeFill: '#ffffff', nodeStroke: '#94a3b8', nodeStrokeWidth: 1 },
    mindmap: { nodeFill: '#fff7ed', nodeStroke: '#f97316' },
    'user-flow': { nodeFill: '#f0f9ff', nodeStroke: '#0ea5e9' },
    'state-diagram': { nodeFill: '#fdf2f8', nodeStroke: '#ec4899' },
  };

  return { ...baseStyle, ...(typeOverrides[diagramType] || {}) };
}

/**
 * Renders positioned nodes and edges as valid SVG markup.
 * @param {object[]} nodes - Positioned nodes with position and dimensions
 * @param {object[]} edges - Edges with source and target references
 * @param {object} style - Style configuration
 * @returns {string} Valid SVG markup string
 */
export function renderDiagramToSVG(nodes, edges, style = {}) {
  const s = { ...getDefaultStyle('flowchart'), ...style };

  if (!nodes || nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
  <text x="100" y="50" text-anchor="middle" font-family="${s.fontFamily}" font-size="14" fill="${s.labelColor}">No diagram data</text>
</svg>`;
  }

  // Calculate bounding box
  const padding = 40;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    const left = node.position.x - node.dimensions.width / 2;
    const right = node.position.x + node.dimensions.width / 2;
    const top = node.position.y - node.dimensions.height / 2;
    const bottom = node.position.y + node.dimensions.height / 2;
    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  // Build node position lookup for edge rendering
  const nodeMap = new Map();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  let svgContent = '';

  // Render edges first (behind nodes)
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const sx = sourceNode.position.x + offsetX;
    const sy = sourceNode.position.y + offsetY + sourceNode.dimensions.height / 2;
    const tx = targetNode.position.x + offsetX;
    const ty = targetNode.position.y + offsetY - targetNode.dimensions.height / 2;

    // Draw edge line with arrow
    svgContent += `  <line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}" stroke="${s.edgeStroke}" stroke-width="${s.edgeStrokeWidth}" marker-end="url(#arrowhead)" />\n`;

    // Edge label
    if (edge.label) {
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      svgContent += `  <text x="${midX + 5}" y="${midY - 5}" font-family="${s.fontFamily}" font-size="${s.fontSize - 1}" fill="${s.edgeStroke}" text-anchor="start">${escapeXml(edge.label)}</text>\n`;
    }
  }

  // Render nodes
  for (const node of nodes) {
    const cx = node.position.x + offsetX;
    const cy = node.position.y + offsetY;
    const w = node.dimensions.width;
    const h = node.dimensions.height;

    svgContent += renderNodeShape(node, cx, cy, w, h, s);
  }

  // Assemble final SVG
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" width="${Math.ceil(width)}" height="${Math.ceil(height)}">
  <defs>
    <marker id="arrowhead" markerWidth="${s.arrowSize}" markerHeight="${s.arrowSize}" refX="${s.arrowSize}" refY="${s.arrowSize / 2}" orient="auto">
      <polygon points="0 0, ${s.arrowSize} ${s.arrowSize / 2}, 0 ${s.arrowSize}" fill="${s.edgeStroke}" />
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="${s.backgroundColor}" />
${svgContent}</svg>`;
}

/**
 * Renders a single node shape based on its type.
 */
function renderNodeShape(node, cx, cy, w, h, s) {
  let shape = '';
  const x = cx - w / 2;
  const y = cy - h / 2;

  switch (node.type) {
    case 'decision':
      // Diamond shape
      shape += `  <polygon points="${cx},${y} ${cx + w / 2},${cy} ${cx},${y + h} ${cx - w / 2},${cy}" fill="${s.nodeFill}" stroke="${s.nodeStroke}" stroke-width="${s.nodeStrokeWidth}" />\n`;
      break;

    case 'terminal':
      // Rounded rectangle (pill shape)
      shape += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ry="${h / 2}" fill="${s.nodeFill}" stroke="${s.nodeStroke}" stroke-width="${s.nodeStrokeWidth}" />\n`;
      break;

    case 'entity':
      // Rectangle with header line for entity name
      shape += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" ry="2" fill="${s.nodeFill}" stroke="${s.nodeStroke}" stroke-width="${s.nodeStrokeWidth}" />\n`;
      shape += `  <line x1="${x}" y1="${y + 24}" x2="${x + w}" y2="${y + 24}" stroke="${s.nodeStroke}" stroke-width="${s.nodeStrokeWidth * 0.75}" />\n`;
      // Render attributes if present
      if (node.metadata?.attributes) {
        const attrs = node.metadata.attributes.slice(0, 5);
        for (let i = 0; i < attrs.length; i++) {
          const attrLabel = `${attrs[i].isPrimary ? '🔑 ' : ''}${attrs[i].name}: ${attrs[i].type || ''}`;
          shape += `  <text x="${x + 8}" y="${y + 40 + i * 18}" font-family="${s.fontFamily}" font-size="${s.fontSize - 2}" fill="${s.labelColor}">${escapeXml(attrLabel)}</text>\n`;
        }
      }
      break;

    case 'data':
      // Parallelogram
      const skew = 10;
      shape += `  <polygon points="${x + skew},${y} ${x + w},${y} ${x + w - skew},${y + h} ${x},${y + h}" fill="${s.nodeFill}" stroke="${s.nodeStroke}" stroke-width="${s.nodeStrokeWidth}" />\n`;
      break;

    case 'connector':
      // Circle
      const r = Math.min(w, h) / 2;
      shape += `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.nodeFill}" stroke="${s.nodeStroke}" stroke-width="${s.nodeStrokeWidth}" />\n`;
      break;

    default:
      // Process: standard rectangle
      shape += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ry="6" fill="${s.nodeFill}" stroke="${s.nodeStroke}" stroke-width="${s.nodeStrokeWidth}" />\n`;
      break;
  }

  // Node label (centered)
  const labelY = node.type === 'entity' ? y + 16 : cy + s.fontSize / 3;
  shape += `  <text x="${cx}" y="${labelY}" text-anchor="middle" font-family="${s.fontFamily}" font-size="${s.fontSize}" font-weight="500" fill="${s.labelColor}">${escapeXml(node.label)}</text>\n`;

  return shape;
}

/**
 * Escapes special XML characters in text content.
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
