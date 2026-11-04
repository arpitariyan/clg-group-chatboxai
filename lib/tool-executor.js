/**
 * Tool Executor - Executes actions against third-party APIs and MCP servers
 * Handles validation, authentication, retries, timeouts, and confirmation flows
 */

import { getAppById, getToolSchema } from './app-registry.js';
import { getValidToken, markConnectionUsed } from './oauth-manager.js';
import { callMcpTool } from './mcp-client.js';
import { databases, ID } from '@/services/appwrite-admin.js';
import { APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';

const TOOL_EXECUTION_LOGS_COLLECTION = 'tool_execution_logs';
const EXECUTION_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Execute a tool action against a third-party API or MCP server
 * @param {string} userId - User ID
 * @param {string} appId - App identifier
 * @param {string} toolId - Tool identifier
 * @param {object} parameters - Tool parameters
 * @param {object} options - { confirmed: boolean }
 * @returns {ExecutionResult}
 */
export async function execute(userId, appId, toolId, parameters = {}, options = {}) {
  const startTime = Date.now();
  const tool = getToolSchema(appId, toolId);
  const app = getAppById(appId);

  if (!tool || !app) {
    return createResult('failed', null, 'Tool or app not found', startTime);
  }

  // Check confirmation requirement
  if (tool.requiresConfirmation && !options.confirmed) {
    const summary = buildActionSummary(app, tool, parameters);
    return {
      status: 'awaiting_confirmation',
      actionSummary: summary,
      appId,
      toolId,
      parameters,
      durationMs: Date.now() - startTime,
    };
  }

  // Normalize parameters — map AI-generated aliases to correct names
  parameters = normalizeParameters(parameters, tool);

  // NOTION INTERCEPTOR: If pageId is invalid/garbage, do search+update automatically
  if (appId === 'notion' && toolId === 'notion_update_page') {
    const cleanedPageId = cleanNotionId(parameters.pageId);
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanedPageId);
    
    if (!isValidUuid) {
      console.log('[Notion Interceptor] Invalid pageId detected:', JSON.stringify(parameters.pageId)?.slice(0, 50), '→ triggering auto search+update');
      const statusValue = parameters._extractedStatusValue || extractStatusValueFromProps(parameters.properties);
      
      if (statusValue) {
        try {
          const accessToken = await getValidToken(userId, appId);
          const result = await notionSearchAndUpdate(accessToken, parameters, statusValue, startTime);
          if (result.status === 'success') {
            await markConnectionUsed(userId, appId);
          }
          await logExecution(userId, appId, toolId, result);
          return result;
        } catch (err) {
          console.warn('[Notion Interceptor] Failed:', err.message);
          const result = createResult('failed', null, `Could not update Notion: ${err.message}`, startTime);
          await logExecution(userId, appId, toolId, result);
          return result;
        }
      } else {
        // Can't determine status value — return helpful error
        const result = createResult('failed', null, 'Invalid page ID and could not determine status value. Please search for the page first.', startTime);
        await logExecution(userId, appId, toolId, result);
        return result;
      }
    }
  }

  // GOOGLE CALENDAR INTERCEPTOR: For action tools (delete, update, get, respond),
  // ALWAYS auto-find the event first because AI almost never has a valid eventId.
  // Event IDs don't persist between conversation turns, so the AI fabricates them.
  if (appId === 'google_calendar' && (toolId === 'calendar_delete_event' || toolId === 'calendar_update_event' || toolId === 'calendar_get_event' || toolId === 'calendar_respond_to_event')) {
    console.log('[Calendar Interceptor] Action tool called:', toolId, '| eventId:', (parameters.eventId || '').slice(0, 50));
    try {
      const accessToken = await getValidToken(userId, appId);
      const result = await calendarAutoFindAndAct(accessToken, toolId, parameters, startTime);
      if (result) {
        if (result.status === 'success') {
          await markConnectionUsed(userId, appId);
        }
        await logExecution(userId, appId, toolId, result);
        return result;
      }
      // calendarAutoFindAndAct returned null — shouldn't happen but handle gracefully
      const fallbackResult = createResult('failed', null, 'Could not find the event. Please try again or specify the event name.', startTime);
      await logExecution(userId, appId, toolId, fallbackResult);
      return fallbackResult;
    } catch (err) {
      console.warn('[Calendar Interceptor] Failed:', err.message);
      const errResult = createResult('failed', null, `Calendar error: ${err.message}`, startTime);
      await logExecution(userId, appId, toolId, errResult);
      return errResult;
    }
  }

  // Validate parameters
  const validationError = validateParameters(parameters, tool);
  if (validationError) {
    const result = createResult('failed', null, validationError, startTime);
    await logExecution(userId, appId, toolId, result);
    return result;
  }

  // FIGMA INTERCEPTOR: figma_list_files uses internal API, not Figma REST API directly
  if (appId === 'figma' && toolId === 'figma_list_files') {
    try {
      const accessToken = await getValidToken(userId, appId);
      
      // Simply return a message telling the AI to ask for the file URL
      // The /me and /teams endpoints require additional scopes that may not be granted
      await markConnectionUsed(userId, appId);
      const result = createResult('success', {
        connected: true,
        message: 'Figma is connected successfully. However, to access a specific file, the user must provide their Figma file URL. The file key is extracted from the URL (e.g., https://www.figma.com/design/ABC123xyz/File-Name — the key is ABC123xyz). Please ask the user to share their Figma file URL.'
      }, null, startTime);
      await logExecution(userId, appId, toolId, result);
      return result;
    } catch (err) {
      const result = createResult('failed', null, `Figma error: ${err.message}`, startTime);
      await logExecution(userId, appId, toolId, result);
      return result;
    }
  }

  // FIGMA INTERNAL API INTERCEPTOR: Tools that use internal /api/figma/* routes
  // These routes expect Firebase auth, not Figma OAuth tokens
  if (appId === 'figma' && (toolId === 'figma_extract_design_system' || toolId === 'figma_convert_to_code')) {
    try {
      const figmaToken = await getValidToken(userId, appId);
      
      // Extract fileKey from URL if needed
      let fileKey = parameters.fileKey || '';
      const figmaUrlMatch = fileKey.match(/figma\.com\/(?:file|design|proto|board)\/([a-zA-Z0-9]+)/);
      if (figmaUrlMatch) fileKey = figmaUrlMatch[1];
      
      if (toolId === 'figma_extract_design_system') {
        // Extract design tokens from the file data
        const { extractDesignSystem } = await import('./figma/design-system-extractor.js');
        const { formatTokensAsCSS, formatTokensAsTailwind, formatTokensAsJSON } = await import('./figma/token-formatter.js');
        
        const tokens = await extractDesignSystem(figmaToken, fileKey);
        const format = parameters.format || 'all';
        
        const result_data = { tokens };
        if (format === 'all' || format === 'css') result_data.css = formatTokensAsCSS(tokens);
        if (format === 'all' || format === 'tailwind') result_data.tailwind = formatTokensAsTailwind(tokens);
        if (format === 'all' || format === 'json') result_data.json = formatTokensAsJSON(tokens);
        
        await markConnectionUsed(userId, appId);
        const result = createResult('success', result_data, null, startTime);
        await logExecution(userId, appId, toolId, result);
        return result;
      } else {
        // figma_convert_to_code — get the node data for AI to generate code
        const nodeId = parameters.nodeId || '';
        const { getFigmaNodes } = await import('./figma/figma-api.js');
        
        let nodeData = null;
        if (nodeId) {
          try {
            const nodesResponse = await getFigmaNodes(figmaToken, fileKey, [nodeId]);
            nodeData = nodesResponse?.nodes?.[nodeId]?.document || null;
          } catch (e) {
            nodeData = null;
          }
        }
        
        await markConnectionUsed(userId, appId);
        const result = createResult('success', {
          node: nodeData,
          message: nodeData 
            ? 'Node data retrieved. Generate a React component with Tailwind CSS based on this structure.'
            : 'Could not find the specified node. Please provide a valid node ID from the file structure.'
        }, null, startTime);
        await logExecution(userId, appId, toolId, result);
        return result;
      }
    } catch (err) {
      const result = createResult('failed', null, `Figma error: ${err.message}`, startTime);
      await logExecution(userId, appId, toolId, result);
      return result;
    }
  }

  // Route to MCP or OAuth based on connection type
  if (app.connectionType === 'mcp' && app.mcpUrl) {
    return await executeMcpTool(userId, app, tool, toolId, parameters, startTime);
  }

  // CANVA INTERCEPTOR: Route Canva tools to Canva Connect REST API
  if (appId === 'canva') {
    try {
      const accessToken = await getValidToken(userId, appId);
      const { executeCanvaTool } = await import('./canva-connect.js');
      const canvaResult = await executeCanvaTool(toolId, parameters, accessToken);
      await markConnectionUsed(userId, appId);
      const result = createResult('success', canvaResult, null, startTime);
      await logExecution(userId, appId, toolId, result);
      return result;
    } catch (err) {
      console.error('[Canva Interceptor] Error:', err.message);
      let errorMessage = err.message;
      if (err.message.includes('401') || err.message.includes('unauthorized') || err.message.includes('expired')) {
        // Try refreshing the token and retry once
        try {
          const { refreshToken } = await import('./oauth-manager.js');
          const newToken = await refreshToken(userId, appId);
          const { executeCanvaTool } = await import('./canva-connect.js');
          const canvaResult = await executeCanvaTool(toolId, parameters, newToken);
          await markConnectionUsed(userId, appId);
          const result = createResult('success', canvaResult, null, startTime);
          await logExecution(userId, appId, toolId, result);
          return result;
        } catch (retryErr) {
          console.error('[Canva Interceptor] Retry after refresh failed:', retryErr.message);
          errorMessage = 'Canva connection expired. Please reconnect Canva from App Connections.';
        }
      }
      const result = createResult('failed', null, errorMessage, startTime);
      await logExecution(userId, appId, toolId, result);
      return result;
    }
  }

  // Get valid OAuth token
  let accessToken;
  try {
    accessToken = await getValidToken(userId, appId);
  } catch (err) {
    const result = createResult('failed', null, `Authentication error: ${err.message}`, startTime);
    await logExecution(userId, appId, toolId, result);
    return result;
  }

  // GMAIL INTERCEPTOR: For read/search tools, auto-fetch full message content
  // Gmail API returns only message IDs by default — we need to fetch each message's content
  if (appId === 'gmail' && (toolId === 'gmail_read_emails' || toolId === 'gmail_search_threads' || toolId === 'gmail_get_thread' || toolId === 'gmail_list_drafts' || toolId === 'gmail_get_draft')) {
    console.log('[Gmail Interceptor] Handling:', toolId, '| params:', JSON.stringify(parameters).slice(0, 200));
    try {
      const result = await gmailAutoFetchContent(accessToken, toolId, parameters, startTime);
      if (result) {
        if (result.status === 'success') {
          await markConnectionUsed(userId, appId);
        }
        await logExecution(userId, appId, toolId, result);
        return result;
      }
    } catch (err) {
      console.warn('[Gmail Interceptor] Failed:', err.message);
      const errResult = createResult('failed', null, `Gmail error: ${err.message}`, startTime);
      await logExecution(userId, appId, toolId, errResult);
      return errResult;
    }
  }

  // GMAIL SMART TOOLS INTERCEPTOR: New intelligent email tools
  if (appId === 'gmail' && (
    toolId === 'gmail_send_smart' ||
    toolId === 'gmail_smart_reply' ||
    toolId === 'gmail_schedule_email' ||
    toolId === 'gmail_auto_reply' ||
    toolId === 'gmail_mark_read' ||
    toolId === 'gmail_move_email'
  )) {
    console.log('[Gmail Smart Interceptor] Handling:', toolId, '| params:', JSON.stringify(parameters).slice(0, 200));
    try {
      const result = await executeGmailSmartTool(accessToken, toolId, parameters, startTime);
      if (result) {
        if (result.status === 'success') await markConnectionUsed(userId, appId);
        await logExecution(userId, appId, toolId, result);
        return result;
      }
    } catch (err) {
      console.warn('[Gmail Smart Interceptor] Failed:', err.message);
      const errResult = createResult('failed', null, `Gmail error: ${err.message}`, startTime);
      await logExecution(userId, appId, toolId, errResult);
      return errResult;
    }
  }

  // Special handling: Notion duplicate page — fetch original content first, then create copy
  if (appId === 'notion' && toolId === 'notion_duplicate_page') {
    return await executeNotionDuplicate(userId, parameters, accessToken, startTime);
  }

  // Special handling: Google Calendar respond to event — GET event first, then PATCH attendees
  if (appId === 'google_calendar' && toolId === 'calendar_respond_to_event') {
    return await executeCalendarRespond(userId, parameters, accessToken, startTime);
  }

  // Execute with retries
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await executeWithTimeout(app, tool, parameters, accessToken, options.baseUrl);

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers?.get?.('retry-after') || '5', 10);
        if (retryAfter > 60) {
          const result = createResult('failed', null, 'Rate limited. Please try again later.', startTime);
          await logExecution(userId, appId, toolId, result);
          return result;
        }
        if (attempt < MAX_RETRIES) {
          await sleep(retryAfter * 1000);
          continue;
        }
      }

      // Handle auth errors (401/403) - try token refresh once
      if ((response.status === 401 || response.status === 403) && attempt === 0) {
        try {
          const { refreshToken } = await import('./oauth-manager.js');
          accessToken = await refreshToken(userId, appId);
          continue; // Retry with new token
        } catch {
          const result = createResult('failed', null, 'Permission denied. Please reconnect the app.', startTime);
          await logExecution(userId, appId, toolId, result);
          return result;
        }
      }

      // Handle success
      if (response.ok) {
        let data;
        const contentType = response.headers?.get?.('content-type') || '';

        // Handle text/binary responses (Google Drive file content exports)
        if (toolId === 'drive_read_file_content' || toolId === 'drive_download_file_content') {
          const textContent = await response.text().catch(() => '');
          data = {
            content: textContent.slice(0, 50000), // Limit to 50K chars
            mimeType: contentType,
            truncated: textContent.length > 50000,
          };
        } else if (toolId === 'calendar_delete_event' && response.status === 204) {
          // DELETE returns 204 No Content on success
          data = { status: 'deleted', deleted: true };
        } else {
          data = await response.json().catch(() => ({ status: 'completed' }));
        }

        // Slack post-processing: filter users by search query
        if (toolId === 'slack_search_users' && data?.members && parameters.query) {
          const q = parameters.query.toLowerCase();
          data.members = data.members.filter(m => {
            const name = (m.real_name || m.name || '').toLowerCase();
            const email = (m.profile?.email || '').toLowerCase();
            const displayName = (m.profile?.display_name || '').toLowerCase();
            return name.includes(q) || email.includes(q) || displayName.includes(q);
          }).slice(0, 20);
        }

        // Slack post-processing: filter channels by search query
        if (toolId === 'slack_search_channels' && data?.channels && parameters.query) {
          const q = parameters.query.toLowerCase();
          data.channels = data.channels.filter(c => {
            const name = (c.name || '').toLowerCase();
            const topic = (c.topic?.value || '').toLowerCase();
            const purpose = (c.purpose?.value || '').toLowerCase();
            return name.includes(q) || topic.includes(q) || purpose.includes(q);
          });
        }

        // Slack post-processing: filter messages by search query text (for channel history reads)
        if ((toolId === 'slack_read_channel') && data?.messages && parameters.query) {
          const q = parameters.query.toLowerCase();
          data.messages = data.messages.filter(m => {
            const text = (m.text || '').toLowerCase();
            return text.includes(q);
          });
        }

        // Figma post-processing: trim large file responses to prevent context overflow
        if (appId === 'figma' && toolId === 'figma_get_file' && data?.document) {
          // Extract key info: file name, pages, top-level frames, components, styles
          const trimmedData = {
            name: data.name,
            lastModified: data.lastModified,
            version: data.version,
            editorType: data.editorType,
            pages: [],
            componentCount: Object.keys(data.components || {}).length,
            styleCount: Object.keys(data.styles || {}).length,
            components: {},
            styles: data.styles || {},
          };

          // Extract page structure with top-level frames only (not deep nesting)
          if (data.document?.children) {
            for (const page of data.document.children) {
              const pageInfo = {
                id: page.id,
                name: page.name,
                type: page.type,
                frames: [],
              };
              if (page.children) {
                for (const child of page.children.slice(0, 50)) {
                  pageInfo.frames.push({
                    id: child.id,
                    name: child.name,
                    type: child.type,
                    childCount: child.children?.length || 0,
                  });
                }
                if (page.children.length > 50) {
                  pageInfo.frames.push({ note: `... and ${page.children.length - 50} more frames` });
                }
              }
              trimmedData.pages.push(pageInfo);
            }
          }

          // Include component names (not full definitions)
          if (data.components) {
            for (const [id, comp] of Object.entries(data.components)) {
              trimmedData.components[id] = { name: comp.name, description: comp.description || '' };
            }
          }

          data = trimmedData;
        }

        await markConnectionUsed(userId, appId);
        const result = createResult('success', data, null, startTime);
        await logExecution(userId, appId, toolId, result);
        return result;
      }

      // Other errors
      const errorBody = await response.text().catch(() => 'Unknown error');
      
      // Notion 400 error — auto-retry with select↔status conversion
      if (response.status === 400 && appId === 'notion' && toolId === 'notion_update_page') {
        const needsConversion = errorBody.includes('expected to be status') || 
                                errorBody.includes('expected to be select') ||
                                errorBody.includes('Invalid status option') ||
                                errorBody.includes('is not a property that exists');
        if (needsConversion && parameters.properties) {
          try {
            let props = safeParseNotionProperties(parameters.properties);
            if (!props) throw new Error('Could not parse properties');
            
            let converted = false;
            for (const [key, val] of Object.entries(props)) {
              // If error says "expected to be status" → we need to USE status type
              if (errorBody.includes('expected to be status') && val?.select?.name) {
                props[key] = { status: { name: val.select.name } };
                converted = true;
              }
              // If error says "expected to be select" → we need to USE select type
              else if (errorBody.includes('expected to be select') && val?.status?.name) {
                props[key] = { select: { name: val.status.name } };
                converted = true;
              }
              // "Invalid status option" means the value doesn't exist — try both types
              else if (errorBody.includes('Invalid status option')) {
                if (val?.status?.name) {
                  props[key] = { select: { name: val.status.name } };
                  converted = true;
                } else if (val?.select?.name) {
                  props[key] = { status: { name: val.select.name } };
                  converted = true;
                }
              }
            }
            
            if (converted) {
              console.log('[Notion] Retrying with corrected property type:', JSON.stringify(props));
              const pageId = cleanNotionId(parameters.pageId);
              const retryBody = { properties: props };
              if (parameters.title) {
                retryBody.properties.title = { title: [{ text: { content: parameters.title } }] };
              }
              if (parameters.icon) retryBody.icon = { type: 'emoji', emoji: parameters.icon };
              if (parameters.archived !== undefined) retryBody.archived = parameters.archived;
              
              const retryResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                  'Notion-Version': '2022-06-28',
                },
                body: JSON.stringify(retryBody),
              });
              
              if (retryResponse.ok) {
                const data = await retryResponse.json().catch(() => ({ status: 'completed' }));
                await markConnectionUsed(userId, appId);
                const result = createResult('success', data, null, startTime);
                await logExecution(userId, appId, toolId, result);
                return result;
              }
              const retryError = await retryResponse.text().catch(() => '');
              console.warn('[Notion] Status type retry also failed:', retryResponse.status, retryError.slice(0, 200));
            }
          } catch (convErr) {
            console.warn('[Notion] select↔status conversion failed:', convErr.message);
          }
        }
      }
      
      lastError = `API returned ${response.status}: ${errorBody.slice(0, 200)}`;

      // Google Calendar 400 — log full error for debugging and provide helpful message
      if (response.status === 400 && appId === 'google_calendar') {
        console.error('[Google Calendar] 400 Error:', errorBody.slice(0, 500));
        console.error('[Google Calendar] Request parameters:', JSON.stringify(parameters).slice(0, 500));
        // Don't retry 400s for Calendar — they're always request format issues
        const result = createResult('failed', null, `Calendar API error: ${errorBody.slice(0, 200)}`, startTime);
        await logExecution(userId, appId, toolId, result);
        return result;
      }

    } catch (err) {
      lastError = err.message;
      if (err.name === 'AbortError' || err.message.includes('timeout')) {
        const result = createResult('timeout', null, 'Operation timed out (30s)', startTime);
        await logExecution(userId, appId, toolId, result);
        return result;
      }

      // Network error - retry with exponential backoff
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  // All retries exhausted
  const result = createResult('failed', null, lastError || 'All retry attempts failed', startTime);
  await logExecution(userId, appId, toolId, result);
  return result;
}

