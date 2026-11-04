/**
 * MCP Client - Connects to MCP servers (Canva, etc.)
 * Implements JSON-RPC 2.0 protocol for Model Context Protocol
 */

/**
 * Initialize an MCP session with a server
 * @param {string} mcpUrl - MCP server URL
 * @param {object} clientInfo - Client identification
 * @returns {object} Server capabilities and session info
 */
export async function initMcpSession(mcpUrl, clientInfo = {}) {
  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: {
          name: clientInfo.name || 'ChatBoxAi',
          version: clientInfo.version || '1.0.0',
        },
        capabilities: {},
      },
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP initialize failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * List available tools from an MCP server
 * @param {string} mcpUrl - MCP server URL
 * @param {string} sessionToken - Session/auth token
 * @returns {object} Available tools list
 */
export async function listMcpTools(mcpUrl, sessionToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 2,
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP tools/list failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Call a tool on an MCP server
 * @param {string} mcpUrl - MCP server URL
 * @param {string} toolName - Tool to call
 * @param {object} params - Tool parameters
 * @param {string} sessionToken - User's MCP session token
 * @returns {object} Tool execution result
 */
export async function callMcpTool(mcpUrl, toolName, params, sessionToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params,
        },
        id: Date.now(),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`MCP call failed: ${response.status} - ${errText.slice(0, 200)}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || `MCP error code ${data.error.code}`);
    }

    return data.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Initialize Canva MCP session
 * Canva MCP handles auth internally — returns auth URL for user
 * @returns {object} Session initialization response
 */
export async function initCanvaMcpSession() {
  return initMcpSession('https://mcp.canva.com/mcp', {
    name: 'ChatBoxAi',
    version: '1.0.0',
  });
}

/**
 * Call a Canva MCP tool
 * @deprecated Use callCanvaTool from lib/canva-mcp.js instead
 * @param {string} toolName - e.g., 'canva_create_design'
 * @param {object} params - Tool parameters
 * @param {string} userToken - User's Canva MCP session token
 * @returns {object} Result from Canva
 */
export async function callCanvaTool(toolName, params, userToken) {
  return callMcpTool('https://mcp.canva.com/mcp', toolName, params, userToken);
}
