/**
 * ChatBox AI — Centralized Artifact Registry (Phase 2 & Master Prompt §38)
 * ═════════════════════════════════════════════════════════════════════════
 * Connects format generators, validators, and cost estimators for each format.
 */

import { ARTIFACT_TYPES } from './response-envelope.js';
import { estimateArtifactCredits } from './artifact-credit-policy.js';
import { validateArtifact } from './artifact-validator.js';
import { transformArtifact } from './artifact-transformation.js';
import { downloadAsPDF, downloadAsWord, downloadAsMarkdown } from './document-exporter.js';

export const ARTIFACT_REGISTRY = new Map();

// ── Register PDF ──────────────────────────────────────────────────────────────
ARTIFACT_REGISTRY.set(ARTIFACT_TYPES.PDF, {
  type: ARTIFACT_TYPES.PDF,
  mimeType: 'application/pdf',
  fileExtension: '.pdf',
  generator: (data) => transformArtifact('research_to_pdf', data),
  validator: (spec) => validateArtifact('pdf', spec),
  exporter: (title, content) => downloadAsPDF(title, content),
  estimator: (meta, prompt) => estimateArtifactCredits('pdf', meta, prompt),
});

// ── Register DOCX / Word ──────────────────────────────────────────────────────
ARTIFACT_REGISTRY.set(ARTIFACT_TYPES.DOCX, {
  type: ARTIFACT_TYPES.DOCX,
  mimeType: 'application/msword',
  fileExtension: '.doc',
  generator: (data) => transformArtifact('spreadsheet_to_report', data),
  validator: (spec) => validateArtifact('word', spec),
  exporter: (title, content) => downloadAsWord(title, content),
  estimator: (meta, prompt) => estimateArtifactCredits('docx', meta, prompt),
});

// ── Register PPTX / PowerPoint ────────────────────────────────────────────────
ARTIFACT_REGISTRY.set(ARTIFACT_TYPES.PPTX, {
  type: ARTIFACT_TYPES.PPTX,
  mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  fileExtension: '.pptx',
  generator: (data) => transformArtifact('research_to_powerpoint', data),
  validator: (spec) => validateArtifact('powerpoint', spec),
  estimator: (meta, prompt) => estimateArtifactCredits('pptx', meta, prompt),
});

// ── Register XLSX / Excel ─────────────────────────────────────────────────────
ARTIFACT_REGISTRY.set(ARTIFACT_TYPES.XLSX, {
  type: ARTIFACT_TYPES.XLSX,
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  fileExtension: '.xlsx',
  generator: (data) => transformArtifact('transcript_to_summary', data),
  validator: (spec) => validateArtifact('excel', spec),
  estimator: (meta, prompt) => estimateArtifactCredits('xlsx', meta, prompt),
});

// ── Register Image ────────────────────────────────────────────────────────────
ARTIFACT_REGISTRY.set(ARTIFACT_TYPES.IMAGE, {
  type: ARTIFACT_TYPES.IMAGE,
  mimeType: 'image/png',
  fileExtension: '.png',
  validator: () => ({ isValid: true, qualityScore: 100 }),
  estimator: (meta, prompt) => estimateArtifactCredits('image', meta, prompt),
});

// ── Register Diagram ──────────────────────────────────────────────────────────
ARTIFACT_REGISTRY.set(ARTIFACT_TYPES.DIAGRAM, {
  type: ARTIFACT_TYPES.DIAGRAM,
  mimeType: 'image/svg+xml',
  fileExtension: '.svg',
  validator: () => ({ isValid: true, qualityScore: 100 }),
  estimator: (meta, prompt) => estimateArtifactCredits('diagram', meta, prompt),
});

export function getArtifactHandler(type) {
  const normType = String(type || 'pdf').toLowerCase();
  return ARTIFACT_REGISTRY.get(normType) || ARTIFACT_REGISTRY.get(ARTIFACT_TYPES.PDF);
}