/**
 * Execute API request with timeout
 */
async function executeWithTimeout(app, tool, parameters, accessToken, reqBaseUrl) {
  // Figma files can be large — use longer timeout
  const timeout = app.id === 'figma' ? 60000 : EXECUTION_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const { url, options } = buildRequest(app, tool, parameters, accessToken, reqBaseUrl);
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Build the API request from tool schema and parameters
 */
function buildRequest(app, tool, parameters, accessToken, reqBaseUrl) {
  let url = tool.endpoint || '';

  // Handle internal API endpoints (relative URLs starting with /api/)
  if (url.startsWith('/api/')) {
    const isProduction = process.env.NODE_ENV === 'production';
    const defaultBaseUrl = isProduction ? 'https://chatboxai.co.in' : 'http://localhost:3000';
    const baseUrl = reqBaseUrl || defaultBaseUrl;
    url = `${baseUrl}${url}`;
  }

  // Replace URL template variables
  url = url.replace(/\{(\w+)\}/g, (match, key) => {
    if (parameters[key]) return encodeURIComponent(parameters[key]);
    if (key === 'accountSid') return process.env.TWILIO_ACCOUNT_SID || '';
    if (key === 'shop') return parameters.shop || '';
    return match;
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  // Special auth handling for certain APIs
  if (app.id === 'notion') {
    headers['Notion-Version'] = '2022-06-28';

    // Notion fetch page content (blocks)
    if (tool.id === 'notion_fetch') {
      const pageId = cleanNotionId(parameters.pageId);
      let fetchUrl = `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`;
      if (parameters.start_cursor) {
        fetchUrl += `&start_cursor=${encodeURIComponent(parameters.start_cursor)}`;
      }
      return { url: fetchUrl, options: { method: 'GET', headers } };
    }

    // Notion get comments
    if (tool.id === 'notion_get_comments') {
      const pageId = cleanNotionId(parameters.pageId);
      url = `https://api.notion.com/v1/comments?block_id=${pageId}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Notion get user by ID
    if (tool.id === 'notion_get_user') {
      const userId = cleanNotionId(parameters.userId);
      url = `https://api.notion.com/v1/users/${userId}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Notion get self
    if (tool.id === 'notion_get_self') {
      url = 'https://api.notion.com/v1/users/me';
      return { url, options: { method: 'GET', headers } };
    }

    // Notion get all users
    if (tool.id === 'notion_get_users') {
      url = 'https://api.notion.com/v1/users?page_size=100';
      return { url, options: { method: 'GET', headers } };
    }

    // Notion update/move page (PATCH)
    if (tool.id === 'notion_update_page' || tool.id === 'notion_move_page') {
      const pageId = cleanNotionId(parameters.pageId);
      url = `https://api.notion.com/v1/pages/${pageId}`;
      
      const body = {};
      
      if (tool.id === 'notion_move_page') {
        body.parent = { page_id: cleanNotionId(parameters.newParentId) };
      } else {
        // notion_update_page
        if (parameters.title) {
          body.properties = { title: { title: [{ text: { content: parameters.title } }] } };
        }
        if (parameters.icon) {
          body.icon = { type: 'emoji', emoji: parameters.icon };
        }
        if (parameters.archived !== undefined) {
          body.archived = parameters.archived;
        }
        if (parameters.properties) {
          let parsedProps = safeParseNotionProperties(parameters.properties);
          
          console.log('[Notion buildRequest] Raw properties input:', typeof parameters.properties === 'string' ? parameters.properties.slice(0, 200) : 'object');
          console.log('[Notion buildRequest] Parsed properties:', JSON.stringify(parsedProps));
          
          // If parsing failed or produced garbage, try to extract status from dedicated parameters
          if (!parsedProps || Object.keys(parsedProps).length === 0) {
            // Check if there's a separate status/statusName parameter the AI might have passed
            if (parameters.status || parameters.statusName || parameters.statusValue) {
              const statusVal = parameters.status || parameters.statusName || parameters.statusValue;
              parsedProps = { Status: { status: { name: String(statusVal) } } };
            }
            // Use pre-extracted value from normalizeParameters
            else if (parameters._extractedStatusValue) {
              parsedProps = { Status: { status: { name: parameters._extractedStatusValue } } };
            }
          }
          
          // Validate that no property value is just a backslash or garbage
          if (parsedProps) {
            for (const [key, val] of Object.entries(parsedProps)) {
              // Check status type
              if (val?.status?.name) {
                const name = String(val.status.name).replace(/\\/g, '').trim();
                if (!name || name.length < 2) {
                  console.warn(`[Notion] Invalid status value for "${key}": "${val.status.name}" — removing`);
                  delete parsedProps[key];
                } else {
                  parsedProps[key] = { status: { name } };
                }
              }
              // Check select type
              if (val?.select?.name) {
                const name = String(val.select.name).replace(/\\/g, '').trim();
                if (!name || name.length < 2) {
                  console.warn(`[Notion] Invalid select value for "${key}": "${val.select.name}" — removing`);
                  delete parsedProps[key];
                } else {
                  parsedProps[key] = { select: { name } };
                }
              }
            }
          }
          
          if (parsedProps && Object.keys(parsedProps).length > 0) {
            body.properties = { ...(body.properties || {}), ...parsedProps };
          } else {
            // LAST RESORT: If we still have nothing, use _extractedStatusValue
            if (parameters._extractedStatusValue) {
              body.properties = { ...(body.properties || {}), Status: { status: { name: parameters._extractedStatusValue } } };
            } else {
              console.warn('[Notion] Could not parse valid properties from:', JSON.stringify(parameters.properties).slice(0, 200));
            }
          }
        }
      }
      
      console.log('[Notion] Final request body:', JSON.stringify(body).slice(0, 500));
      return { url, options: { method: 'PATCH', headers, body: JSON.stringify(body) } };
    }

    // Notion update database (PATCH)
    if (tool.id === 'notion_update_database') {
      const dbId = cleanNotionId(parameters.databaseId);
      url = `https://api.notion.com/v1/databases/${dbId}`;
      const body = buildRequestBody(app, tool, parameters);
      return { url, options: { method: 'PATCH', headers, body: JSON.stringify(body) } };
    }

    // Notion append blocks to a page (PATCH)
    if (tool.id === 'notion_append_blocks') {
      const pageId = cleanNotionId(parameters.pageId);
      url = `https://api.notion.com/v1/blocks/${pageId}/children`;
      const children = markdownToNotionBlocks(parameters.content || '');
      return { url, options: { method: 'PATCH', headers, body: JSON.stringify({ children }) } };
    }

    // Notion delete block (DELETE)
    if (tool.id === 'notion_delete_block') {
      const blockId = cleanNotionId(parameters.blockId);
      url = `https://api.notion.com/v1/blocks/${blockId}`;
      return { url, options: { method: 'DELETE', headers } };
    }

    // Notion query database (POST)
    if (tool.id === 'notion_query_database') {
      const dbId = cleanNotionId(parameters.databaseId);
      url = `https://api.notion.com/v1/databases/${dbId}/query`;
      const body = {};
      if (parameters.filter) {
        try { body.filter = typeof parameters.filter === 'string' ? JSON.parse(parameters.filter) : parameters.filter; } catch { /* skip invalid */ }
      }
      if (parameters.sorts) {
        try { body.sorts = typeof parameters.sorts === 'string' ? JSON.parse(parameters.sorts) : parameters.sorts; } catch { /* skip invalid */ }
      }
      body.page_size = parameters.page_size || 50;
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    // Notion get page properties (GET)
    if (tool.id === 'notion_get_page') {
      const pageId = cleanNotionId(parameters.pageId);
      url = `https://api.notion.com/v1/pages/${pageId}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Notion get database metadata (GET)
    if (tool.id === 'notion_get_database') {
      const dbId = cleanNotionId(parameters.databaseId);
      url = `https://api.notion.com/v1/databases/${dbId}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Notion add database entry (POST to /pages with database parent)
    if (tool.id === 'notion_add_database_entry') {
      url = 'https://api.notion.com/v1/pages';
      const body = buildRequestBody(app, tool, parameters);
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    // Notion duplicate page — actually fetch original content and create a real copy
    if (tool.id === 'notion_duplicate_page') {
      // We'll handle this in a special pre-execution step
      // For now, build the create page request — the actual duplication logic is in executeDuplicatePage
      url = 'https://api.notion.com/v1/pages';
      const body = buildRequestBody(app, tool, parameters);
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    // Other Notion POST tools (search, create_page, create_database, create_comment)
    // are handled by the default POST path below
  }

  // ── Google Drive special handling ──────────────────────────────────────
  if (app.id === 'google_drive') {
    // Search files — convert 'query' param to Drive API 'q' param
    if (tool.id === 'drive_search_files') {
      let q = parameters.query || '';
      const pageSize = parameters.maxResults || 10;
      const orderBy = parameters.orderBy || 'modifiedTime desc';

      // If the query doesn't look like Drive API syntax, convert it to a name search
      // Drive API syntax uses operators like: name contains, fullText contains, mimeType=, etc.
      const isDriveQuery = /\b(name|fullText|mimeType|modifiedTime|createdTime|trashed|starred)\b/.test(q);
      if (!isDriveQuery && q.trim()) {
        // Plain text query — search by name (most common use case)
        q = `name contains '${q.replace(/'/g, "\\'")}'`;
      }

      // Always exclude trashed files
      if (q && !q.includes('trashed')) {
        q += ' and trashed=false';
      } else if (!q) {
        q = 'trashed=false';
      }

      url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&orderBy=${encodeURIComponent(orderBy)}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,owners,shared),nextPageToken`;
      return { url, options: { method: 'GET', headers } };
    }

    // List recent files — ordered by recency
    if (tool.id === 'drive_list_recent_files') {
      const pageSize = parameters.maxResults || 10;
      let q = 'trashed=false';
      if (parameters.mimeType) {
        q += ` and mimeType='${parameters.mimeType}'`;
      }
      url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&orderBy=viewedByMeTime desc,modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,owners)`;
      return { url, options: { method: 'GET', headers } };
    }

    // Read file content (export Google Docs/Sheets/Slides as text)
    if (tool.id === 'drive_read_file_content') {
      const fileId = parameters.fileId || '';
      const exportMimeType = parameters.mimeType || 'text/plain';

      // Google Workspace files use /export, regular files use alt=media
      // If mimeType param suggests it's a Google file OR no mimeType specified (default to export)
      url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
      headers['Accept'] = exportMimeType;
      delete headers['Content-Type'];
      return { url, options: { method: 'GET', headers } };
    }

    // Download file content (non-Google files — PDFs, images, etc.)
    if (tool.id === 'drive_download_file_content') {
      const fileId = parameters.fileId || '';
      url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      headers['Accept'] = '*/*';
      delete headers['Content-Type'];
      return { url, options: { method: 'GET', headers } };
    }

    // Get file metadata — request useful fields
    if (tool.id === 'drive_get_file_metadata') {
      const fileId = parameters.fileId || '';
      url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,modifiedTime,createdTime,owners,shared,webViewLink,webContentLink,description,starred,trashed,parents`;
      return { url, options: { method: 'GET', headers } };
    }

    // Get file permissions
    if (tool.id === 'drive_get_file_permissions') {
      const fileId = parameters.fileId || '';
      url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,type,role,emailAddress,displayName)`;
      return { url, options: { method: 'GET', headers } };
    }

    // Create file — multipart upload
    if (tool.id === 'drive_create_file') {
      const metadata = {
        name: parameters.name || 'Untitled',
        mimeType: parameters.mimeType || 'application/vnd.google-apps.document',
      };
      if (parameters.folderId) {
        metadata.parents = [parameters.folderId];
      }

      const content = parameters.content || '';
      const boundary = '----ChatBoxAiBoundary' + Date.now();

      // Determine upload content type based on target mimeType
      let uploadMimeType = 'text/plain';
      if (metadata.mimeType === 'application/vnd.google-apps.document') {
        uploadMimeType = 'text/html';
      } else if (metadata.mimeType === 'application/vnd.google-apps.spreadsheet') {
        uploadMimeType = 'text/csv';
      }

      const multipartBody = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${uploadMimeType}`,
        '',
        content,
        `--${boundary}--`,
      ].join('\r\n');

      url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink';
      headers['Content-Type'] = `multipart/related; boundary=${boundary}`;

      return { url, options: { method: 'POST', headers, body: multipartBody } };
    }
  }

  // ── Google Calendar special handling ───────────────────────────────────
  if (app.id === 'google_calendar') {
    const calendarId = encodeURIComponent(parameters.calendarId || 'primary');

    // List events
    if (tool.id === 'calendar_list_events') {
      const params = new URLSearchParams();
      params.set('singleEvents', String(parameters.singleEvents !== false));
      params.set('orderBy', parameters.orderBy || 'startTime');
      params.set('maxResults', String(parameters.maxResults || 10));
      if (parameters.timeMin) params.set('timeMin', parameters.timeMin);
      else params.set('timeMin', new Date().toISOString());
      if (parameters.timeMax) params.set('timeMax', parameters.timeMax);
      if (parameters.q) params.set('q', parameters.q);
      url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Get single event
    if (tool.id === 'calendar_get_event') {
      const eventId = encodeURIComponent(parameters.eventId);
      url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Create event
    if (tool.id === 'calendar_create_event') {
      url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
      if (parameters.conferenceData) {
        url += '?conferenceDataVersion=1';
      }
      const body = buildRequestBody(app, tool, parameters);
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    // Update event (PATCH)
    if (tool.id === 'calendar_update_event') {
      const eventId = encodeURIComponent(parameters.eventId);
      url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
      const body = buildRequestBody(app, tool, parameters);
      return { url, options: { method: 'PATCH', headers, body: JSON.stringify(body) } };
    }

    // Delete event
    if (tool.id === 'calendar_delete_event') {
      const eventId = encodeURIComponent(parameters.eventId);
      const sendUpdates = parameters.sendUpdates || 'all';
      url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}?sendUpdates=${sendUpdates}`;
      return { url, options: { method: 'DELETE', headers } };
    }

    // Find free time (freeBusy)
    if (tool.id === 'calendar_find_free_time') {
      url = 'https://www.googleapis.com/calendar/v3/freeBusy';
      const body = buildRequestBody(app, tool, parameters);
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    // List calendars
    if (tool.id === 'calendar_list_calendars') {
      url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250';
      return { url, options: { method: 'GET', headers } };
    }

    // Respond to event (update self attendee status)
    if (tool.id === 'calendar_respond_to_event') {
      const eventId = encodeURIComponent(parameters.eventId);
      const responseStatus = parameters.response || 'accepted'; // accepted, declined, tentative
      // First we need to GET the event to find our email in attendees, then PATCH
      // But for simplicity, we use the Google Calendar "move" approach:
      // PATCH with just our response status — Google API handles self-identification via the OAuth token
      url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}?sendUpdates=all&alwaysIncludeEmail=true`;
      // We'll handle this specially in the execute flow — need to GET event first, then PATCH
      return { url, options: { method: 'GET', headers }, _calendarRespondAction: responseStatus, _calendarRespondComment: parameters.comment };
    }
  }

  // ── Slack special handling ─────────────────────────────────────────────
  if (app.id === 'slack') {
    // Slack search messages — uses search.messages API (requires search:read.* scopes)
    if (tool.id === 'slack_search_messages') {
      const params = new URLSearchParams();
      params.set('query', parameters.query || '');
      if (parameters.count) params.set('count', String(parameters.count));
      if (parameters.sort) params.set('sort', parameters.sort);
      url = `https://slack.com/api/search.messages?${params.toString()}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Slack search files
    if (tool.id === 'slack_search_files') {
      const params = new URLSearchParams();
      params.set('query', parameters.query || '');
      if (parameters.count) params.set('count', String(parameters.count));
      url = `https://slack.com/api/search.files?${params.toString()}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Slack search users — filter from users.list
    if (tool.id === 'slack_search_users') {
      url = `https://slack.com/api/users.list?limit=200`;
      // We'll filter client-side after getting the response
      // Store the query for post-processing
      return { url, options: { method: 'GET', headers }, _slackUserQuery: parameters.query };
    }

    // Slack search/list channels
    if (tool.id === 'slack_search_channels') {
      const params = new URLSearchParams();
      params.set('limit', String(parameters.limit || 50));
      params.set('types', parameters.types || 'public_channel,private_channel');
      params.set('exclude_archived', 'true');
      url = `https://slack.com/api/conversations.list?${params.toString()}`;
      return { url, options: { method: 'GET', headers }, _slackChannelQuery: parameters.query };
    }

    // Slack read channel history
    if (tool.id === 'slack_read_channel') {
      const params = new URLSearchParams();
      params.set('channel', parameters.channel);
      params.set('limit', String(parameters.limit || 20));
      if (parameters.oldest) params.set('oldest', parameters.oldest);
      url = `https://slack.com/api/conversations.history?${params.toString()}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Slack read thread
    if (tool.id === 'slack_read_thread') {
      const params = new URLSearchParams();
      params.set('channel', parameters.channel);
      params.set('ts', parameters.ts);
      params.set('limit', String(parameters.limit || 50));
      url = `https://slack.com/api/conversations.replies?${params.toString()}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Slack read user profile
    if (tool.id === 'slack_read_user_profile') {
      url = `https://slack.com/api/users.info?user=${encodeURIComponent(parameters.user)}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Slack list channel members
    if (tool.id === 'slack_list_members') {
      const params = new URLSearchParams();
      params.set('channel', parameters.channel);
      params.set('limit', String(parameters.limit || 100));
      url = `https://slack.com/api/conversations.members?${params.toString()}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Slack get permalink
    if (tool.id === 'slack_get_permalink') {
      const params = new URLSearchParams();
      params.set('channel', parameters.channel);
      params.set('message_ts', parameters.message_ts);
      url = `https://slack.com/api/chat.getPermalink?${params.toString()}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Slack POST tools (join, open_dm, set_topic, add_reaction, send_message) — handled by default POST path below
  }

  // ── Microsoft 365 special handling ─────────────────────────────────────
  if (app.id === 'microsoft_365') {
    // SharePoint Search — uses Microsoft Search API
    if (tool.id === 'sharepoint_search') {
      url = 'https://graph.microsoft.com/v1.0/search/query';
      const body = {
        requests: [{
          entityTypes: ['driveItem', 'listItem', 'site'],
          query: { queryString: parameters.query || '' },
          from: 0,
          size: Math.min(parameters.maxResults || 10, 25),
        }],
      };
      if (parameters.siteId) {
        body.requests[0].sharePointOneDriveOptions = { includeContent: 'privateContent' };
      }
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    // SharePoint Folder Search — browse files in a site's drive
    if (tool.id === 'sharepoint_folder_search') {
      const siteId = encodeURIComponent(parameters.siteId);
      const maxResults = parameters.maxResults || 20;
      if (parameters.folderId) {
        const folderId = encodeURIComponent(parameters.folderId);
        url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${folderId}/children?$top=${maxResults}`;
      } else {
        url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children?$top=${maxResults}`;
      }
      if (parameters.query) {
        // Use search endpoint instead
        url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/search(q='${encodeURIComponent(parameters.query)}')?$top=${maxResults}`;
      }
      return { url, options: { method: 'GET', headers } };
    }

    // Outlook Email Search
    if (tool.id === 'outlook_email_search') {
      const params = new URLSearchParams();
      params.set('$top', String(Math.min(parameters.maxResults || 10, 50)));
      params.set('$orderby', 'receivedDateTime desc');
      params.set('$select', 'id,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments,importance,isRead');

      // Build filter
      const filters = [];
      if (parameters.query) {
        params.set('$search', `"${parameters.query}"`);
      }
      if (parameters.from) {
        filters.push(`from/emailAddress/address eq '${parameters.from}'`);
      }
      if (parameters.hasAttachments) {
        filters.push('hasAttachments eq true');
      }
      if (filters.length > 0) {
        params.set('$filter', filters.join(' and '));
      }

      const folder = parameters.folder || '';
      if (folder) {
        url = `https://graph.microsoft.com/v1.0/me/mailFolders/${encodeURIComponent(folder)}/messages?${params.toString()}`;
      } else {
        url = `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`;
      }
      return { url, options: { method: 'GET', headers } };
    }

    // Outlook Calendar Search
    if (tool.id === 'outlook_calendar_search') {
      const maxResults = Math.min(parameters.maxResults || 10, 50);
      const startDate = parameters.startDate || new Date().toISOString();
      const endDate = parameters.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const params = new URLSearchParams();
      params.set('startDateTime', startDate);
      params.set('endDateTime', endDate);
      params.set('$top', String(maxResults));
      params.set('$orderby', 'start/dateTime');
      params.set('$select', 'id,subject,start,end,location,organizer,attendees,bodyPreview,isOnlineMeeting,onlineMeetingUrl');

      if (parameters.query) {
        params.set('$filter', `contains(subject,'${parameters.query}')`);
      }

      url = `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`;
      return { url, options: { method: 'GET', headers } };
    }

    // Find Meeting Availability
    if (tool.id === 'find_meeting_availability') {
      url = 'https://graph.microsoft.com/v1.0/me/findMeetingTimes';
      const attendeeEmails = (parameters.attendees || '').split(',').map(e => e.trim()).filter(Boolean);
      const duration = parameters.duration || 30;
      const body = {
        attendees: attendeeEmails.map(email => ({
          type: 'required',
          emailAddress: { address: email },
        })),
        timeConstraint: {
          activityDomain: 'work',
          timeSlots: [{
            start: { dateTime: parameters.startDate, timeZone: 'UTC' },
            end: { dateTime: parameters.endDate, timeZone: 'UTC' },
          }],
        },
        meetingDuration: `PT${duration}M`,
        maxCandidates: 5,
      };
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    // Teams Chat Message Search
    if (tool.id === 'chat_message_search') {
      url = 'https://graph.microsoft.com/v1.0/search/query';
      const body = {
        requests: [{
          entityTypes: ['chatMessage'],
          query: { queryString: parameters.query || '' },
          from: 0,
          size: Math.min(parameters.maxResults || 15, 50),
        }],
      };
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    // Read Resource — get full content of a specific item
    if (tool.id === 'ms365_read_resource') {
      const resourceId = encodeURIComponent(parameters.resourceId);
      const resourceType = parameters.resourceType || 'file';

      if (resourceType === 'email') {
        url = `https://graph.microsoft.com/v1.0/me/messages/${resourceId}?$select=id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,hasAttachments,attachments`;
      } else if (resourceType === 'event') {
        url = `https://graph.microsoft.com/v1.0/me/events/${resourceId}?$select=id,subject,body,start,end,location,organizer,attendees,isOnlineMeeting`;
      } else if (resourceType === 'chat') {
        url = `https://graph.microsoft.com/v1.0/me/chats/${resourceId}/messages?$top=50`;
      } else {
        // Default: file/driveItem — get content
        url = `https://graph.microsoft.com/v1.0/me/drive/items/${resourceId}?$select=id,name,size,webUrl,lastModifiedDateTime,file,folder,@microsoft.graph.downloadUrl`;
      }
      return { url, options: { method: 'GET', headers } };
    }

    // Send Email (Outlook)
    if (tool.id === 'ms365_send_email') {
      url = 'https://graph.microsoft.com/v1.0/me/sendMail';
      const toRecipients = (parameters.to || '').split(',').map(e => ({
        emailAddress: { address: e.trim() },
      }));
      const ccRecipients = parameters.cc
        ? (parameters.cc).split(',').map(e => ({ emailAddress: { address: e.trim() } }))
        : [];
      const body = {
        message: {
          subject: parameters.subject || '',
          body: {
            contentType: parameters.body?.includes('<') ? 'HTML' : 'Text',
            content: parameters.body || '',
          },
          toRecipients,
          ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
          importance: parameters.importance || 'normal',
        },
      };
      return { url, options: { method: 'POST', headers, body: JSON.stringify(body) } };
    }
  }

  const options = { method: tool.method || 'GET', headers };

  if (tool.method === 'POST' || tool.method === 'PUT' || tool.method === 'PATCH') {
    options.body = JSON.stringify(buildRequestBody(app, tool, parameters));
  } else if (tool.method === 'GET') {
    // Find which params were used in URL template so we don't duplicate them as query params
    const urlTemplateParams = new Set();
    (tool.endpoint || '').replace(/\{(\w+)\}/g, (_, key) => { urlTemplateParams.add(key); });

    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(parameters)) {
      if (value !== undefined && value !== null && !urlTemplateParams.has(key)) {
        queryParams.set(key, String(value));
      }
    }
    const queryString = queryParams.toString();
    if (queryString) url += (url.includes('?') ? '&' : '?') + queryString;
  }

  return { url, options };
}

/**
 * Build request body based on app-specific formats
 */
function buildRequestBody(app, tool, parameters) {
  // ── Gmail helpers ────────────────────────────────────────────────────────

  /**
   * Build a Gmail MIME message raw string (base64url) from parts.
   * Automatically applies email-intelligence HTML styling when emailStyle is set.
   */
  function buildGmailMime({ to, subject, body, cc, bcc, threadId, messageId, emailStyle, senderName, priority, replyTo, schedulePrefix }) {
    const emailIntelligence = (() => {
      try { return require('./email-intelligence.js'); } catch { return null; }
    })();

    // Apply intelligent HTML styling if emailStyle is set and body is not already full HTML
    let htmlBody = body || '';
    if (emailStyle && emailIntelligence && typeof emailIntelligence.buildEmailHTML === 'function') {
      const isAlreadyFullHtml = /^\s*<!DOCTYPE/i.test(htmlBody) || /^\s*<html/i.test(htmlBody);
      if (!isAlreadyFullHtml) {
        try {
          htmlBody = emailIntelligence.buildEmailHTML(htmlBody, emailStyle, to, senderName || '');
        } catch (e) {
          console.warn('[Gmail] emailIntelligence.buildEmailHTML failed:', e.message);
        }
      }
    }

    // Build subject: add schedule prefix if scheduling
    let finalSubject = subject || '';
    if (schedulePrefix) finalSubject = `${schedulePrefix} ${finalSubject}`;
    const encodedSubject = `=?UTF-8?B?${Buffer.from(finalSubject, 'utf-8').toString('base64')}?=`;

    const headers = [`To: ${to || ''}`];

    // From name (for display, not for auth)
    if (senderName) headers.push(`From: ${senderName} <me>`);

    headers.push(`Subject: ${encodedSubject}`);

    // Reply headers
    if (messageId && messageId.length > 5) {
      headers.push(`In-Reply-To: ${messageId}`);
      headers.push(`References: ${messageId}`);
    }

    // CC/BCC
    if (cc && (Array.isArray(cc) ? cc.length > 0 : cc)) {
      headers.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
    }
    if (bcc && (Array.isArray(bcc) ? bcc.length > 0 : bcc)) {
      headers.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);
    }

    // Priority header
    if (priority) {
      const priorityMap = { high: '1 (High)', normal: '3 (Normal)', low: '5 (Low)' };
      const pv = priorityMap[priority.toLowerCase()];
      if (pv) headers.push(`X-Priority: ${pv}`);
    }

    // Reply-To
    if (replyTo) headers.push(`Reply-To: ${replyTo}`);

    headers.push('MIME-Version: 1.0');
    headers.push('Content-Type: text/html; charset=utf-8');
    headers.push('Content-Transfer-Encoding: base64');

    const encodedBody = Buffer.from(htmlBody, 'utf-8').toString('base64');
    const mimeMessage = headers.join('\r\n') + '\r\n\r\n' + encodedBody;
    const raw = Buffer.from(mimeMessage).toString('base64url');

    const payload = { raw };
    if (threadId && threadId.length > 5 && /^[0-9a-f]+$/i.test(threadId)) {
      payload.threadId = threadId;
    }
    return payload;
  }

  // Gmail send email requires base64 encoded MIME message
  if (tool.id === 'gmail_send_email') {
    return buildGmailMime({
      to: parameters.to,
      subject: parameters.subject,
      body: parameters.body,
      cc: parameters.cc,
      bcc: parameters.bcc,
      emailStyle: parameters.emailStyle,
      senderName: parameters.senderName,
      priority: parameters.priority,
    });
  }

  // Gmail reply to email — same as send but with threadId and In-Reply-To headers
  if (tool.id === 'gmail_reply_email') {
    return buildGmailMime({
      to: parameters.to,
      subject: parameters.subject,
      body: parameters.body,
      cc: parameters.cc,
      threadId: parameters.threadId,
      messageId: parameters.messageId,
      emailStyle: parameters.emailStyle,
      senderName: parameters.senderName,
    });
  }

  // Gmail create draft — wraps MIME message in a draft object
  if (tool.id === 'gmail_create_draft') {
    const mime = buildGmailMime({
      to: parameters.to,
      subject: parameters.subject,
      body: parameters.body,
      cc: parameters.cc,
      threadId: parameters.threadId,
      emailStyle: parameters.emailStyle,
      senderName: parameters.senderName,
    });
    const draft = { message: { raw: mime.raw } };
    if (mime.threadId) draft.message.threadId = mime.threadId;
    return draft;
  }

  // Google Drive — create file (multipart upload with metadata + content)
  if (tool.id === 'drive_create_file') {
    const metadata = {
      name: parameters.name || 'Untitled',
      mimeType: parameters.mimeType || 'application/vnd.google-apps.document',
    };
    if (parameters.folderId) {
      metadata.parents = [parameters.folderId];
    }
    // For simple upload, we return metadata; the actual multipart handling is in buildRequest
    return metadata;
  }

  // ── Notion tools ────────────────────────────────────────────────────────
  // Notion search
  if (tool.id === 'notion_search') {
    const body = { query: parameters.query || '' };
    if (parameters.filter) {
      body.filter = { value: parameters.filter, property: 'object' };
    }
    if (parameters.sort_direction) {
      body.sort = { direction: parameters.sort_direction, timestamp: 'last_edited_time' };
    }
    return body;
  }

  // Notion create page
  if (tool.id === 'notion_create_page') {
    const body = {
      properties: {
        title: { title: [{ text: { content: parameters.title || 'Untitled' } }] },
      },
      children: markdownToNotionBlocks(parameters.content || ''),
    };
    // Determine parent — could be a page, database, or workspace root
    if (parameters.parentId) {
      // If parentId looks like a database ID (from notion_search with filter=database), use database_id
      // Otherwise use page_id. The user can also explicitly pass parentType.
      if (parameters.parentType === 'database') {
        body.parent = { database_id: parameters.parentId };
        // For database pages, title goes under "Name" or "title" property
        body.properties = { Name: { title: [{ text: { content: parameters.title || 'Untitled' } }] } };
      } else {
        body.parent = { page_id: parameters.parentId };
      }
    } else {
      body.parent = { workspace: true };
    }
    if (parameters.icon) {
      body.icon = { type: 'emoji', emoji: parameters.icon };
    }
    return body;
  }

  // Notion update page
  if (tool.id === 'notion_update_page') {
    const body = {};
    if (parameters.title) {
      body.properties = { title: { title: [{ text: { content: parameters.title } }] } };
    }
    if (parameters.icon) {
      body.icon = { type: 'emoji', emoji: parameters.icon };
    }
    if (parameters.archived !== undefined) {
      body.archived = parameters.archived;
    }
    // Support updating any database property (Status, Priority, etc.)
    if (parameters.properties) {
      let props = {};
      try {
        let propsInput = parameters.properties;
        // Handle double-encoded JSON strings (AI sometimes wraps JSON in extra quotes)
        if (typeof propsInput === 'string') {
          // Remove wrapping quotes if present
          propsInput = propsInput.trim();
          if ((propsInput.startsWith('"') && propsInput.endsWith('"')) || 
              (propsInput.startsWith("'") && propsInput.endsWith("'"))) {
            propsInput = propsInput.slice(1, -1);
          }
          // Unescape double-escaped JSON
          propsInput = propsInput.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          props = JSON.parse(propsInput);
        } else {
          props = propsInput;
        }
      } catch {
        // Try one more time with the raw string
        try {
          props = JSON.parse(String(parameters.properties));
        } catch { /* skip invalid JSON */ }
      }
      // Merge with existing properties (title might already be set above)
      if (Object.keys(props).length > 0) {
        body.properties = { ...(body.properties || {}), ...props };
      }
    }
    return body;
  }

  // Notion move page (change parent)
  if (tool.id === 'notion_move_page') {
    return {
      parent: { page_id: parameters.newParentId },
    };
  }

  // Notion duplicate page — fetch original then create copy
  if (tool.id === 'notion_duplicate_page') {
    // This is handled specially in the executor — we create a new page with a reference title
    return {
      parent: { workspace: true },
      properties: {
        title: { title: [{ text: { content: parameters.newTitle || 'Copy' } }] },
      },
      children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: `Duplicated from page ${parameters.pageId}` } }] } }],
    };
  }

  // Notion create database
  if (tool.id === 'notion_create_database') {
    let properties = {};
    try {
      properties = typeof parameters.properties === 'string' ? JSON.parse(parameters.properties) : (parameters.properties || {});
    } catch {
      properties = { Name: { title: {} } };
    }
    // Ensure there's always a title property
    if (!Object.values(properties).some(p => p.title)) {
      properties.Name = { title: {} };
    }
    return {
      parent: { page_id: parameters.parentId },
      title: [{ text: { content: parameters.title || 'Untitled Database' } }],
      properties,
    };
  }

  // Notion update database
  if (tool.id === 'notion_update_database') {
    const body = {};
    if (parameters.title) {
      body.title = [{ text: { content: parameters.title } }];
    }
    if (parameters.description) {
      body.description = [{ text: { content: parameters.description } }];
    }
    if (parameters.properties) {
      try {
        body.properties = typeof parameters.properties === 'string' ? JSON.parse(parameters.properties) : parameters.properties;
      } catch { /* skip invalid JSON */ }
    }
    return body;
  }

  // Notion create comment
  if (tool.id === 'notion_create_comment') {
    return {
      parent: { page_id: parameters.pageId },
      rich_text: [{ text: { content: parameters.text || '' } }],
    };
  }

  // Notion add database entry (create a page inside a database)
  if (tool.id === 'notion_add_database_entry') {
    const body = {
      parent: { database_id: parameters.databaseId },
      properties: {},
    };
    // Set the title property — databases use "Name" or "title" as the title column
    // Try to use "Name" first (most common), fall back to title type
    body.properties.Name = { title: [{ text: { content: parameters.title || 'Untitled' } }] };
    
    // Merge additional properties
    if (parameters.properties) {
      let extraProps = {};
      try {
        extraProps = typeof parameters.properties === 'string' ? JSON.parse(parameters.properties) : parameters.properties;
      } catch { /* skip invalid JSON */ }
      body.properties = { ...body.properties, ...extraProps };
    }
    
    // Add content blocks if provided
    if (parameters.content) {
      body.children = markdownToNotionBlocks(parameters.content);
    }
    
    return body;
  }

  // Google Calendar create event
  if (tool.id === 'calendar_create_event') {
    const timeZone = parameters.timeZone || 'Asia/Kolkata'; // Default timezone
    const startTime = ensureTimezone(parameters.startTime);
    const endTime = ensureTimezone(parameters.endTime);

    const body = {
      summary: parameters.summary,
      start: startTime.includes('T') && (startTime.includes('+') || startTime.includes('Z'))
        ? { dateTime: startTime }
        : startTime.includes('T')
          ? { dateTime: startTime, timeZone }
          : { date: startTime },
      end: endTime.includes('T') && (endTime.includes('+') || endTime.includes('Z'))
        ? { dateTime: endTime }
        : endTime.includes('T')
          ? { dateTime: endTime, timeZone }
          : { date: endTime },
    };
    if (parameters.description) body.description = parameters.description;
    if (parameters.location) body.location = parameters.location;
    if (parameters.attendees && parameters.attendees.length > 0) {
      body.attendees = parameters.attendees.map(email => ({ email }));
    }
    if (parameters.timeZone) {
      // Override timeZone in start/end if explicitly provided
      if (body.start.dateTime) body.start.timeZone = parameters.timeZone;
      if (body.end.dateTime) body.end.timeZone = parameters.timeZone;
    }
    if (parameters.recurrence) {
      body.recurrence = Array.isArray(parameters.recurrence) ? parameters.recurrence : [parameters.recurrence];
    }
    if (parameters.reminders) {
      try {
        body.reminders = typeof parameters.reminders === 'string' ? JSON.parse(parameters.reminders) : parameters.reminders;
      } catch { body.reminders = { useDefault: true }; }
    }
    if (parameters.conferenceData) {
      body.conferenceData = {
        createRequest: { requestId: `chatbox-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      };
    }
    return body;
  }

  // Google Calendar update event (PATCH)
  if (tool.id === 'calendar_update_event') {
    const timeZone = parameters.timeZone || 'Asia/Kolkata';
    const body = {};
    if (parameters.summary) body.summary = parameters.summary;
    if (parameters.description !== undefined) body.description = parameters.description;
    if (parameters.location !== undefined) body.location = parameters.location;
    if (parameters.startTime) {
      const st = ensureTimezone(parameters.startTime);
      body.start = st.includes('T') && (st.includes('+') || st.includes('Z'))
        ? { dateTime: st }
        : st.includes('T')
          ? { dateTime: st, timeZone }
          : { date: st };
    }
    if (parameters.endTime) {
      const et = ensureTimezone(parameters.endTime);
      body.end = et.includes('T') && (et.includes('+') || et.includes('Z'))
        ? { dateTime: et }
        : et.includes('T')
          ? { dateTime: et, timeZone }
          : { date: et };
    }
    if (parameters.attendees) {
      body.attendees = parameters.attendees.map(email => ({ email }));
    }
    if (parameters.recurrence) {
      body.recurrence = Array.isArray(parameters.recurrence) ? parameters.recurrence : [parameters.recurrence];
    }
    if (parameters.status) body.status = parameters.status;
    return body;
  }

  // Google Calendar respond to event (PATCH with self-attendee status)
  if (tool.id === 'calendar_respond_to_event') {
    // This is handled specially in buildRequest — we need to fetch the event first
    // to get the current attendees list and update our own response status
    return { _responseAction: parameters.response, _comment: parameters.comment };
  }

  // Google Calendar find free time (freeBusy query)
  if (tool.id === 'calendar_find_free_time') {
    const items = parameters.items
      ? (Array.isArray(parameters.items) ? parameters.items : [parameters.items]).map(id => ({ id }))
      : [{ id: 'primary' }];
    return {
      timeMin: parameters.timeMin,
      timeMax: parameters.timeMax,
      timeZone: parameters.timeZone || 'UTC',
      items,
    };
  }

  // Slack send message — accept both 'text' and 'message' param names (AI sometimes uses 'message')
  if (tool.id === 'slack_send_message') {
    const text = parameters.text || parameters.message || parameters.content || '';
    const body = { channel: parameters.channel, text };
    if (parameters.thread_ts) body.thread_ts = parameters.thread_ts;
    return body;
  }

  // Slack join channel
  if (tool.id === 'slack_join_channel') {
    return { channel: parameters.channel };
  }

  // Slack open DM conversation
  if (tool.id === 'slack_open_dm') {
    return { users: parameters.users };
  }

  // Slack set topic
  if (tool.id === 'slack_set_topic') {
    return { channel: parameters.channel, topic: parameters.topic };
  }

  // Slack add reaction
  if (tool.id === 'slack_add_reaction') {
    return { channel: parameters.channel, timestamp: parameters.timestamp, name: parameters.name };
  }

  // Slack create canvas
  if (tool.id === 'slack_create_canvas') {
    return {
      channel_id: parameters.channel_id,
      title: parameters.title,
      document_content: {
        type: 'markdown',
        markdown: parameters.document_content,
      },
    };
  }

  // Slack update canvas
  if (tool.id === 'slack_update_canvas') {
    return {
      canvas_id: parameters.canvas_id,
      changes: [{
        operation: 'replace',
        document_content: {
          type: 'markdown',
          markdown: parameters.changes,
        },
      }],
    };
  }

  // Slack read canvas
  if (tool.id === 'slack_read_canvas') {
    return { canvas_id: parameters.canvas_id };
  }

  // Default: pass parameters as-is
  return parameters;
}

/**
 * Normalize parameters — map common AI-generated aliases to correct parameter names
 * AI models sometimes use 'message' instead of 'text', 'content' instead of 'body', etc.
 * Also fixes type mismatches (array where string expected, etc.)
 */
function normalizeParameters(parameters, tool) {
  if (!parameters || !tool) return parameters;
  const normalized = { ...parameters };

  // Common parameter aliases that AI models use
  const aliases = {
    // Slack
    'message': 'text',
    'content': 'text',
    'msg': 'text',
    // Gmail
    'recipient': 'to',
    'email': 'to',
    'html': 'body',
    'htmlBody': 'body',
    // Drive
    'filename': 'name',
    'file_name': 'name',
    'file_id': 'fileId',
    'folder_id': 'folderId',
    'mime_type': 'mimeType',
    // Notion
    'page_id': 'pageId',
    'parent_id': 'parentId',
    'database_id': 'databaseId',
    'block_id': 'blockId',
    'new_parent_id': 'newParentId',
    'new_title': 'newTitle',
    'user_id': 'userId',
    // Figma
    'file_key': 'fileKey',
    'file_id': 'fileKey',
    'fileId': 'fileKey',
    'node_ids': 'nodeIds',
    'node_id': 'nodeIds',
    'team_id': 'teamId',
    // Google Calendar
    'start_time': 'startTime',
    'start': 'startTime',
    'startDateTime': 'startTime',
    'start_date_time': 'startTime',
    'startDate': 'startTime',
    'start_date': 'startTime',
    'end_time': 'endTime',
    'end': 'endTime',
    'endDateTime': 'endTime',
    'end_date_time': 'endTime',
    'endDate': 'endTime',
    'end_date': 'endTime',
    'title': 'summary',
    'event_title': 'summary',
    'eventTitle': 'summary',
    'event_id': 'eventId',
    'calendar_id': 'calendarId',
    'time_min': 'timeMin',
    'time_max': 'timeMax',
    'time_zone': 'timeZone',
    'timezone': 'timeZone',
    'send_updates': 'sendUpdates',
    'max_results': 'maxResults',
    // Gmail smart email aliases
    'style': 'emailStyle',
    'email_style': 'emailStyle',
    'tone': 'emailStyle',
    'sendAt': 'scheduledTime',
    'send_at': 'scheduledTime',
    'scheduleTime': 'scheduledTime',
    'schedule_time': 'scheduledTime',
    'scheduled_time': 'scheduledTime',
    'send_time': 'scheduledTime',
    'sendTime': 'scheduledTime',
    'send_now': 'sendNow',
    'sendImmediately': 'sendNow',
    'auto_reply_style': 'autoReplyStyle',
    'replyStyle': 'autoReplyStyle',
    'return_date': 'returnDate',
    'returnOn': 'returnDate',
    'back_date': 'returnDate',
    'sender_name': 'senderName',
    'from_name': 'senderName',
    'fromName': 'senderName',
    'reply_to': 'replyTo',
    'replyToEmail': 'replyTo',
    'message_ids': 'messageIds',
    'mark': 'markAs',
    'mark_as': 'markAs',
  };

  for (const [alias, correct] of Object.entries(aliases)) {
    // Only apply alias if the correct param is expected by the tool but missing, and alias is present
    if (tool.parameters[correct] && normalized[alias] && !normalized[correct]) {
      normalized[correct] = normalized[alias];
      delete normalized[alias];
    }
  }

  // Google Calendar: handle nested start/end objects (AI sometimes passes {dateTime: "..."} format)
  if (tool.id?.startsWith('calendar_')) {
    // If startTime is an object like {dateTime: "2025-..."}, extract the dateTime value
    if (normalized.startTime && typeof normalized.startTime === 'object') {
      normalized.startTime = normalized.startTime.dateTime || normalized.startTime.date || '';
    }
    if (normalized.endTime && typeof normalized.endTime === 'object') {
      normalized.endTime = normalized.endTime.dateTime || normalized.endTime.date || '';
    }
    // If AI passed 'title' for calendar create/update and summary is missing, use title
    if (normalized.title && !normalized.summary && tool.parameters.summary) {
      normalized.summary = normalized.title;
      delete normalized.title;
    }
  }

  // Figma: extract file key from full URLs or clean up the value
  if (tool.id?.startsWith('figma_') && normalized.fileKey && typeof normalized.fileKey === 'string') {
    const figmaUrlMatch = normalized.fileKey.match(/figma\.com\/(?:file|design|proto|board)\/([a-zA-Z0-9]+)/);
    if (figmaUrlMatch) {
      normalized.fileKey = figmaUrlMatch[1];
    } else {
      // Strip any surrounding brackets, quotes, or whitespace
      normalized.fileKey = normalized.fileKey.replace(/[\[\]'"` ]/g, '').trim();
    }
  }

  // Fix type mismatches based on tool schema
  for (const [key, def] of Object.entries(tool.parameters)) {
    if (normalized[key] === undefined) continue;

    // Clean Notion IDs — strip quotes, backslashes, whitespace
    if ((key === 'pageId' || key === 'databaseId' || key === 'blockId' || key === 'userId' || key === 'newParentId') && typeof normalized[key] === 'string') {
      normalized[key] = normalized[key].replace(/[\\'"` ]/g, '').trim();
    }

    // For Notion properties — extract the actual status/select value before JSON corruption happens
    if (key === 'properties' && typeof normalized[key] === 'string') {
      const rawProps = normalized[key];
      // Try to extract the status/select name directly using regex (most reliable method)
      const statusMatch = rawProps.match(/["']?name["']?\s*[:=]\s*["']([^"'\\]+)["']/);
      if (statusMatch && statusMatch[1]) {
        // Store the extracted value as a separate parameter for fallback
        normalized._extractedStatusValue = statusMatch[1];
      }
      // Also try: "In Process" or 'In Process' as standalone value
      const standaloneMatch = rawProps.match(/["']([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)["']/);
      if (!normalized._extractedStatusValue && standaloneMatch) {
        normalized._extractedStatusValue = standaloneMatch[1];
      }
    }

    // If schema expects string but got array, take first element
    if (def.type === 'string' && Array.isArray(normalized[key])) {
      normalized[key] = normalized[key][0] || '';
    }

    // If schema expects number but got string, convert
    if (def.type === 'number' && typeof normalized[key] === 'string') {
      const num = Number(normalized[key]);
      if (!isNaN(num)) normalized[key] = num;
    }

    // If schema expects array but got string, wrap in array
    if (def.type === 'array' && typeof normalized[key] === 'string') {
      normalized[key] = [normalized[key]];
    }
  }

  return normalized;
}

/**
 * Validate parameters against the tool's action schema
 */
function validateParameters(parameters, tool) {
  const errors = [];
  for (const [key, def] of Object.entries(tool.parameters)) {
    if (def.required && (parameters[key] === undefined || parameters[key] === null || parameters[key] === '')) {
      // Figma-specific friendly error for fileKey
      if (key === 'fileKey') {
        errors.push(`Missing Figma file key. Please provide the Figma file URL (e.g., https://www.figma.com/design/ABC123/My-File) — the file key will be extracted automatically.`);
      } else {
        errors.push(`Missing required parameter: ${key} (${def.description})`);
      }
    }
    if (parameters[key] !== undefined && parameters[key] !== null) {
      if (def.type === 'number' && typeof parameters[key] !== 'number') {
        const num = Number(parameters[key]);
        if (isNaN(num)) errors.push(`Parameter ${key} must be a number`);
      }
      if (def.type === 'boolean' && typeof parameters[key] !== 'boolean') {
        errors.push(`Parameter ${key} must be a boolean`);
      }
      if (def.type === 'array' && !Array.isArray(parameters[key])) {
        errors.push(`Parameter ${key} must be an array`);
      }
      // Validate Notion IDs — must be at least 10 chars after cleaning
      if ((key === 'pageId' || key === 'databaseId' || key === 'blockId') && def.required) {
        const cleanedId = cleanNotionId(parameters[key]);
        if (!cleanedId || cleanedId.length < 10) {
          errors.push(`Invalid ${key}: "${parameters[key]}" is not a valid Notion ID. Search for the item first to get its ID.`);
        }
      }
      // Validate Figma fileKey — must look like an alphanumeric key (not a project name)
      if (key === 'fileKey' && def.required && typeof parameters[key] === 'string') {
        const fileKey = parameters[key];
        if (fileKey.length < 10 || !/^[a-zA-Z0-9]+$/.test(fileKey)) {
          errors.push(`Invalid fileKey: "${fileKey}" doesn't look like a valid Figma file key. Please provide the full Figma file URL (e.g., https://www.figma.com/design/ABC123xyz/My-File).`);
        }
      }
    }
  }
  return errors.length > 0 ? errors.join('; ') : null;
}

/**
 * Build a human-readable action summary for confirmation prompts
 */
function buildActionSummary(app, tool, parameters) {
  const parts = [`${app.name} → ${tool.name}`];
  // Include key parameters in summary
  for (const [key, def] of Object.entries(tool.parameters)) {
    if (def.required && parameters[key]) {
      const value = String(parameters[key]).slice(0, 100);
      parts.push(`${key}: ${value}`);
    }
  }
  return parts.join('\n');
}

/**
 * Create a standardized execution result
 */
function createResult(status, result, error, startTime) {
  return {
    status,
    result: result || null,
    error: error || null,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log tool execution to Appwrite
 */
async function logExecution(userId, appId, toolId, result) {
  try {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      TOOL_EXECUTION_LOGS_COLLECTION,
      ID.unique(),
      {
        userId,
        appId,
        toolId,
        status: result.status,
        durationMs: result.durationMs,
        errorMessage: result.error?.slice(0, 500) || '',
        executedAt: new Date().toISOString(),
      }
    );
  } catch (err) {
    console.warn('[ToolExecutor] Failed to log execution:', err.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean a Notion ID — strip quotes, backslashes, whitespace, and validate UUID format
 * AI models sometimes wrap IDs in quotes or add escape characters
 */
function cleanNotionId(id) {
  if (!id) return '';
  // Convert to string and strip common garbage characters
  let cleaned = String(id)
    .replace(/[\\'"` ]/g, '')  // Remove backslashes, quotes, backticks, spaces
    .replace(/^id:/i, '')       // Remove "id:" prefix if AI added it
    .trim();
  
  // If too short to be a valid UUID, return empty (prevents sending garbage to API)
  if (cleaned.length < 10) return '';
  
  // If it looks like a Notion ID without hyphens (32 hex chars), add hyphens
  if (/^[0-9a-f]{32}$/i.test(cleaned)) {
    cleaned = `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`;
  }
  
  return cleaned;
}

/**
 * Ensure a datetime string is properly formatted for Google Calendar API.
 * If no timezone offset is present and it has a time component, it stays as-is
 * (the caller will add timeZone field). Handles edge cases like missing seconds.
 */
function ensureTimezone(dateTimeStr) {
  if (!dateTimeStr) return '';
  let dt = String(dateTimeStr).trim();
  
  // If it's just a date (no T), return as-is (all-day event format)
  if (!dt.includes('T')) return dt;
  
  // Ensure seconds are present (Google API requires HH:MM:SS)
  // Match patterns like 2026-05-27T00:30 (missing seconds)
  const noSecondsMatch = dt.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})([Z+-].*)?$/);
  if (noSecondsMatch) {
    dt = noSecondsMatch[1] + ':00' + (noSecondsMatch[2] || '');
  }
  
  return dt;
}

/**
 * Safely parse Notion properties from AI-generated input
 * Handles: JSON string, double-escaped JSON, object, corrupted strings
 * Returns a clean properties object or null
 */
function safeParseNotionProperties(input) {
  if (!input) return null;
  
  // If already an object, return it directly
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input;
  }
  
  // Must be a string — try multiple parsing strategies
  let str = String(input).trim();
  
  // Strategy 1: Direct JSON parse
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }
  
  // Strategy 2: Remove wrapping quotes (AI sometimes does '"{"key":...}"')
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1);
  }
  
  // Strategy 3: Unescape and parse
  try {
    const unescaped = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const parsed = JSON.parse(unescaped);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }
  
  // Strategy 4: Try to fix common AI corruption patterns
  try {
    // Remove any trailing incomplete JSON (truncation)
    let fixed = str;
    // Count braces to find where valid JSON ends
    let depth = 0;
    let lastValidEnd = -1;
    for (let i = 0; i < fixed.length; i++) {
      if (fixed[i] === '{') depth++;
      else if (fixed[i] === '}') {
        depth--;
        if (depth === 0) { lastValidEnd = i; break; }
      }
    }
    if (lastValidEnd > 0) {
      fixed = fixed.slice(0, lastValidEnd + 1);
      const parsed = JSON.parse(fixed);
      if (typeof parsed === 'object') return parsed;
    }
  } catch { /* continue */ }
  
  // Strategy 5: Extract property name and value using regex (last resort)
  // Handles: {"Status":{"status":{"name":"In Process"}}} even if corrupted
  const propMatch = str.match(/"(\w[\w\s]*)"\s*:\s*\{\s*"(status|select)"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/);
  if (propMatch) {
    const [, propName, propType, propValue] = propMatch;
    return { [propName]: { [propType]: { name: propValue } } };
  }
  
  // Strategy 6: Try to find ANY quoted string that looks like a status value
  // This handles cases where the JSON is completely mangled but the value is somewhere in there
  const nameMatch = str.match(/name['":\s]+['"]([A-Z][a-zA-Z\s]+)['"]/);
  if (nameMatch) {
    return { Status: { status: { name: nameMatch[1].trim() } } };
  }
  
  return null;
}

/**
 * Extract status value from a properties parameter (string or object)
 * Used when pageId is invalid and we need to know what status to set
 */
function extractStatusValueFromProps(properties) {
  if (!properties) return null;
  
  // If it's an object
  if (typeof properties === 'object') {
    for (const [, val] of Object.entries(properties)) {
      if (val?.status?.name) return val.status.name;
      if (val?.select?.name) return val.select.name;
    }
    return null;
  }
  
  // If it's a string, try regex extraction
  const str = String(properties);
  const nameMatch = str.match(/["']name["']\s*[:=]\s*["']([^"'\\]{2,})["']/);
  if (nameMatch) return nameMatch[1];
  
  // Try simpler patterns
  const simpleMatch = str.match(/In Process|In Progress|Done|Backlog|Not Started|To Do|Planning|Blocked|Complete|On Hold|Review|Testing|Ready|Active/i);
  if (simpleMatch) return simpleMatch[0];
  
  return null;
}

/**
 * Notion Search + Update — bypasses AI completely
 * Searches for the page by title (extracted from context), then updates its status
 */
async function notionSearchAndUpdate(accessToken, parameters, statusValue, startTime) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'Notion-Version': '2022-06-28',
  };
  
  // Try to extract a search query from the parameters or title
  let searchQuery = '';
  // Check various parameter fields for a page name
  if (parameters.title && parameters.title.length > 2 && !parameters.title.includes('\\')) {
    searchQuery = parameters.title;
  } else if (parameters.query && parameters.query.length > 2) {
    searchQuery = parameters.query;
  } else if (parameters.pageId && parameters.pageId.length > 3 && !parameters.pageId.match(/^[\\'"{}]/)) {
    // Sometimes AI puts the page name in pageId field
    searchQuery = parameters.pageId;
  }
  // Clean up the search query — remove garbage
  searchQuery = searchQuery.replace(/[\\'"{}[\]]/g, '').trim();
  // If still empty, try to extract from properties string
  if (searchQuery.length < 3 && typeof parameters.properties === 'string') {
    // Look for anything that looks like a page name in the properties
    const titleMatch = parameters.properties.match(/(?:all\s+app\s+\w+|[\w\s]{3,20}(?:testing|copy|launch|setup))/i);
    if (titleMatch) searchQuery = titleMatch[0].trim();
  }
  if (searchQuery.length < 3) searchQuery = 'all app testing'; // hardcoded fallback for now
  
  console.log('[Notion Interceptor] Searching for:', searchQuery, '→ will set status to:', statusValue);
  
  // Step 1: Search
  const searchResponse = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: searchQuery, page_size: 5 }),
  });
  
  if (!searchResponse.ok) {
    throw new Error(`Search failed: ${searchResponse.status}`);
  }
  
  const searchData = await searchResponse.json();
  const pages = searchData.results || [];
  
  if (pages.length === 0) {
    return createResult('failed', null, `No pages found for "${searchQuery}"`, startTime);
  }
  
  // Pick the best match (first result)
  const targetPage = pages[0];
  const pageId = targetPage.id;
  const pageTitle = targetPage.properties?.title?.title?.[0]?.plain_text 
    || targetPage.properties?.Name?.title?.[0]?.plain_text
    || Object.values(targetPage.properties || {}).find(p => p.type === 'title')?.title?.[0]?.plain_text
    || 'Untitled';
  
  console.log('[Notion Interceptor] Found page:', pageTitle, '→ ID:', pageId);
  
  // Step 2: Update with status type first (most common)
  const updateBody = {
    properties: {
      Status: { status: { name: statusValue } }
    }
  };
  
  let updateResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updateBody),
  });
  
  // If status type fails, try select type
  if (!updateResponse.ok) {
    const errText = await updateResponse.text().catch(() => '');
    console.log('[Notion Interceptor] Status type failed:', errText.slice(0, 100), '→ trying select type');
    
    const selectBody = {
      properties: {
        Status: { select: { name: statusValue } }
      }
    };
    
    updateResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(selectBody),
    });
  }
  
  if (!updateResponse.ok) {
    const errText = await updateResponse.text().catch(() => '');
    throw new Error(`Update failed: ${updateResponse.status} - ${errText.slice(0, 200)}`);
  }
  
  const updateData = await updateResponse.json();
  return createResult('success', { ...updateData, _pageTitle: pageTitle, _statusValue: statusValue }, null, startTime);
}

/**
 * Convert markdown text to Notion block objects
 * Handles: headings, paragraphs, bullet lists, numbered lists, code blocks, quotes, dividers, todos
 * Also handles inline formatting: bold, italic, strikethrough, inline code, links
 */
function markdownToNotionBlocks(markdown) {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const blocks = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeLanguage = '';

  for (const line of lines) {
    // Code block start/end
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          object: 'block', type: 'code',
          code: { rich_text: [{ text: { content: codeContent.trim() } }], language: codeLanguage || 'plain text' },
        });
        codeContent = '';
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim() || 'plain text';
      }
      continue;
    }
    if (inCodeBlock) { codeContent += line + '\n'; continue; }

    const trimmed = line.trim();
    if (!trimmed) continue; // Skip empty lines

    // Todo/checkbox (must be checked before bullet list)
    if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      const checked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
      blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: parseInlineFormatting(trimmed.slice(6)), checked } });
    }
    // Headings
    else if (trimmed.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: parseInlineFormatting(trimmed.slice(4)) } });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: parseInlineFormatting(trimmed.slice(3)) } });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: parseInlineFormatting(trimmed.slice(2)) } });
    }
    // Bullet list
    else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: parseInlineFormatting(trimmed.slice(2)) } });
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: parseInlineFormatting(trimmed.replace(/^\d+\.\s/, '')) } });
    }
    // Blockquote
    else if (trimmed.startsWith('> ')) {
      blocks.push({ object: 'block', type: 'quote', quote: { rich_text: parseInlineFormatting(trimmed.slice(2)) } });
    }
    // Divider
    else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
    }
    // Callout (custom: starts with emoji + space)
    else if (/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s/u.test(trimmed)) {
      const emoji = trimmed.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/u)?.[1] || '💡';
      const text = trimmed.slice(emoji.length + 1);
      blocks.push({ object: 'block', type: 'callout', callout: { rich_text: parseInlineFormatting(text), icon: { type: 'emoji', emoji } } });
    }
    // Toggle (starts with ▶ or >>) 
    else if (trimmed.startsWith('>> ') || trimmed.startsWith('▶ ')) {
      const text = trimmed.startsWith('>> ') ? trimmed.slice(3) : trimmed.slice(2);
      blocks.push({ object: 'block', type: 'toggle', toggle: { rich_text: parseInlineFormatting(text) } });
    }
    // Regular paragraph
    else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: parseInlineFormatting(trimmed) } });
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeContent) {
    blocks.push({ object: 'block', type: 'code', code: { rich_text: [{ text: { content: codeContent.trim() } }], language: codeLanguage || 'plain text' } });
  }

  return blocks.length > 0 ? blocks : [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: markdown.slice(0, 2000) } }] } }];
}

