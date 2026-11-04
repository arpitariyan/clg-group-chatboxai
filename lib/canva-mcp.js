/**
 * Canva MCP Client (DEPRECATED — now using Canva Connect REST API)
 * 
 * This file is kept for backward compatibility.
 * The primary Canva integration now uses lib/canva-connect.js with OAuth 2.0.
 * 
 * The MCP client was used when Canva was configured as connectionType: 'mcp'.
 * Now Canva uses standard OAuth 2.0 with PKCE and the Connect REST API.
 */

const CANVA_MCP_URL = 'https://mcp.canva.com/mcp';
const CANVA_TIMEOUT_MS = 60000; // 60s for generation tasks

/**
 * Map internal tool IDs to Canva MCP tool names
 * Our registry uses canva_ prefix; Canva MCP uses hyphenated names
 */
const TOOL_NAME_MAP = {
  // Search & Browse
  'canva_search_designs': 'search-designs',
  'canva_search': 'search',
  // Design Access
  'canva_get_design': 'get-design',
  'canva_get_design_pages': 'get-design-pages',
  'canva_get_design_content': 'get-design-content',
  // Fetch
  'canva_fetch': 'fetch',
  // Import
  'canva_import_design_from_url': 'import-design-from-url',
  'canva_get_design_import_from_url_status': 'get-design-import-from-url-status',
  // Export
  'canva_export_design': 'export-design',
  'canva_get_export_formats': 'get-export-formats',
  'canva_get_design_export_status': 'get-design-export-status',
  // Folder Organization
  'canva_create_folder': 'create-folder',
  'canva_move_item_to_folder': 'move-item-to-folder',
  'canva_list_folder_items': 'list-folder-items',
  // Collaboration
  'canva_add_comment_thread_to_design': 'add-comment-thread-to-design',
  // AI Generation
  'canva_generate_design': 'generate-design',
  'canva_get_design_generation_job': 'get-design-generation-job',
  // Legacy tool IDs (backward compatibility)
  'canva_create_design': 'generate-design',
  'canva_find_designs': 'search-designs',
};

/**
 * Resolve the MCP tool name from our internal tool ID
 * @param {string} toolId - Internal tool ID (e.g., 'canva_search_designs')
 * @returns {string} MCP tool name (e.g., 'search-designs')
 */
function resolveMcpToolName(toolId) {
  return TOOL_NAME_MAP[toolId] || toolId;
}

/**
 * Normalize parameters for Canva MCP
 * Maps our parameter names to what Canva MCP expects
 * @param {string} toolId - Internal tool ID
 * @param {object} params - Parameters from our system
 * @returns {object} Normalized parameters for Canva MCP
 */
