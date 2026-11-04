/**
 * ChatBox AI — Project Brain & Decision Memory System (Phase 6)
 * ════════════════════════════════════════════════════════════════
 * Manages project memory, architectural decision records (ADRs),
 * evidence provenance, and artifact version histories across sessions.
 */

export class ProjectBrain {
  constructor(projectKey, initialData = {}) {
    this.projectKey = projectKey || 'default_project';
    this.goal = initialData.goal || '';
    this.requirements = Array.isArray(initialData.requirements) ? initialData.requirements : [];
    this.constraints = Array.isArray(initialData.constraints) ? initialData.constraints : [];
    this.decisions = Array.isArray(initialData.decisions) ? initialData.decisions : [];
    this.evidenceList = Array.isArray(initialData.evidenceList) ? initialData.evidenceList : [];
    this.artifacts = Array.isArray(initialData.artifacts) ? initialData.artifacts : [];
    this.openQuestions = Array.isArray(initialData.openQuestions) ? initialData.openQuestions : [];
    this.currentPhase = initialData.currentPhase || 'planning';
  }

  /**
   * Record a key architectural or design decision with justification.
   */
  recordDecision({ decision, reason, alternatives = [], status = 'accepted' }) {
    const record = {
      id: `DEC_${Date.now()}`,
      decision,
      reason,
      alternatives,
      status,
      timestamp: new Date().toISOString(),
    };
    this.decisions.push(record);
    return record;
  }

  /**
   * Record verifiable evidence/provenance for a claim or research finding.
   */
  recordEvidence({ claim, source, evidenceText = '', confidence = 0.9 }) {
    const evidence = {
      id: `EVI_${Date.now()}`,
      claim,
      source,
      evidenceText,
      confidence,
      timestamp: new Date().toISOString(),
    };
    this.evidenceList.push(evidence);
    return evidence;
  }

  /**
   * Register or update an artifact version in project memory.
   */
  registerArtifact({ artifactId, type, filename, version = 1, spec = {} }) {
    const existingIndex = this.artifacts.findIndex((a) => a.artifactId === artifactId);
    const record = {
      artifactId,
      type,
      filename,
      version,
      spec,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.artifacts[existingIndex] = record;
    } else {
      this.artifacts.push(record);
    }
    return record;
  }

  /**
   * Format project brain memory for LLM context injection.
   */
  formatForContext() {
    const lines = [`[Project Brain Context — ${this.projectKey}]`];
    if (this.goal) lines.push(`Project Goal: ${this.goal}`);
    if (this.currentPhase) lines.push(`Current Phase: ${this.currentPhase}`);

    if (this.decisions.length > 0) {
      lines.push('\nSettled Decisions:');
      this.decisions.slice(-5).forEach((d) => {
        lines.push(`- ${d.decision} (Reason: ${d.reason}) [Status: ${d.status}]`);
      });
    }

    if (this.evidenceList.length > 0) {
      lines.push('\nKey Provenance / Evidence:');
      this.evidenceList.slice(-5).forEach((e) => {
        lines.push(`- ${e.claim} (Source: ${e.source})`);
      });
    }

    if (this.artifacts.length > 0) {
      lines.push('\nProject Artifacts:');
      this.artifacts.slice(-5).forEach((a) => {
        lines.push(`- ${a.filename || a.artifactId} (v${a.version}, type: ${a.type})`);
      });
    }

    return lines.join('\n');
  }
}