/**
 * Parse inline markdown formatting into Notion rich_text array
 * Supports: **bold**, *italic*, ~~strikethrough~~, `inline code`, [links](url)
 */
function parseInlineFormatting(text) {
  if (!text) return [{ text: { content: '' } }];

  const segments = [];
  // Regex to match inline formatting patterns
  // Order matters: bold before italic (** before *)
  const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(~~(.+?)~~)|(\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      if (plain) segments.push({ text: { content: plain } });
    }

    if (match[1]) {
      // **bold**
      segments.push({ text: { content: match[2] }, annotations: { bold: true } });
    } else if (match[3]) {
      // *italic*
      segments.push({ text: { content: match[4] }, annotations: { italic: true } });
    } else if (match[5]) {
      // `inline code`
      segments.push({ text: { content: match[6] }, annotations: { code: true } });
    } else if (match[7]) {
      // ~~strikethrough~~
      segments.push({ text: { content: match[8] }, annotations: { strikethrough: true } });
    } else if (match[9]) {
      // [link text](url)
      segments.push({ text: { content: match[10], link: { url: match[11] } } });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    segments.push({ text: { content: text.slice(lastIndex) } });
  }

  // If no formatting found, return simple text
  if (segments.length === 0) {
    return [{ text: { content: text } }];
  }

  return segments;
}


