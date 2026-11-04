/**
 * ChatBox AI — App Capability Discovery Engine (Phase 2)
 * ════════════════════════════════════════════════════════
 * Maps connected apps to their granular capabilities (read, search, create, update, delete, action),
 * required permission scopes, and autonomy levels.
 */

import { getAppById, getAllApps } from './app-registry.js';
import { AUTONOMY_LEVELS } from './user-intent.js';

export const ACTION_CATEGORIES = {
  READ:   'read',
  SEARCH: 'search',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ACTION: 'action',
};

/**
 * Discover capabilities for active connected apps.
 *
 * @param {Array<{appId: string, status: string, grantedScopes?: string[]}>} activeConnections
 * @returns {Array<object>}
 */
export function discoverAppCapabilities(activeConnections = []) {
  if (!Array.isArray(activeConnections) || activeConnections.length === 0) {
    return [];
  }

  const activeAppIds = new Set(
    activeConnections
      .filter((c) => c.status === 'active' || c.status === 'connected')
      .map((c) => c.appId)
  );

  const capabilities = [];

  for (const appId of activeAppIds) {
    const app = getAppById(appId);
    if (!app || !Array.isArray(app.tools)) continue;

    for (const tool of app.tools) {
      const isHighImpact = tool.requiresConfirmation || /\b(send|delete|trash|remove|destroy|update|overwrite|post)\b/i.test(tool.id || tool.name);
      
      let actionCategory = ACTION_CATEGORIES.READ;
      if (/\b(search|find|list|get|fetch|query)\b/i.test(tool.id || tool.name)) {
        actionCategory = ACTION_CATEGORIES.SEARCH;
      } else if (/\b(create|add|make|insert|compose|draft)\b/i.test(tool.id || tool.name)) {
        actionCategory = ACTION_CATEGORIES.CREATE;
      } else if (/\b(update|edit|modify|patch|append)\b/i.test(tool.id || tool.name)) {
        actionCategory = ACTION_CATEGORIES.UPDATE;
      } else if (/\b(delete|remove|trash)\b/i.test(tool.id || tool.name)) {
        actionCategory = ACTION_CATEGORIES.DELETE;
      } else if (/\b(send|post|execute|trigger|deploy)\b/i.test(tool.id || tool.name)) {
        actionCategory = ACTION_CATEGORIES.ACTION;
      }

      capabilities.push({
        appId,
        appName: app.name,
        toolId: tool.id,
        toolName: tool.name,
        description: tool.description,
        actionCategory,
        isHighImpact,
        requiredAutonomy: isHighImpact ? AUTONOMY_LEVELS.EXECUTE_WITH_APPROV : AUTONOMY_LEVELS.EXECUTE_AUTO,
        requiresConfirmation: Boolean(tool.requiresConfirmation),
      });
    }
  }

  return capabilities;
}

/**
 * Filter tools that match a specific intent and action category.
 */
export function filterCapabilitiesForIntent(capabilities = [], userIntent = {}) {
  const { taskType, autonomyLevel = AUTONOMY_LEVELS.EXECUTE_AUTO } = userIntent;

  return capabilities.filter((cap) => {
    // If high-impact and user autonomy level is below confirmation requirement, gate action
    if (cap.isHighImpact && autonomyLevel < AUTONOMY_LEVELS.EXECUTE_WITH_APPROV) {
      return false;
    }
    return true;
  });
}
