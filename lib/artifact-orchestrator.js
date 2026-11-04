/**
 * ChatBox AI — Shared Artifact Orchestrator (Phase 3 & Master Prompt §8, 16-18, 24-25)
 * ════════════════════════════════════════════════════════════════════════════════════
 * Manages document lifecycle, pre-execution credit checks, reservation/settlement,
 * and multi-artifact shared research pipelines.
 */

import { CanonicalDocument } from './canonical-content-model.js';
import { getArtifactHandler } from './artifact-registry.js';
import { estimateArtifactCredits } from './artifact-credit-policy.js';
import { AIResponseEnvelope, ArtifactResult, ARTIFACT_STATUS, RESPONSE_TYPES } from './response-envelope.js';
import { reserveArtifactCredits, settleArtifactCredits } from './budget-router.js';

export class ArtifactOrchestrator {
  constructor(userEmail) {
    this.userEmail = userEmail;
    this.canonicalDoc = null;
  }

  /**
   * Initialize shared upstream content model to avoid tripling AI reasoning cost
   * when generating multiple formats (PDF + Word + PPTX from 1 research operation).
   */
  initSharedContent(data = {}) {
    this.canonicalDoc = new CanonicalDocument(data);
    return this.canonicalDoc;
  }

  /**
   * Execute artifact creation pipeline with credit checks, validation, and settlement.
   *
   * @param {string} artifactType - pdf | docx | pptx | xlsx | image
   * @param {object} inputData - { title, content, sections, pageCount, slideCount }
   * @param {string} promptText - User query prompt
   * @returns {Promise<{ envelope: AIResponseEnvelope, artifact: ArtifactResult, success: boolean }>}
   */
  async processArtifactRequest(artifactType = 'pdf', inputData = {}, promptText = '') {
    const envelope = new AIResponseEnvelope({
      type: RESPONSE_TYPES.ARTIFACT,
      task: { taskId: `art_task_${Date.now()}`, status: 'PLANNED' },
    });

    const handler = getArtifactHandler(artifactType);
    const estimation = handler.estimator(inputData, promptText);

    // 1. Pre-execution credit check & reservation
    let reservation = null;
    if (this.userEmail) {
      reservation = await reserveArtifactCredits(this.userEmail, estimation.estimatedCost);
      if (!reservation.success) {
        envelope.task.status = 'INSUFFICIENT_CREDITS';
        envelope.message.text = `Insufficient credits for generating ${artifactType.toUpperCase()} artifact (${estimation.estimatedCost} credits required).`;
        return { envelope, artifact: null, success: false, reason: 'INSUFFICIENT_CREDITS' };
      }
    }

    // 2. Generate artifact content using CanonicalDocument
    if (!this.canonicalDoc) {
      this.initSharedContent(inputData);
    }

    let spec;
    try {
      spec = handler.generator ? handler.generator(inputData) : { title: inputData.title || 'Report', content: inputData.content };
    } catch (err) {
      if (reservation && reservation.reservationId) {
        await settleArtifactCredits(reservation.reservationId, 0, this.userEmail);
      }
      envelope.task.status = 'FAILED';
      envelope.message.text = `Failed to generate ${artifactType.toUpperCase()}: ${err.message}`;
      return { envelope, artifact: null, success: false, reason: 'GENERATION_ERROR' };
    }

    // 3. Quality Validation
    const validation = handler.validator ? handler.validator(spec.pdfSpec || spec.pptSpec || spec) : { isValid: true, qualityScore: 100 };

    // 4. Calculate actual credit usage and settle reservation
    const actualCost = validation.isValid ? estimation.estimatedCost : Math.max(1, Math.floor(estimation.estimatedCost / 2));
    let settlement = { actualCostCredits: actualCost, walletAfter: 0 };

    if (reservation && reservation.reservationId) {
      settlement = await settleArtifactCredits(reservation.reservationId, actualCost, this.userEmail);
    }

    // 5. Build ArtifactResult
    const artifact = new ArtifactResult({
      type: handler.type,
      title: inputData.title || this.canonicalDoc.title || 'Generated Artifact',
      mimeType: handler.mimeType,
      status: ARTIFACT_STATUS.COMPLETED,
      pageCount: inputData.pageCount || (spec.pdfSpec?.sectionsCount ? Math.ceil(spec.pdfSpec.sectionsCount / 2) : 1),
      slideCount: inputData.slideCount || (spec.pptSpec?.slides?.length || 0),
      validation,
      usage: {
        baseCost: estimation.breakdown.baseCost,
        assetCost: estimation.breakdown.assetCost,
        totalCredits: actualCost,
      },
    });

    envelope.addArtifact(artifact);
    envelope.task.status = 'COMPLETED';
    envelope.message.text = `Generated ${artifactType.toUpperCase()} document: "${artifact.title}".`;
    envelope.usage.walletAfter = settlement.walletAfter;

    return { envelope, artifact, success: true };
  }

  /**
   * Execute multi-artifact workflow (PDF + Word + PPTX) reusing shared upstream research work.
   */
  async processMultiArtifactRequest(artifactTypes = ['pdf', 'docx'], inputData = {}, promptText = '') {
    this.initSharedContent(inputData);
    const results = [];
    const masterEnvelope = new AIResponseEnvelope({
      type: RESPONSE_TYPES.WORKFLOW,
      task: { taskId: `workflow_${Date.now()}`, status: 'PLANNED' },
    });

    for (const type of artifactTypes) {
      const res = await this.processArtifactRequest(type, inputData, promptText);
      if (res.success && res.artifact) {
        masterEnvelope.addArtifact(res.artifact);
        results.push(res.artifact);
      }
    }

    masterEnvelope.task.status = results.length > 0 ? 'COMPLETED' : 'FAILED';
    masterEnvelope.message.text = `Completed multi-artifact generation (${results.length}/${artifactTypes.length} artifacts created).`;
    return { envelope: masterEnvelope, artifacts: results, success: results.length > 0 };
  }
}