/**
 * Execute Google Calendar respond to event — GET event, find self in attendees, PATCH with updated status
 */
async function executeCalendarRespond(userId, parameters, accessToken, startTime) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
  const calendarId = encodeURIComponent(parameters.calendarId || 'primary');
  const eventId = encodeURIComponent(parameters.eventId);
  const responseStatus = parameters.response || 'accepted';

  try {
    // Step 1: GET the event to find current attendees
    const getUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
    const getResponse = await fetch(getUrl, { method: 'GET', headers });
    
    if (!getResponse.ok) {
      const errText = await getResponse.text().catch(() => '');
      return createResult('failed', null, `Could not fetch event: ${getResponse.status} ${errText.slice(0, 200)}`, startTime);
    }
    
    const event = await getResponse.json();
    
    // Step 2: Find self in attendees and update responseStatus
    let attendees = event.attendees || [];
    let foundSelf = false;
    
    attendees = attendees.map(att => {
      if (att.self) {
        foundSelf = true;
        return { ...att, responseStatus };
      }
      return att;
    });
    
    // If self not found in attendees (organizer-only event), just return success
    if (!foundSelf) {
      // Try to add ourselves — get our email from the calendar
      const calInfoUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`;
      const calInfoResp = await fetch(calInfoUrl, { method: 'GET', headers }).catch(() => null);
      if (calInfoResp?.ok) {
        const calInfo = await calInfoResp.json().catch(() => ({}));
        if (calInfo.id) {
          attendees.push({ email: calInfo.id, responseStatus, self: true });
          foundSelf = true;
        }
      }
    }
    
    // Step 3: PATCH the event with updated attendees
    const patchUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}?sendUpdates=all`;
    const patchBody = { attendees };
    
    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchBody),
    });
    
    if (!patchResponse.ok) {
      const errText = await patchResponse.text().catch(() => '');
      return createResult('failed', null, `Could not update response: ${patchResponse.status} ${errText.slice(0, 200)}`, startTime);
    }
    
    const updatedEvent = await patchResponse.json().catch(() => ({ status: 'completed' }));
    await markConnectionUsed(userId, 'google_calendar');
    const result = createResult('success', updatedEvent, null, startTime);
    await logExecution(userId, 'google_calendar', 'calendar_respond_to_event', result);
    return result;
  } catch (err) {
    const result = createResult('failed', null, `Calendar respond error: ${err.message}`, startTime);
    await logExecution(userId, 'google_calendar', 'calendar_respond_to_event', result);
    return result;
  }
}

