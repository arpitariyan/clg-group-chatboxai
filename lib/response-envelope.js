/**
 * ChatBox AI — AI Response Envelope & Artifact Result Model (Phase 1)
 * ════════════════════════════════════════════════════════════════════════
 * Separates user-facing text from artifact metadata, task execution state,
 * and traceable credit consumption.
 */

export const RESPONSE_TYPES = {
  CHAT: 'chat',
  RESEARCH: 'research',
  ARTIFACT: 'artifact',
  ARTIFACT_TRANSFORM: 'artifact_transform',
  TOOL_ACTION: 'tool_action',
  WORKFLOW: 'workflow',
};

export const ARTIFACT_TYPES = {
  PDF: 'pdf',
  DOCX: 'docx',
  PPTX: 'pptx',
  XLSX: 'xlsx',
  CSV: 'csv',
  IMAGE: 'image',
  DIAGRAM: 'diagram',
  HTML: 'html',
  MARKDOWN: 'markdown',
  OTHER: 'other',
};

export const ARTIFACT_STATUS = {
  PLANNED: 'planned',
  GENERATING: 'generating',
  VALIDATING: 'validating',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export class ArtifactResult {
  constructor(data = {}) {
    this.artifactId = data.artifactId || `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.type = data.type || ARTIFACT_TYPES.PDF;
    this.status = data.status || ARTIFACT_STATUS.COMPLETED;
    this.fileId = data.fileId || null;
    this.storageKey = data.storageKey || null;
    this.version = data.version || 1;
    this.title = data.title || 'Untitled Artifact';
    this.mimeType = data.mimeType || 'application/pdf';
    this.sizeBytes = data.sizeBytes || 0;
    this.pageCount = data.pageCount || 0;
    this.sheetCount = data.sheetCount || 0;
    this.slideCount = data.slideCount || 0;
    this.metadata = data.metadata || {};
    this.validation = data.validation || { isValid: true, qualityScore: 100, errors: [] };
    this.usage = data.usage || { baseCost: 0, assetCost: 0, totalCredits: 0 };
  }

  toJSON() {
    return {
      artifactId: this.artifactId,
      type: this.type,
      status: this.status,
      fileId: this.fileId,
      storageKey: this.storageKey,
      version: this.version,
      title: this.title,
      mimeType: this.mimeType,
      sizeBytes: this.sizeBytes,
      pageCount: this.pageCount,
      sheetCount: this.sheetCount,
      slideCount: this.slideCount,
      metadata: this.metadata,
      validation: this.validation,
      usage: this.usage,
    };
  }
}

export class AIResponseEnvelope {
  constructor(data = {}) {
    this.responseId = data.responseId || `resp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.type = data.type || RESPONSE_TYPES.CHAT;
    this.message = {
      text: data.message?.text || '',
    };
    this.artifacts = Array.isArray(data.artifacts)
      ? data.artifacts.map((a) => (a instanceof ArtifactResult ? a : new ArtifactResult(a)))
      : [];
    this.usage = data.usage || {
      modelCredits: 0,
      researchCredits: 0,
      toolCredits: 0,
      artifactCredits: 0,
      assetCredits: 0,
      validationCredits: 0,
      totalCredits: 0,
    };
    this.task = {
      taskId: data.task?.taskId || `task_${Date.now()}`,
      status: data.task?.status || 'COMPLETED',
    };
    this.metadata = data.metadata || {};
  }

  addArtifact(artifact) {
    const artObj = artifact instanceof ArtifactResult ? artifact : new ArtifactResult(artifact);
    this.artifacts.push(artObj);
    this.recalculateTotalCredits();
    return artObj;
  }

  recalculateTotalCredits() {
    let artifactTotal = 0;
    this.artifacts.forEach((a) => {
      artifactTotal += a.usage?.totalCredits || 0;
    });
    this.usage.artifactCredits = artifactTotal;
    this.usage.totalCredits =
      (this.usage.modelCredits || 0) +
      (this.usage.researchCredits || 0) +
      (this.usage.toolCredits || 0) +
      (this.usage.artifactCredits || 0) +
      (this.usage.assetCredits || 0) +
      (this.usage.validationCredits || 0);
  }

  toJSON() {
    return {
      responseId: this.responseId,
      type: this.type,
      message: this.message,
      artifacts: this.artifacts.map((a) => a.toJSON()),
      usage: this.usage,
      task: this.task,
      metadata: this.metadata,
    };
  }
}