function normalizeCanvaParams(toolId, params) {
  const normalized = { ...params };

  // Remove internal-only fields
  delete normalized._extractedStatusValue;

  // Tool-specific parameter normalization
  switch (toolId) {
    case 'canva_search_designs':
      // Map designType → type if Canva expects 'type'
      if (normalized.designType && !normalized.type) {
        normalized.type = normalized.designType;
        delete normalized.designType;
      }
      break;

    case 'canva_search':
      if (normalized.designType && !normalized.type) {
        normalized.type = normalized.designType;
        delete normalized.designType;
      }
      break;

    case 'canva_get_design':
    case 'canva_get_design_pages':
    case 'canva_get_design_content':
    case 'canva_get_export_formats':
      // designId → id (if Canva expects 'id')
      if (normalized.designId && !normalized.id) {
        normalized.id = normalized.designId;
        delete normalized.designId;
      }
      break;

    case 'canva_export_design':
      if (normalized.designId && !normalized.id) {
        normalized.id = normalized.designId;
        delete normalized.designId;
      }
      // Ensure format is lowercase
      if (normalized.format) {
        normalized.format = normalized.format.toLowerCase();
      }
      break;

    case 'canva_import_design_from_url':
      // Ensure URL is present
      if (!normalized.url) {
        throw new Error('URL is required for importing a design');
      }
      break;

    case 'canva_get_design_import_from_url_status':
    case 'canva_get_design_export_status':
    case 'canva_get_design_generation_job':
      // jobId → id (if Canva expects 'id')
      if (normalized.jobId && !normalized.id) {
        normalized.id = normalized.jobId;
        delete normalized.jobId;
      }
      break;

    case 'canva_create_folder':
      // parentFolderId → parent_folder_id
      if (normalized.parentFolderId && !normalized.parent_folder_id) {
        normalized.parent_folder_id = normalized.parentFolderId;
        delete normalized.parentFolderId;
      }
      break;

    case 'canva_move_item_to_folder':
      // itemId → item_id, folderId → folder_id
      if (normalized.itemId && !normalized.item_id) {
        normalized.item_id = normalized.itemId;
        delete normalized.itemId;
      }
      if (normalized.folderId && !normalized.folder_id) {
        normalized.folder_id = normalized.folderId;
        delete normalized.folderId;
      }
      break;

    case 'canva_list_folder_items':
      if (normalized.folderId && !normalized.folder_id) {
        normalized.folder_id = normalized.folderId;
        delete normalized.folderId;
      }
      if (normalized.sortBy && !normalized.sort_by) {
        normalized.sort_by = normalized.sortBy;
        delete normalized.sortBy;
      }
      break;

    case 'canva_add_comment_thread_to_design':
      if (normalized.designId && !normalized.id) {
        normalized.id = normalized.designId;
        delete normalized.designId;
      }
      if (normalized.pageIndex !== undefined && normalized.page_index === undefined) {
        normalized.page_index = normalized.pageIndex;
        delete normalized.pageIndex;
      }
      if (normalized.elementId && !normalized.element_id) {
        normalized.element_id = normalized.elementId;
        delete normalized.elementId;
      }
      break;

    case 'canva_generate_design':
      // Map our params to what Canva MCP expects
      if (normalized.designType && !normalized.design_type) {
        normalized.design_type = normalized.designType;
        delete normalized.designType;
      }
      if (normalized.colorScheme && !normalized.color_scheme) {
        normalized.color_scheme = normalized.colorScheme;
        delete normalized.colorScheme;
      }
      break;

    // Legacy compatibility
    case 'canva_create_design':
      // Old create_design → generate-design
      if (normalized.title && !normalized.prompt) {
        normalized.prompt = `Create a ${normalized.type || 'design'} titled "${normalized.title}"`;
        delete normalized.title;
      }
      if (normalized.type && !normalized.design_type) {
        normalized.design_type = normalized.type;
        delete normalized.type;
      }
      break;

    case 'canva_find_designs':
      // Old find_designs → search-designs
      break;
  }

  // Remove undefined/null values
  for (const key of Object.keys(normalized)) {
    if (normalized[key] === undefined || normalized[key] === null) {
      delete normalized[key];
    }
  }

  return normalized;
}

/**
 * Call a Canva MCP tool
 * @param {string} toolId - Internal tool ID (e.g., 'canva_search_designs')
 * @param {object} params - Tool parameters
 * @param {string} sessionToken - User's Canva MCP session token
 * @returns {object} Tool execution result
 */
export async function callCanvaTool(toolId, params, sessionToken) {
  const mcpToolName = resolveMcpToolName(toolId);
  const normalizedParams = normalizeCanvaParams(toolId, params);

  // Use longer timeout for generation and export tasks
  const isLongRunning = [
    'canva_generate_design',
    'canva_export_design',
    'canva_import_design_from_url',
  ].includes(toolId);
  const timeout = isLongRunning ? CANVA_TIMEOUT_MS : 30000;

  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`[Canva MCP] Calling tool: ${mcpToolName} (from ${toolId})`, JSON.stringify(normalizedParams).slice(0, 300));

    const response = await fetch(CANVA_MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: mcpToolName,
          arguments: normalizedParams,
        },
        id: Date.now(),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      
      // Handle specific HTTP errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('Canva session expired or unauthorized. Please reconnect Canva.');
      }
      if (response.status === 429) {
        throw new Error('Canva rate limit reached. Please wait a moment and try again.');
      }
      if (response.status === 404) {
        throw new Error(`Canva tool "${mcpToolName}" not found. The tool may not be available.`);
      }

      throw new Error(`Canva MCP failed: ${response.status} - ${errText.slice(0, 200)}`);
    }

    const data = await response.json();

    if (data.error) {
      const errMsg = data.error.message || `Canva MCP error (code: ${data.error.code})`;
      
      // Provide user-friendly error messages
      if (errMsg.includes('not found') || errMsg.includes('does not exist')) {
        throw new Error(`Design not found. Please check the design ID and try again.`);
      }
      if (errMsg.includes('permission') || errMsg.includes('access')) {
        throw new Error(`You don't have permission to access this design. It may be private or deleted.`);
      }

      throw new Error(errMsg);
    }

    // Post-process results for better AI consumption
    const result = postProcessCanvaResult(toolId, data.result);
    return result;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Canva operation timed out after ${timeout / 1000}s. For generation tasks, use get-design-generation-job to check status.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Post-process Canva MCP results for better AI consumption
 * Adds helpful context and normalizes response format
 */