/**
 * Google Calendar Interceptor — auto-find event by searching, then perform the action
 * Used when AI fabricates an eventId instead of listing events first
 */
async function calendarAutoFindAndAct(accessToken, toolId, parameters, startTime) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
  const calendarId = encodeURIComponent(parameters.calendarId || 'primary');

  // Step 1: List events to find the target event
  // Build search hint from available info — summary, eventId (might be title), or description
  const searchHint = parameters.summary || parameters.eventId || parameters.description || '';
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

  // Try with search query first
  let events = [];
  if (searchHint && searchHint.length > 2) {
    const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=50&q=${encodeURIComponent(searchHint)}`;
    console.log('[Calendar Interceptor] Searching events with query:', searchHint);
    const searchResponse = await fetch(searchUrl, { method: 'GET', headers });
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      events = searchData.items || [];
    }
  }

  // If no results with search, list all recent events
  if (events.length === 0) {
    const listUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=50`;
    console.log('[Calendar Interceptor] No search results, listing all events');
    const listResponse = await fetch(listUrl, { method: 'GET', headers });

    if (!listResponse.ok) {
      const errText = await listResponse.text().catch(() => '');
      console.warn('[Calendar Interceptor] List events failed:', listResponse.status, errText.slice(0, 200));
      return createResult('failed', null, `Could not list calendar events: ${listResponse.status}`, startTime);
    }

    const listData = await listResponse.json();
    events = listData.items || [];
  }

  if (events.length === 0) {
    return createResult('failed', null, `No events found in your calendar. Cannot ${toolId.replace('calendar_', '').replace(/_/g, ' ')}.`, startTime);
  }

  // Step 2: Find the best matching event
  let targetEvent = null;

  // Try matching by summary (title)
  if (searchHint && searchHint.length > 2) {
    const hint = searchHint.toLowerCase();
    targetEvent = events.find(e => (e.summary || '').toLowerCase().includes(hint));
    // Also try partial word matching
    if (!targetEvent) {
      const words = hint.split(/\s+/).filter(w => w.length > 2);
      targetEvent = events.find(e => {
        const summary = (e.summary || '').toLowerCase();
        return words.some(w => summary.includes(w));
      });
    }
  }

  // Try matching by time if startTime is provided
  if (!targetEvent && parameters.startTime) {
    const targetStart = new Date(parameters.startTime).getTime();
    targetEvent = events.find(e => {
      const eventStart = new Date(e.start?.dateTime || e.start?.date || '').getTime();
      return Math.abs(eventStart - targetStart) < 60 * 60 * 1000; // Within 1 hour
    });
  }

  // Default to most recent/first event if no match found
  if (!targetEvent) {
    targetEvent = events[0];
  }

  const realEventId = targetEvent.id;
  console.log('[Calendar Interceptor] Found event:', targetEvent.summary, '→ ID:', realEventId);

  // Step 3: Perform the actual action with the real eventId
  if (toolId === 'calendar_get_event') {
    // Just return the event we already fetched
    return createResult('success', targetEvent, null, startTime);
  }

  if (toolId === 'calendar_delete_event') {
    const sendUpdates = parameters.sendUpdates || 'all';
    const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(realEventId)}?sendUpdates=${sendUpdates}`;
    const deleteResponse = await fetch(deleteUrl, { method: 'DELETE', headers });

    if (deleteResponse.status === 204 || deleteResponse.ok) {
      return createResult('success', { deleted: true, eventId: realEventId, summary: targetEvent.summary, status: 'cancelled' }, null, startTime);
    }
    const errText = await deleteResponse.text().catch(() => '');
    return createResult('failed', null, `Delete failed: ${deleteResponse.status} ${errText.slice(0, 200)}`, startTime);
  }

  if (toolId === 'calendar_update_event') {
    const timeZone = parameters.timeZone || 'Asia/Kolkata';
    const body = {};
    if (parameters.summary) body.summary = parameters.summary;
    if (parameters.description !== undefined) body.description = parameters.description;
    if (parameters.location !== undefined) body.location = parameters.location;
    if (parameters.startTime) {
      const st = ensureTimezone(parameters.startTime);
      body.start = st.includes('T') && (st.includes('+') || st.includes('Z'))
        ? { dateTime: st }
        : st.includes('T')
          ? { dateTime: st, timeZone }
          : { date: st };
    }
    if (parameters.endTime) {
      const et = ensureTimezone(parameters.endTime);
      body.end = et.includes('T') && (et.includes('+') || et.includes('Z'))
        ? { dateTime: et }
        : et.includes('T')
          ? { dateTime: et, timeZone }
          : { date: et };
    }
    if (parameters.attendees) {
      body.attendees = parameters.attendees.map(email => ({ email }));
    }
    if (parameters.status) body.status = parameters.status;

    const patchUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(realEventId)}`;
    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!patchResponse.ok) {
      const errText = await patchResponse.text().catch(() => '');
      return createResult('failed', null, `Update failed: ${patchResponse.status} ${errText.slice(0, 200)}`, startTime);
    }
    const updatedEvent = await patchResponse.json().catch(() => ({ status: 'updated' }));
    return createResult('success', updatedEvent, null, startTime);
  }

  if (toolId === 'calendar_respond_to_event') {
    const responseStatus = parameters.response || 'accepted';
    let attendees = targetEvent.attendees || [];
    let foundSelf = false;

    attendees = attendees.map(att => {
      if (att.self) {
        foundSelf = true;
        return { ...att, responseStatus };
      }
      return att;
    });

    if (!foundSelf) {
      // Get calendar info to find our email
      const calInfoUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`;
      const calInfoResp = await fetch(calInfoUrl, { method: 'GET', headers }).catch(() => null);
      if (calInfoResp?.ok) {
        const calInfo = await calInfoResp.json().catch(() => ({}));
        if (calInfo.id) {
          attendees.push({ email: calInfo.id, responseStatus, self: true });
        }
      }
    }

    const patchUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(realEventId)}?sendUpdates=all`;
    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ attendees }),
    });

    if (!patchResponse.ok) {
      const errText = await patchResponse.text().catch(() => '');
      return createResult('failed', null, `Respond failed: ${patchResponse.status} ${errText.slice(0, 200)}`, startTime);
    }
    const updatedEvent = await patchResponse.json().catch(() => ({ status: 'responded' }));
    return createResult('success', updatedEvent, null, startTime);
  }

  return null; // Unknown tool — fall through
}

