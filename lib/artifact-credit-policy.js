/**
 * ChatBox AI — Artifact Credit Policy Registry (Phase 2 & Master Prompt §13-15)
 * ════════════════════════════════════════════════════════════════════════════════
 * Single source of truth for artifact complexity, metering, and credit pricing.
 *
 * Credit formula alignment:
 *   1 Credit = ₹0.01
 *   1 USD    = 8,300 credits
 */

export const ARTIFACT_BASE_CREDITS = {
  pdf: 3,
  docx: 3,
  pptx: 4,
  xlsx: 3,
  csv: 2,
  image: 5,
  diagram: 3,
  transform: 2,
  edit: 2,
};

export const COMPLEXITY_LEVELS = {
  SIMPLE: 'simple',
  STANDARD: 'standard',
  COMPLEX: 'complex',
  ADVANCED: 'advanced',
};

/**
 * Estimate artifact complexity and required credit cost before execution.
 *
 * @param {string} artifactType - pdf | docx | pptx | xlsx | image | diagram | transform
 * @param {object} fileMeta - { pageCount, slideCount, sheetCount, dataRows, wordCount, imageCount, diagramCount, isEdit, isTransform }
 * @param {string} promptText - User request text for intent & task complexity classification
 * @returns {{ artifactType: string, estimatedCost: number, complexityLevel: string, breakdown: object }}
 */
export function estimateArtifactCredits(artifactType = 'pdf', fileMeta = {}, promptText = '') {
  const normType = String(artifactType || 'pdf').toLowerCase();
  const baseCost = ARTIFACT_BASE_CREDITS[normType] || 3;

  let unitCost = 0;
  let assetCost = 0;
  let complexityMultiplier = 1.0;

  const text = String(promptText || '').toLowerCase();
  const isDeepQuery = /deep|financial|audit|complex|comprehensive|comparison|matrix/i.test(text);
  if (isDeepQuery) complexityMultiplier = 1.5;

  if (normType === 'pdf') {
    const pages = fileMeta.pageCount || 1;
    unitCost = Math.max(0, pages - 1) * 1; // 1 credit per additional page
    const images = fileMeta.imageCount || 0;
    const diagrams = fileMeta.diagramCount || 0;
    assetCost = images * ARTIFACT_BASE_CREDITS.image + diagrams * ARTIFACT_BASE_CREDITS.diagram;
  } else if (normType === 'docx') {
    const words = fileMeta.wordCount || 500;
    unitCost = Math.floor(words / 1000) * 1;
  } else if (normType === 'pptx') {
    const slides = fileMeta.slideCount || 5;
    unitCost = Math.max(0, slides - 1) * 1;
    const images = fileMeta.imageCount || 0;
    assetCost = images * ARTIFACT_BASE_CREDITS.image;
  } else if (normType === 'xlsx' || normType === 'csv') {
    const rows = fileMeta.dataRows || 50;
    unitCost = Math.floor(rows / 100) * 1;
  } else if (normType === 'image') {
    const count = fileMeta.imageCount || 1;
    unitCost = (count - 1) * ARTIFACT_BASE_CREDITS.image;
  } else if (normType === 'transform') {
    unitCost = ARTIFACT_BASE_CREDITS.transform;
  }

  const rawCost = Math.ceil((baseCost + unitCost + assetCost) * complexityMultiplier);
  const estimatedCost = Math.max(baseCost, rawCost);

  let complexityLevel = COMPLEXITY_LEVELS.STANDARD;
  if (estimatedCost <= 4) complexityLevel = COMPLEXITY_LEVELS.SIMPLE;
  else if (estimatedCost >= 10) complexityLevel = COMPLEXITY_LEVELS.ADVANCED;
  else if (estimatedCost >= 7) complexityLevel = COMPLEXITY_LEVELS.COMPLEX;

  return {
    artifactType: normType,
    estimatedCost,
    complexityLevel,
    breakdown: {
      baseCost,
      unitCost,
      assetCost,
      complexityMultiplier,
    },
  };
}
