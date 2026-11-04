/**
 * ChatBox AI — Artifact Quality Validation Engine (Phase 5)
 * ════════════════════════════════════════════════════════════
 * Validates generated PDF, Word, Excel, PowerPoint, and Code artifacts before delivery.
 * Enforces quality gates and generates repair instructions on validation failures.
 */

export const ARTIFACT_TYPES = {
  PDF:        'pdf',
  EXCEL:      'excel',
  WORD:       'word',
  POWERPOINT: 'powerpoint',
  MARKDOWN:   'markdown',
  CODE:       'code',
};

/**
 * Validate a generated artifact specification or content buffer.
 *
 * @param {string} artifactType
 * @param {object|string|Buffer} content
 * @param {object} [options]
 * @returns {{ isValid: boolean, errors: string[], warnings: string[], qualityScore: number, repairInstructions?: string }}
 */
export function validateArtifact(artifactType, content, options = {}) {
  const errors = [];
  const warnings = [];

  if (!content) {
    return {
      isValid: false,
      errors: ['Artifact content is empty or null'],
      warnings: [],
      qualityScore: 0,
      repairInstructions: 'Regenerate content with non-empty payload',
    };
  }

  switch (artifactType?.toLowerCase()) {
    case ARTIFACT_TYPES.PDF:
      validatePDF(content, errors, warnings);
      break;
    case ARTIFACT_TYPES.EXCEL:
      validateExcel(content, errors, warnings);
      break;
    case ARTIFACT_TYPES.WORD:
    case ARTIFACT_TYPES.MARKDOWN:
      validateMarkdownDocument(content, errors, warnings);
      break;
    case ARTIFACT_TYPES.POWERPOINT:
      validatePowerPoint(content, errors, warnings);
      break;
    default:
      if (typeof content === 'string' && content.trim().length === 0) {
        errors.push('Output content is empty');
      }
      break;
  }

  const isValid = errors.length === 0;
  const qualityScore = Math.max(0, 100 - errors.length * 25 - warnings.length * 5);

  return {
    isValid,
    errors,
    warnings,
    qualityScore,
    repairInstructions: isValid
      ? null
      : `Repair artifact by addressing errors: ${errors.join('; ')}`,
  };
}

function validatePDF(pdfSpec, errors, warnings) {
  if (typeof pdfSpec === 'object') {
    if (!pdfSpec.title) errors.push('PDF title is missing');
    if (!pdfSpec.contentMarkdown || pdfSpec.contentMarkdown.length < 20) {
      errors.push('PDF body content is too short or empty');
    }
  } else if (Buffer.isBuffer(pdfSpec) || typeof pdfSpec === 'string') {
    const pdfHeader = pdfSpec.toString('utf-8', 0, 10);
    if (!pdfHeader.includes('%PDF-') && !pdfHeader.includes('#')) {
      errors.push('Invalid PDF file header');
    }
  }
}

function validateExcel(excelSpec, errors, warnings) {
  if (typeof excelSpec === 'object' && Array.isArray(excelSpec.sheets)) {
    if (excelSpec.sheets.length === 0) {
      errors.push('Excel workbook has no sheets');
    }
    for (const sheet of excelSpec.sheets) {
      if (!sheet.name) warnings.push('Unnamed sheet found in workbook');
      if (!Array.isArray(sheet.data) || sheet.data.length === 0) {
        errors.push(`Sheet "${sheet.name || 'unnamed'}" contains no data rows`);
      } else {
        // Check formulas for invalid references
        const dataStr = JSON.stringify(sheet.data);
        if (dataStr.includes('#REF!') || dataStr.includes('#NAME?')) {
          errors.push(`Sheet "${sheet.name}" contains broken formula references (#REF! / #NAME?)`);
        }
      }
    }
  }
}

function validateMarkdownDocument(docContent, errors, warnings) {
  const text = typeof docContent === 'string' ? docContent : JSON.stringify(docContent);
  if (text.length < 30) {
    errors.push('Document content is too brief (under 30 characters)');
  }
  if (!text.includes('#')) {
    warnings.push('Document lacks clear section headings (#)');
  }
}

function validatePowerPoint(pptSpec, errors, warnings) {
  if (typeof pptSpec === 'object' && Array.isArray(pptSpec.slides)) {
    if (pptSpec.slides.length === 0) {
      errors.push('Presentation contains 0 slides');
    }
    pptSpec.slides.forEach((slide, idx) => {
      if (!slide.title) warnings.push(`Slide ${idx + 1} is missing a title`);
      if (Array.isArray(slide.bullets) && slide.bullets.length > 7) {
        warnings.push(`Slide ${idx + 1} ("${slide.title}") has too many bullets (${slide.bullets.length}) for readable layout`);
      }
    });
  }
}