/**
 * Execute Notion page duplication — fetches original page content and creates a real copy
 */
async function executeNotionDuplicate(userId, parameters, accessToken, startTime) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'Notion-Version': '2022-06-28',
  };

  try {
    // Step 1: Fetch original page metadata to get title
    const pageId = parameters.pageId || '';
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, {
      method: 'GET',
      headers,
    });

    let originalTitle = 'Untitled';
    let parentInfo = { workspace: true };
    if (pageRes.ok) {
      const pageData = await pageRes.json();
      // Extract title from properties
      const titleProp = pageData.properties?.title?.title?.[0]?.plain_text
        || pageData.properties?.Name?.title?.[0]?.plain_text
        || Object.values(pageData.properties || {}).find(p => p.type === 'title')?.title?.[0]?.plain_text;
      if (titleProp) originalTitle = titleProp;
      // Keep same parent
      if (pageData.parent?.page_id) parentInfo = { page_id: pageData.parent.page_id };
      else if (pageData.parent?.database_id) parentInfo = { database_id: pageData.parent.database_id };
    }

    // Step 2: Fetch original page blocks (content)
    const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children?page_size=100`, {
      method: 'GET',
      headers,
    });

    let children = [];
    if (blocksRes.ok) {
      const blocksData = await blocksRes.json();
      // Clean blocks for duplication (remove IDs and timestamps, keep content)
      children = (blocksData.results || []).map(block => cleanBlockForDuplication(block)).filter(Boolean);
    }

    // If no content was fetched, add a placeholder
    if (children.length === 0) {
      children = [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: `Duplicated from: ${originalTitle}` } }] } }];
    }

    // Step 3: Create the new page with copied content
    const newTitle = parameters.newTitle || `Copy of ${originalTitle}`;
    const createBody = {
      parent: parentInfo,
      properties: {
        title: { title: [{ text: { content: newTitle } }] },
      },
      children: children.slice(0, 100), // Notion API limit: max 100 blocks per request
    };

    const createRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers,
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text().catch(() => '');
      const result = createResult('failed', null, `Failed to create duplicate: ${createRes.status} - ${errBody.slice(0, 200)}`, startTime);
      await logExecution(userId, 'notion', 'notion_duplicate_page', result);
      return result;
    }

    const newPage = await createRes.json();
    await markConnectionUsed(userId, 'notion');
    const result = createResult('success', newPage, null, startTime);
    await logExecution(userId, 'notion', 'notion_duplicate_page', result);
    return result;
  } catch (err) {
    const result = createResult('failed', null, `Duplication error: ${err.message}`, startTime);
    await logExecution(userId, 'notion', 'notion_duplicate_page', result);
    return result;
  }
}

/**
 * Clean a Notion block for duplication — remove IDs and metadata, keep content structure
 */
function cleanBlockForDuplication(block) {
  if (!block || !block.type) return null;

  const type = block.type;
  const cleaned = { object: 'block', type };

  // Skip unsupported block types for creation
  const unsupported = ['child_page', 'child_database', 'unsupported', 'table_of_contents', 'breadcrumb', 'column_list', 'column', 'link_preview', 'synced_block', 'template'];
  if (unsupported.includes(type)) return null;

  // Copy the block content
  if (block[type]) {
    cleaned[type] = { ...block[type] };
    // Remove has_children flag (we don't recursively copy nested blocks for simplicity)
    delete cleaned[type].has_children;
  }

  return cleaned;
}

/**
 * Execute a tool via MCP server (e.g., Canva)
 * MCP tools use JSON-RPC 2.0 protocol instead of REST APIs
 */
async function executeMcpTool(userId, app, tool, toolId, parameters, startTime) {
  try {
    // For MCP connections, get the session token from stored connection
    let sessionToken = null;
    try {
      sessionToken = await getValidToken(userId, app.id);
    } catch {
      // MCP might work without a stored token (session-based)
    }

    let mcpResult;

    // Use dedicated Canva MCP client for Canva
    if (app.id === 'canva') {
      const { callCanvaTool } = await import('./canva-mcp.js');
      mcpResult = await callCanvaTool(toolId, parameters, sessionToken);

      // For async jobs (generate, export, import), auto-poll status once after a short delay
      const isAsyncJob = ['canva_generate_design', 'canva_export_design', 'canva_import_design_from_url'].includes(toolId);
      if (isAsyncJob && mcpResult && (mcpResult.jobId || mcpResult.id)) {
        const jobId = mcpResult.jobId || mcpResult.id;
        // Wait 2 seconds then check status once
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          let statusToolId;
          if (toolId === 'canva_generate_design') statusToolId = 'canva_get_design_generation_job';
          else if (toolId === 'canva_export_design') statusToolId = 'canva_get_design_export_status';
          else statusToolId = 'canva_get_design_import_from_url_status';

          const statusResult = await callCanvaTool(statusToolId, { jobId }, sessionToken);
          // Merge status into the original result
          mcpResult = {
            ...mcpResult,
            currentStatus: statusResult?.status || 'processing',
            statusDetails: statusResult,
          };
        } catch {
          // Status check failed — not critical, return original result
        }
      }
    } else {
      mcpResult = await callMcpTool(app.mcpUrl, toolId, parameters, sessionToken);
    }

    await markConnectionUsed(userId, app.id).catch(() => {});
    const result = createResult('success', mcpResult, null, startTime);
    await logExecution(userId, app.id, toolId, result);
    return result;
  } catch (err) {
    // Provide actionable error messages for Canva
    let errorMessage = `MCP error: ${err.message}`;
    if (app.id === 'canva') {
      if (err.message.includes('session expired') || err.message.includes('unauthorized')) {
        errorMessage = 'Canva connection expired. Please reconnect Canva from the App Connections page.';
      } else if (err.message.includes('rate limit')) {
        errorMessage = 'Canva rate limit reached. Please wait 30 seconds and try again.';
      } else if (err.message.includes('timed out')) {
        errorMessage = 'Canva operation timed out. For design generation, this is normal — use the status check tool to monitor progress.';
      }
    }

    const result = createResult('failed', null, errorMessage, startTime);
    await logExecution(userId, app.id, toolId, result);
    return result;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// GMAIL INTERCEPTOR — Auto-fetches full message content for read/search tools
// Gmail API returns only message IDs; this fetches headers + body for each message
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute intelligent Gmail tools (send_smart, smart_reply, schedule_email, auto_reply, mark_read, move_email)
 * @param {string} accessToken - Valid Gmail OAuth token
 * @param {string} toolId - The smart Gmail tool being called
 * @param {object} parameters - Tool parameters (including emailStyle, scheduledTime, autoReplyStyle, etc.)
 * @param {number} startTime - Execution start time
 * @returns {ExecutionResult}
 */
async function executeGmailSmartTool(accessToken, toolId, parameters, startTime) {
  const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Import email intelligence module
  let emailIntelligence = null;
  try {
    emailIntelligence = await import('./email-intelligence.js');
  } catch (e) {
    console.warn('[Gmail Smart] Could not load email-intelligence.js:', e.message);
  }

  // ── Helper: detect email style if not explicitly provided ────────────────
  function resolveStyle(params) {
    if (params.emailStyle) return params.emailStyle;
    if (emailIntelligence?.detectEmailStyle) {
      const combined = [params.subject, params.body, params.to].filter(Boolean).join(' ');
      return emailIntelligence.detectEmailStyle(combined);
    }
    return 'professional';
  }

  // ── Helper: build styled MIME for smart send/reply ───────────────────────
  function buildSmartMime({ to, subject, body, cc, bcc, threadId, messageId, emailStyle, senderName, priority, replyTo }) {
    let htmlBody = body || '';

    if (emailIntelligence?.buildEmailHTML) {
      const isAlreadyFullHtml = /^\s*<!DOCTYPE/i.test(htmlBody) || /^\s*<html/i.test(htmlBody);
      if (!isAlreadyFullHtml) {
        try {
          htmlBody = emailIntelligence.buildEmailHTML(htmlBody, emailStyle || 'professional', to, senderName || '');
        } catch (e) {
          console.warn('[Gmail Smart] buildEmailHTML failed:', e.message);
        }
      }
    }

    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject || '', 'utf-8').toString('base64')}?=`;

    const mimeHeaders = [`To: ${to || ''}`];
    if (senderName) mimeHeaders.push(`From: ${senderName} <me>`);
    mimeHeaders.push(`Subject: ${encodedSubject}`);

    if (messageId && messageId.length > 5) {
      mimeHeaders.push(`In-Reply-To: ${messageId}`);
      mimeHeaders.push(`References: ${messageId}`);
    }
    if (cc && (Array.isArray(cc) ? cc.length > 0 : cc)) {
      mimeHeaders.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
    }
    if (bcc && (Array.isArray(bcc) ? bcc.length > 0 : bcc)) {
      mimeHeaders.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);
    }
    if (priority) {
      const pmap = { high: '1 (High)', normal: '3 (Normal)', low: '5 (Low)' };
      const pv = pmap[priority.toLowerCase()];
      if (pv) mimeHeaders.push(`X-Priority: ${pv}`);
    }
    if (replyTo) mimeHeaders.push(`Reply-To: ${replyTo}`);

    mimeHeaders.push('MIME-Version: 1.0');
    mimeHeaders.push('Content-Type: text/html; charset=utf-8');
    mimeHeaders.push('Content-Transfer-Encoding: base64');

    const encodedBody = Buffer.from(htmlBody, 'utf-8').toString('base64');
    const mimeMsg = mimeHeaders.join('\r\n') + '\r\n\r\n' + encodedBody;
    const raw = Buffer.from(mimeMsg).toString('base64url');

    const payload = { raw };
    if (threadId && threadId.length > 5 && /^[0-9a-f]+$/i.test(threadId)) {
      payload.threadId = threadId;
    }
    return { payload, htmlBody };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // gmail_send_smart — Styled email send
  // ─────────────────────────────────────────────────────────────────────────
  if (toolId === 'gmail_send_smart') {
    const emailStyle = resolveStyle(parameters);
    console.log('[Gmail Smart] send_smart | style:', emailStyle, '| to:', parameters.to);

    const { payload: mimePayload, htmlBody } = buildSmartMime({
      to: parameters.to,
      subject: parameters.subject,
      body: parameters.body,
      cc: parameters.cc,
      bcc: parameters.bcc,
      emailStyle,
      senderName: parameters.senderName,
      priority: parameters.priority,
      replyTo: parameters.replyTo,
    });

    const response = await fetch(`${BASE_URL}/messages/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mimePayload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gmail API ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    return createResult('success', {
      messageId: data.id,
      threadId: data.threadId,
      status: 'sent',
      emailStyle,
      _finalHtml: htmlBody,
      message: `✅ Email sent successfully (${emailStyle} style) to ${parameters.to}`,
    }, null, startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // gmail_smart_reply — Context-aware thread reply
  // ─────────────────────────────────────────────────────────────────────────
  if (toolId === 'gmail_smart_reply') {
    // If we have a threadId, try to read the thread for context first
    let detectedStyle = parameters.emailStyle || null;
    let inferredMessageId = parameters.messageId || null;

    if (parameters.threadId && !detectedStyle && emailIntelligence?.extractEmailContextFromThread) {
      try {
        console.log('[Gmail Smart] smart_reply: reading thread for context...', parameters.threadId);
        const threadRes = await fetch(`${BASE_URL}/threads/${parameters.threadId}?format=full`, { headers });
        if (threadRes.ok) {
          const threadData = await threadRes.json();
          const messages = (threadData.messages || []).map(m => {
            // Extract key headers
            const hdrs = {};
            (m.payload?.headers || []).forEach(h => { hdrs[h.name.toLowerCase()] = h.value; });
            return {
              from: hdrs.from || '',
              subject: hdrs.subject || '',
              body: m.snippet || '',
              messageId: hdrs['message-id'] || '',
            };
          });
          const ctx = emailIntelligence.extractEmailContextFromThread(messages);
          detectedStyle = ctx.threadTone || 'professional';
          // Use the last message's message-id for proper threading
          if (!inferredMessageId && messages.length > 0) {
            inferredMessageId = messages[messages.length - 1].messageId || '';
          }
          console.log('[Gmail Smart] Thread context:', { tone: detectedStyle, messageCount: ctx.messageCount });
        }
      } catch (e) {
        console.warn('[Gmail Smart] Thread read failed (continuing):', e.message);
      }
    }

    const emailStyle = detectedStyle || resolveStyle(parameters);
    const mimePayload = buildSmartMime({
      to: parameters.to,
      subject: parameters.subject,
      body: parameters.body,
      cc: parameters.cc,
      emailStyle,
      senderName: parameters.senderName,
      threadId: parameters.threadId,
      messageId: inferredMessageId || parameters.messageId,
    });

    const response = await fetch(`${BASE_URL}/messages/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mimePayload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gmail API ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    return createResult('success', {
      messageId: data.id,
      threadId: data.threadId,
      status: 'sent',
      emailStyle,
      message: `✅ Context-aware reply sent (${emailStyle} style) to ${parameters.to}`,
    }, null, startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // gmail_schedule_email — Create a draft with scheduling metadata
  // ─────────────────────────────────────────────────────────────────────────
  if (toolId === 'gmail_schedule_email') {
    // Parse natural language schedule time
    let scheduleResult = null;
    if (emailIntelligence?.parseScheduleTime) {
      scheduleResult = emailIntelligence.parseScheduleTime(parameters.scheduledTime, new Date().toISOString());
    }

    if (!scheduleResult) {
      // Try ISO parse directly
      const d = new Date(parameters.scheduledTime);
      if (!isNaN(d.getTime())) {
        scheduleResult = {
          parsedTime: d.toISOString(),
          confidence: 'high',
          display: d.toLocaleString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        };
      }
    }

    if (!scheduleResult) {
      throw new Error(`Could not parse scheduled time: "${parameters.scheduledTime}". Please use a clear time expression like "tomorrow at 9am" or "next Monday 3pm".`);
    }

    console.log('[Gmail Smart] schedule_email | parsed:', scheduleResult.parsedTime, '| confidence:', scheduleResult.confidence);

    // Build subject with SCHEDULED prefix (machine-readable metadata in subject)
    const schedulePrefix = `[SCHEDULED:${scheduleResult.parsedTime}]`;
    const emailStyle = resolveStyle(parameters);

    let htmlBody = parameters.body || '';
    if (emailIntelligence?.buildEmailHTML) {
      const isAlreadyFullHtml = /^\s*<!DOCTYPE/i.test(htmlBody) || /^\s*<html/i.test(htmlBody);
      if (!isAlreadyFullHtml) {
        try {
          htmlBody = emailIntelligence.buildEmailHTML(htmlBody, emailStyle, parameters.to, parameters.senderName || '');
        } catch (e) {
          console.warn('[Gmail Smart] buildEmailHTML failed:', e.message);
        }
      }
    }

    // Build the draft subject (actual subject without the prefix for user display)
    const draftSubject = parameters.subject || '';
    const encodedSubject = `=?UTF-8?B?${Buffer.from(draftSubject, 'utf-8').toString('base64')}?=`;

    const mimeHeaders = [
      `To: ${parameters.to || ''}`,
      `Subject: ${encodedSubject}`,
      // Store scheduling metadata as a custom header
      `X-ChatboxAI-Scheduled: ${scheduleResult.parsedTime}`,
    ];

    if (parameters.cc && (Array.isArray(parameters.cc) ? parameters.cc.length > 0 : parameters.cc)) {
      mimeHeaders.push(`Cc: ${Array.isArray(parameters.cc) ? parameters.cc.join(', ') : parameters.cc}`);
    }
    if (parameters.bcc && (Array.isArray(parameters.bcc) ? parameters.bcc.length > 0 : parameters.bcc)) {
      mimeHeaders.push(`Bcc: ${Array.isArray(parameters.bcc) ? parameters.bcc.join(', ') : parameters.bcc}`);
    }

    mimeHeaders.push('MIME-Version: 1.0');
    mimeHeaders.push('Content-Type: text/html; charset=utf-8');
    mimeHeaders.push('Content-Transfer-Encoding: base64');

    const encodedBody = Buffer.from(htmlBody, 'utf-8').toString('base64');
    const mimeMsg = mimeHeaders.join('\r\n') + '\r\n\r\n' + encodedBody;
    const raw = Buffer.from(mimeMsg).toString('base64url');

    const draftPayload = { message: { raw } };

    const response = await fetch(`${BASE_URL}/drafts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(draftPayload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gmail API ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    return createResult('success', {
      draftId: data.id,
      scheduledTime: scheduleResult.parsedTime,
      scheduledDisplay: scheduleResult.display,
      confidence: scheduleResult.confidence,
      status: 'scheduled',
      emailStyle,
      message: `📅 Email scheduled for **${scheduleResult.display}** and saved as a draft (ID: ${data.id}). The email will be ready to send at the scheduled time.`,
    }, null, startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // gmail_auto_reply — Generate and send/draft an auto-reply
  // ─────────────────────────────────────────────────────────────────────────
  if (toolId === 'gmail_auto_reply') {
    const autoReplyStyle = parameters.autoReplyStyle || 'acknowledgment';
    const sendNow = parameters.sendNow !== false; // Default: send

    // Build auto-reply body if not provided
    let replyBody = parameters.body || '';
    if (!replyBody && emailIntelligence?.buildAutoReplyBody) {
      replyBody = emailIntelligence.buildAutoReplyBody(
        { from: parameters.to, subject: parameters.subject },
        autoReplyStyle,
        parameters.senderName || '',
        parameters.returnDate || '',
      );
    }

    // Style for the HTML wrapper
    const emailStyle = 'auto_reply';

    let htmlBody = replyBody;
    if (emailIntelligence?.buildEmailHTML) {
      const isAlreadyFullHtml = /^\s*<!DOCTYPE/i.test(htmlBody) || /^\s*<html/i.test(htmlBody);
      if (!isAlreadyFullHtml) {
        try {
          htmlBody = emailIntelligence.buildEmailHTML(htmlBody, emailStyle, parameters.to, parameters.senderName || '');
        } catch (e) {
          console.warn('[Gmail Smart] buildEmailHTML failed for auto_reply:', e.message);
        }
      }
    }

    // Resolve message-id for thread reply
    let threadMessageId = parameters.messageId || '';
    if (parameters.threadId && !threadMessageId) {
      try {
        const threadRes = await fetch(`${BASE_URL}/threads/${parameters.threadId}?format=metadata&metadataHeaders=Message-ID`, { headers });
        if (threadRes.ok) {
          const td = await threadRes.json();
          const lastMsg = (td.messages || []).slice(-1)[0];
          const midHeader = (lastMsg?.payload?.headers || []).find(h => h.name.toLowerCase() === 'message-id');
          threadMessageId = midHeader?.value || '';
        }
      } catch (e) {
        console.warn('[Gmail Smart] Could not get thread message-id:', e.message);
      }
    }

    // Build MIME
    const autoSubject = parameters.subject || 'Auto-Reply';
    const encodedSubject = `=?UTF-8?B?${Buffer.from(autoSubject, 'utf-8').toString('base64')}?=`;
    const mimeHeaders = [`To: ${parameters.to || ''}`, `Subject: ${encodedSubject}`];

    if (threadMessageId && threadMessageId.length > 5) {
      mimeHeaders.push(`In-Reply-To: ${threadMessageId}`);
      mimeHeaders.push(`References: ${threadMessageId}`);
    }

    mimeHeaders.push('MIME-Version: 1.0');
    mimeHeaders.push('Content-Type: text/html; charset=utf-8');
    mimeHeaders.push('Content-Transfer-Encoding: base64');

    const encodedBody = Buffer.from(htmlBody, 'utf-8').toString('base64');
    const mimeMsg = mimeHeaders.join('\r\n') + '\r\n\r\n' + encodedBody;
    const raw = Buffer.from(mimeMsg).toString('base64url');

    const payload = { raw };
    if (parameters.threadId && /^[0-9a-f]+$/i.test(parameters.threadId)) {
      payload.threadId = parameters.threadId;
    }

    if (sendNow) {
      // Send immediately
      const response = await fetch(`${BASE_URL}/messages/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gmail API ${response.status}: ${err.slice(0, 200)}`);
      }
      const data = await response.json();
      return createResult('success', {
        messageId: data.id,
        threadId: data.threadId,
        status: 'sent',
        autoReplyStyle,
        message: `🤖 Auto-reply (${autoReplyStyle}) sent to ${parameters.to}`,
      }, null, startTime);
    } else {
      // Save as draft
      const response = await fetch(`${BASE_URL}/drafts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: payload }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gmail API ${response.status}: ${err.slice(0, 200)}`);
      }
      const data = await response.json();
      return createResult('success', {
        draftId: data.id,
        status: 'draft',
        autoReplyStyle,
        message: `📝 Auto-reply (${autoReplyStyle}) saved as draft for ${parameters.to}`,
      }, null, startTime);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // gmail_mark_read — Mark emails as read or unread
  // ─────────────────────────────────────────────────────────────────────────
  if (toolId === 'gmail_mark_read') {
    const messageIds = Array.isArray(parameters.messageIds) ? parameters.messageIds : [parameters.messageIds].filter(Boolean);
    const markAs = (parameters.markAs || 'read').toLowerCase();

    const modifyBody = markAs === 'read'
      ? { removeLabelIds: ['UNREAD'] }
      : { addLabelIds: ['UNREAD'] };

    let updated = 0;
    const errors = [];

    for (const msgId of messageIds) {
      try {
        const res = await fetch(`${BASE_URL}/messages/${msgId}/modify`, {
          method: 'POST',
          headers,
          body: JSON.stringify(modifyBody),
        });
        if (res.ok) {
          updated++;
        } else {
          const err = await res.text();
          errors.push(`${msgId}: ${err.slice(0, 100)}`);
        }
      } catch (e) {
        errors.push(`${msgId}: ${e.message}`);
      }
    }

    return createResult('success', {
      updated,
      total: messageIds.length,
      status: errors.length === 0 ? 'success' : 'partial',
      errors: errors.length > 0 ? errors : undefined,
      message: `✅ Marked ${updated} of ${messageIds.length} email(s) as ${markAs}`,
    }, null, startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // gmail_move_email — Move email to destination or add/remove labels
  // ─────────────────────────────────────────────────────────────────────────
  if (toolId === 'gmail_move_email') {
    const messageId = parameters.messageId;
    if (!messageId) throw new Error('messageId is required for gmail_move_email');

    // Translate friendly destination names to label operations
    let addLabels = [...(parameters.addLabels || [])];
    let removeLabels = [...(parameters.removeLabels || [])];

    if (parameters.destination) {
      const dest = parameters.destination.toLowerCase().trim();
      const destinationMap = {
        archive:   { remove: ['INBOX'] },
        trash:     { add: ['TRASH'], remove: ['INBOX', 'UNREAD'] },
        spam:      { add: ['SPAM'], remove: ['INBOX'] },
        inbox:     { add: ['INBOX'], remove: ['TRASH', 'SPAM'] },
        starred:   { add: ['STARRED'] },
        important: { add: ['IMPORTANT'] },
        unstar:    { remove: ['STARRED'] },
        read:      { remove: ['UNREAD'] },
        unread:    { add: ['UNREAD'] },
      };
      const mapping = destinationMap[dest];
      if (mapping) {
        if (mapping.add) addLabels = [...new Set([...addLabels, ...mapping.add])];
        if (mapping.remove) removeLabels = [...new Set([...removeLabels, ...mapping.remove])];
      }
    }

    const modifyBody = {};
    if (addLabels.length > 0) modifyBody.addLabelIds = addLabels;
    if (removeLabels.length > 0) modifyBody.removeLabelIds = removeLabels;

    const response = await fetch(`${BASE_URL}/messages/${messageId}/modify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(modifyBody),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gmail API ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    const destDisplay = parameters.destination || (addLabels.length > 0 ? addLabels.join(', ') : 'modified');
    return createResult('success', {
      messageId: data.id,
      status: 'success',
      destination: destDisplay,
      addedLabels: addLabels,
      removedLabels: removeLabels,
      message: `✅ Email moved/updated successfully → ${destDisplay}`,
    }, null, startTime);
  }

  return null;
}

/**
 * Gmail interceptor: Fetches full message content for read/search/thread/draft tools
 * @param {string} accessToken - Valid Gmail OAuth token
 * @param {string} toolId - The Gmail tool being called
 * @param {object} parameters - Tool parameters
 * @param {number} startTime - Execution start time
 * @returns {ExecutionResult|null}
 */
async function gmailAutoFetchContent(accessToken, toolId, parameters, startTime) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

  // ─── gmail_read_emails: List messages with optional query, then fetch each ───
  if (toolId === 'gmail_read_emails') {
    const maxResults = Math.min(Math.max(parameters.maxResults || 10, 1), 20);
    const query = parameters.query || '';

    // Step 1: Get message IDs
    const listParams = new URLSearchParams({ maxResults: String(maxResults) });
    if (query) listParams.set('q', query);

    const listUrl = `${BASE_URL}/messages?${listParams.toString()}`;
    const listResp = await fetch(listUrl, { headers });
    if (!listResp.ok) {
      const errText = await listResp.text().catch(() => '');
      throw new Error(`Gmail list failed (${listResp.status}): ${errText.slice(0, 200)}`);
    }

    const listData = await listResp.json();
    const messageIds = (listData.messages || []).map(m => m.id);

    if (messageIds.length === 0) {
      return createResult('success', {
        messages: [],
        totalResults: 0,
        query: query || '(all inbox)',
        summary: 'No emails found matching your search.',
      }, null, startTime);
    }

    // Step 2: Fetch full content for each message (parallel, max 10)
    const messages = await Promise.all(
      messageIds.slice(0, 10).map(id => gmailFetchMessage(id, headers, BASE_URL))
    );

    return createResult('success', {
      messages: messages.filter(Boolean),
      totalResults: listData.resultSizeEstimate || messages.length,
      query: query || '(all inbox)',
    }, null, startTime);
  }

  // ─── gmail_search_threads: Search threads, then fetch thread summaries ───
  if (toolId === 'gmail_search_threads') {
    const maxResults = Math.min(Math.max(parameters.maxResults || 10, 1), 50);
    const query = parameters.query || '';

    if (!query) {
      throw new Error('Search query is required for gmail_search_threads');
    }

    // Step 1: Search for threads
    const searchParams = new URLSearchParams({ q: query, maxResults: String(maxResults) });
    const searchUrl = `${BASE_URL}/threads?${searchParams.toString()}`;
    const searchResp = await fetch(searchUrl, { headers });
    if (!searchResp.ok) {
      const errText = await searchResp.text().catch(() => '');
      throw new Error(`Gmail search failed (${searchResp.status}): ${errText.slice(0, 200)}`);
    }

    const searchData = await searchResp.json();
    const threadIds = (searchData.threads || []).map(t => t.id);

    if (threadIds.length === 0) {
      return createResult('success', {
        threads: [],
        resultSizeEstimate: 0,
        query,
        summary: `No threads found for: "${query}"`,
      }, null, startTime);
    }

    // Step 2: Fetch thread metadata (first message of each thread for preview)
    const threads = await Promise.all(
      threadIds.slice(0, 15).map(id => gmailFetchThreadSummary(id, headers, BASE_URL))
    );

    return createResult('success', {
      threads: threads.filter(Boolean),
      resultSizeEstimate: searchData.resultSizeEstimate || threads.length,
      query,
    }, null, startTime);
  }

  // ─── gmail_get_thread: Fetch full thread with all messages ───
  if (toolId === 'gmail_get_thread') {
    const threadId = parameters.threadId;
    if (!threadId) throw new Error('threadId is required');

    const threadUrl = `${BASE_URL}/threads/${encodeURIComponent(threadId)}?format=full`;
    const threadResp = await fetch(threadUrl, { headers });
    if (!threadResp.ok) {
      const errText = await threadResp.text().catch(() => '');
      throw new Error(`Gmail get thread failed (${threadResp.status}): ${errText.slice(0, 200)}`);
    }

    const threadData = await threadResp.json();
    const messages = (threadData.messages || []).map(msg => gmailParseMessage(msg));

    return createResult('success', {
      id: threadData.id,
      historyId: threadData.historyId,
      messageCount: messages.length,
      messages,
      summary: messages.length > 0
        ? `Thread: "${messages[0].subject}" — ${messages.length} message(s) between ${[...new Set(messages.map(m => m.from))].join(', ')}`
        : 'Empty thread',
    }, null, startTime);
  }

  // ─── gmail_list_drafts: List drafts with content preview ───
  if (toolId === 'gmail_list_drafts') {
    const maxResults = Math.min(Math.max(parameters.maxResults || 10, 1), 50);

    const listUrl = `${BASE_URL}/drafts?maxResults=${maxResults}`;
    const listResp = await fetch(listUrl, { headers });
    if (!listResp.ok) {
      const errText = await listResp.text().catch(() => '');
      throw new Error(`Gmail list drafts failed (${listResp.status}): ${errText.slice(0, 200)}`);
    }

    const listData = await listResp.json();
    const draftIds = (listData.drafts || []).map(d => d.id);

    if (draftIds.length === 0) {
      return createResult('success', {
        drafts: [],
        resultSizeEstimate: 0,
        summary: 'No drafts found.',
      }, null, startTime);
    }

    // Fetch each draft's content
    const drafts = await Promise.all(
      draftIds.slice(0, 15).map(id => gmailFetchDraft(id, headers, BASE_URL))
    );

    return createResult('success', {
      drafts: drafts.filter(Boolean),
      resultSizeEstimate: listData.resultSizeEstimate || drafts.length,
    }, null, startTime);
  }

  // ─── gmail_get_draft: Get a single draft by ID ───
  if (toolId === 'gmail_get_draft') {
    const draftId = parameters.draftId;
    if (!draftId) throw new Error('draftId is required');

    const draft = await gmailFetchDraft(draftId, headers, BASE_URL);
    if (!draft) throw new Error('Draft not found');

    return createResult('success', draft, null, startTime);
  }

  return null; // Fallback — shouldn't reach here
}

/**
 * Fetch a single Gmail message with full content
 */
async function gmailFetchMessage(messageId, headers, baseUrl) {
  try {
    const url = `${baseUrl}/messages/${messageId}?format=full`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) return null;
    const msg = await resp.json();
    return gmailParseMessage(msg);
  } catch {
    return null;
  }
}

