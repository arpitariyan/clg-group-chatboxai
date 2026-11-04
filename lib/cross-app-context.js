/**
 * ChatBox AI — Cross-App Context Graph Engine (Phase 3)
 * ════════════════════════════════════════════════════════
 * Connects related entities across Gmail, Google Drive, Canva, Figma,
 * Microsoft 365, Notion, Google Calendar, and Slack into a unified context graph.
 *
 * Avoids blind retrieval across all apps — uses intent-driven routing.
 */

import { discoverAppCapabilities } from './app-capability-discovery.js';

export class CrossAppContextGraph {
  constructor(userId, activeConnections = []) {
    this.userId = userId;
    this.activeConnections = activeConnections;
    this.nodes = new Map(); // entityId -> EntityNode
    this.edges = [];       // Array<{fromId, toId, relationship}>
  }

  /**
   * Determine which connected apps are relevant for a given user intent.
   *
   * @param {object} userIntent
   * @returns {Array<string>} Array of target appId strings
   */
  resolveRelevantApps(userIntent) {
    const { rawRequest = '', taskType = 'answer' } = userIntent;
    const promptLower = rawRequest.toLowerCase();
    const relevantApps = new Set();

    const activeAppIds = new Set(
      this.activeConnections
        .filter((c) => c.status === 'active' || c.status === 'connected')
        .map((c) => c.appId)
    );

    // Intent Heuristics for App Selection
    if (/\b(mail|email|thread|inbox|gmail)\b/i.test(promptLower) && activeAppIds.has('gmail')) {
      relevantApps.add('gmail');
    }
    if (/\b(drive|file|doc|pdf|folder|sheet)\b/i.test(promptLower) && activeAppIds.has('google_drive')) {
      relevantApps.add('google_drive');
    }
    if (/\b(notion|workspace|knowledge|page|database)\b/i.test(promptLower) && activeAppIds.has('notion')) {
      relevantApps.add('notion');
    }
    if (/\b(calendar|meeting|event|schedule|appointment)\b/i.test(promptLower) && activeAppIds.has('google_calendar')) {
      relevantApps.add('google_calendar');
    }
    if (/\b(slack|channel|chat message|dm|notification)\b/i.test(promptLower) && activeAppIds.has('slack')) {
      relevantApps.add('slack');
    }
    if (/\b(canva|poster|social graphic|banner|template)\b/i.test(promptLower) && activeAppIds.has('canva')) {
      relevantApps.add('canva');
    }
    if (/\b(figma|ui|ux|screen|frame|component|design system)\b/i.test(promptLower) && activeAppIds.has('figma')) {
      relevantApps.add('figma');
    }

    // Meeting / Briefing Workflow: Automatically connect Calendar + Gmail + Drive + Slack
    if (/\b(briefing|meeting prep|prepare for meeting|tomorrow's meeting)\b/i.test(promptLower)) {
      if (activeAppIds.has('google_calendar')) relevantApps.add('google_calendar');
      if (activeAppIds.has('gmail')) relevantApps.add('gmail');
      if (activeAppIds.has('google_drive')) relevantApps.add('google_drive');
      if (activeAppIds.has('slack')) relevantApps.add('slack');
      if (activeAppIds.has('notion')) relevantApps.add('notion');
    }

    return Array.from(relevantApps);
  }

  /**
   * Build a execution plan (Task Graph) for multi-app requests.
   *
   * @param {object} userIntent
   * @returns {object} Execution plan with parallel & sequential tasks
   */
  buildTaskGraph(userIntent) {
    const targetApps = this.resolveRelevantApps(userIntent);
    
    if (targetApps.length === 0) {
      return {
        strategy: 'direct',
        tasks: [],
      };
    }

    const retrievalTasks = targetApps.map((appId, index) => ({
      taskId: `T_RETRIEVE_${appId.toUpperCase()}_${index + 1}`,
      appId,
      action: `Retrieve context from ${appId}`,
      isParallel: true,
    }));

    const synthesisTask = {
      taskId: 'T_SYNTHESIZE_CONTEXT',
      action: 'Synthesize multi-app context graph into unified report',
      dependsOn: retrievalTasks.map((t) => t.taskId),
      isParallel: false,
    };

    return {
      strategy: targetApps.length > 1 ? 'multi_app_graph' : 'single_app',
      tasks: [...retrievalTasks, synthesisTask],
    };
  }
}