function postProcessCanvaResult(toolId, result) {
  if (!result) return result;

  switch (toolId) {
    case 'canva_generate_design':
      // Add helpful message about checking status
      if (result.jobId || result.id) {
        return {
          ...result,
          _hint: 'Design generation started. Use canva_get_design_generation_job with the jobId to check progress.',
        };
      }
      break;

    case 'canva_export_design':
      if (result.jobId || result.id) {
        return {
          ...result,
          _hint: 'Export started. Use canva_get_design_export_status with the jobId to get the download URL.',
        };
      }
      break;

    case 'canva_import_design_from_url':
      if (result.jobId || result.id) {
        return {
          ...result,
          _hint: 'Import started. Use canva_get_design_import_from_url_status with the jobId to check progress.',
        };
      }
      break;

    case 'canva_get_design_generation_job':
      // Add stage descriptions
      if (result.status === 'completed' && result.designId) {
        return {
          ...result,
          _hint: 'Design is ready! Use canva_get_design to view details or canva_export_design to download.',
        };
      }
      break;

    case 'canva_get_design_export_status':
      if (result.status === 'completed' && result.downloadUrl) {
        return {
          ...result,
          _hint: 'Export is ready for download. The download URL expires in 24 hours.',
        };
      }
      break;

    case 'canva_search_designs':
    case 'canva_search':
      // Add count info
      if (Array.isArray(result?.designs || result?.templates || result)) {
        const items = result.designs || result.templates || result;
        return {
          ...result,
          _hint: `Found ${items.length} result(s). Use canva_get_design with a design ID for more details.`,
        };
      }
      break;
  }

  return result;
}

/**
 * List available tools from Canva MCP server
 * @param {string} sessionToken - User's Canva MCP session token
 * @returns {Array} Available Canva tools
 */
export async function listCanvaTools(sessionToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const response = await fetch(CANVA_MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Canva MCP tools/list failed: ${response.status}`);
  }

  const data = await response.json();
  return data.result?.tools || [];
}

/**
 * Get Canva MCP auth URL for user authorization
 * Canva MCP handles OAuth internally — this builds the auth redirect URL
 * @param {string} redirectUri - Callback URL after auth
 * @param {string} clientName - App name shown to user
 * @returns {string} Auth URL to redirect user to
 */
export function getCanvaAuthUrl(redirectUri, clientName = 'ChatBoxAi') {
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    client_name: clientName,
  });
  return `${CANVA_MCP_URL}/auth?${params.toString()}`;
}

/**
 * Initialize a Canva MCP session
 * @returns {object} Session info with capabilities
 */
export async function initCanvaSession() {
  const response = await fetch(CANVA_MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: {
          name: 'ChatBoxAi',
          version: '1.0.0',
        },
        capabilities: {},
      },
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Canva MCP initialize failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get all supported Canva tool IDs
 * @returns {string[]} Array of internal tool IDs
 */
export function getCanvaToolIds() {
  return Object.keys(TOOL_NAME_MAP).filter(id => !['canva_create_design', 'canva_find_designs'].includes(id));
}

/**
 * Check if a tool ID is a valid Canva tool
 * @param {string} toolId - Tool ID to check
 * @returns {boolean}
 */
export function isCanvaTool(toolId) {
  return toolId in TOOL_NAME_MAP;
}