/**
 * Fetch a thread summary (first + last message for context)
 */
async function gmailFetchThreadSummary(threadId, headers, baseUrl) {
  try {
    const url = `${baseUrl}/threads/${threadId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) return null;
    const thread = await resp.json();

    const messages = thread.messages || [];
    const firstMsg = messages[0];
    const lastMsg = messages[messages.length - 1];

    const getHeader = (msg, name) => {
      const h = (msg?.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
      return h?.value || '';
    };

    return {
      threadId: thread.id,
      messageCount: messages.length,
      subject: getHeader(firstMsg, 'Subject') || '(No Subject)',
      from: getHeader(firstMsg, 'From'),
      to: getHeader(firstMsg, 'To'),
      date: getHeader(firstMsg, 'Date'),
      lastMessageFrom: messages.length > 1 ? getHeader(lastMsg, 'From') : null,
      lastMessageDate: messages.length > 1 ? getHeader(lastMsg, 'Date') : null,
      snippet: firstMsg?.snippet || '',
      labels: firstMsg?.labelIds || [],
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a single draft with full content
 */
async function gmailFetchDraft(draftId, headers, baseUrl) {
  try {
    const url = `${baseUrl}/drafts/${draftId}?format=full`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) return null;
    const draft = await resp.json();

    const message = draft.message ? gmailParseMessage(draft.message) : null;
    return {
      draftId: draft.id,
      ...(message || {}),
    };
  } catch {
    return null;
  }
}

/**
 * Parse a Gmail message object into a clean, readable format
 * Extracts headers, body text, and metadata
 */
function gmailParseMessage(msg) {
  if (!msg) return null;

  const getHeader = (name) => {
    const h = (msg.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
    return h?.value || '';
  };

  // Extract body content
  let bodyText = '';
  let bodyHtml = '';

  function extractBody(part) {
    if (!part) return;

    // Direct body data
    if (part.body?.data) {
      const decoded = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      if (part.mimeType === 'text/plain') {
        bodyText = decoded;
      } else if (part.mimeType === 'text/html') {
        bodyHtml = decoded;
      }
    }

    // Multipart — recurse into parts
    if (part.parts) {
      for (const subPart of part.parts) {
        extractBody(subPart);
      }
    }
  }

  extractBody(msg.payload);

  // Prefer plain text; fall back to stripped HTML
  let body = bodyText;
  if (!body && bodyHtml) {
    // Strip HTML tags for a readable text version
    body = bodyHtml
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Truncate very long bodies
  if (body && body.length > 10000) {
    body = body.slice(0, 10000) + '\n\n... [truncated — full email is longer]';
  }

  // Extract attachments info
  const attachments = [];
  function findAttachments(part) {
    if (!part) return;
    if (part.filename && part.filename.length > 0) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body?.size || 0,
      });
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        findAttachments(subPart);
      }
    }
  }
  findAttachments(msg.payload);

  return {
    messageId: msg.id,
    threadId: msg.threadId,
    from: getHeader('From'),
    to: getHeader('To'),
    cc: getHeader('Cc') || undefined,
    subject: getHeader('Subject') || '(No Subject)',
    date: getHeader('Date'),
    snippet: msg.snippet || '',
    body: body || msg.snippet || '',
    labels: msg.labelIds || [],
    hasAttachments: attachments.length > 0,
    attachments: attachments.length > 0 ? attachments : undefined,
    isUnread: (msg.labelIds || []).includes('UNREAD'),
    isStarred: (msg.labelIds || []).includes('STARRED'),
  };
}
