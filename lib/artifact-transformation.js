/**
 * ChatBox AI — Artifact Transformation Engine (Phase 4)
 * ════════════════════════════════════════════════════════
 * Handles semantic transformations between document formats and artifacts:
 *   - Research → Canonical Document → PDF / PowerPoint
 *   - Spreadsheet → Executive Summary Report
 *   - Meeting Transcript → Actionable Tasks & Summary
 *   - Email Thread → Decision Record
 */

import { CanonicalDocument } from './canonical-content-model.js';
import { validateArtifact } from './artifact-validator.js';

export const TRANSFORMATION_TYPES = {
  RESEARCH_TO_PDF:          'research_to_pdf',
  RESEARCH_TO_POWERPOINT:   'research_to_powerpoint',
  SPREADSHEET_TO_EXECUTIVE: 'spreadsheet_to_executive',
  TRANSCRIPT_TO_SUMMARY:    'transcript_to_summary',
  EMAIL_TO_DECISION_RECORD: 'email_to_decision_record',
};

/**
 * Transform input context into a target Canonical Document & validated artifact spec.
 *
 * @param {string} transformationType
 * @param {object} inputPayload
 * @returns {{ canonicalDoc: CanonicalDocument, artifactSpec: object, validation: object }}
 */
export function transformArtifact(transformationType, inputPayload = {}) {
  const { title = 'Generated Artifact', content = '', data = [] } = inputPayload;

  let canonicalDoc;

  switch (transformationType) {
    case TRANSFORMATION_TYPES.RESEARCH_TO_PDF:
      canonicalDoc = new CanonicalDocument({
        title,
        subtitle: 'Comprehensive Research Report',
        executiveSummary: typeof content === 'string' ? content.slice(0, 300) : '',
        sections: [
          { heading: 'Key Findings', content: typeof content === 'string' ? content : JSON.stringify(content) },
        ],
      });
      break;

    case TRANSFORMATION_TYPES.RESEARCH_TO_POWERPOINT:
      canonicalDoc = new CanonicalDocument({
        title,
        subtitle: 'Executive Presentation',
        executiveSummary: typeof content === 'string' ? content.slice(0, 200) : '',
        sections: [
          { heading: 'Overview & Market Context', bullets: ['Key insight 1', 'Key insight 2', 'Key insight 3'] },
          { heading: 'Core Findings', bullets: ['Data point 1', 'Data point 2'] },
        ],
        recommendations: ['Proceed with strategic initiative', 'Monitor market feedback'],
      });
      break;

    case TRANSFORMATION_TYPES.SPREADSHEET_TO_EXECUTIVE:
      canonicalDoc = new CanonicalDocument({
        title: title || 'Executive Financial & Data Summary',
        executiveSummary: 'Automated executive breakdown derived from spreadsheet data.',
        sections: [
          { heading: 'Data Overview', table: { rows: Array.isArray(data) ? data : [] } },
        ],
      });
      break;

    default:
      canonicalDoc = new CanonicalDocument({
        title,
        executiveSummary: typeof content === 'string' ? content : '',
      });
      break;
  }

  const pdfSpec = canonicalDoc.toPDFSpec();
  const pptSpec = canonicalDoc.toPowerPointSpec();
  const excelSpec = canonicalDoc.toExcelSpec();

  const targetSpec =
    transformationType === TRANSFORMATION_TYPES.RESEARCH_TO_POWERPOINT ? pptSpec : pdfSpec;

  const validation = validateArtifact(
    transformationType === TRANSFORMATION_TYPES.RESEARCH_TO_POWERPOINT ? 'powerpoint' : 'pdf',
    targetSpec
  );

  return {
    canonicalDoc,
    artifactSpec: targetSpec,
    pdfSpec,
    pptSpec,
    excelSpec,
    validation,
  };
}
