/**
 * ChatBox AI — Canonical Content Model (Phase 4)
 * ════════════════════════════════════════════════════════
 * Creates a single semantic source of truth for documents, reports, and artifacts.
 * Prevents contradictory outputs when converting between formats (PDF, Word, Excel, PowerPoint).
 */

export class CanonicalDocument {
  constructor(data = {}) {
    this.title = data.title || 'Untitled Artifact';
    this.subtitle = data.subtitle || '';
    this.executiveSummary = data.executiveSummary || '';
    this.author = data.author || 'ChatBox AI';
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.sections = Array.isArray(data.sections) ? data.sections : [];
    this.recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    this.references = Array.isArray(data.references) ? data.references : [];
    this.metadata = data.metadata || {};
  }

  /**
   * Convert canonical document to Markdown format.
   */
  toMarkdown() {
    const lines = [`# ${this.title}`];
    if (this.subtitle) lines.push(`*${this.subtitle}*\n`);
    lines.push(`**Date:** ${this.date} | **Author:** ${this.author}\n`);

    if (this.executiveSummary) {
      lines.push(`## Executive Summary\n${this.executiveSummary}\n`);
    }

    for (const section of this.sections) {
      const headingPrefix = '#'.repeat(Math.min(section.level || 2, 6));
      lines.push(`${headingPrefix} ${section.heading || 'Section'}\n`);

      if (section.content) {
        lines.push(`${section.content}\n`);
      }

      if (Array.isArray(section.bullets) && section.bullets.length > 0) {
        section.bullets.forEach((b) => lines.push(`- ${b}`));
        lines.push('');
      }

      if (Array.isArray(section.table?.rows) && section.table.rows.length > 0) {
        const headers = section.table.headers || Object.keys(section.table.rows[0]);
        lines.push(`| ${headers.join(' | ')} |`);
        lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
        section.table.rows.forEach((row) => {
          const values = headers.map((h) => (typeof row === 'object' ? row[h] ?? '' : row));
          lines.push(`| ${values.join(' | ')} |`);
        });
        lines.push('');
      }
    }

    if (this.recommendations.length > 0) {
      lines.push(`## Key Recommendations\n`);
      this.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
      lines.push('');
    }

    if (this.references.length > 0) {
      lines.push(`## References\n`);
      this.references.forEach((ref) => {
        if (typeof ref === 'string') lines.push(`- ${ref}`);
        else lines.push(`- [${ref.title || ref.url}](${ref.url || '#'})`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export PDF layout specification.
   */
  toPDFSpec() {
    return {
      pageSize: 'A4',
      margin: '20mm',
      title: this.title,
      subtitle: this.subtitle,
      header: `${this.title} — ${this.date}`,
      footer: 'Page {pageNumber} of {totalPages}',
      contentMarkdown: this.toMarkdown(),
      sectionsCount: this.sections.length,
    };
  }

  /**
   * Export Excel sheet specification.
   */
  toExcelSpec() {
    const sheets = [];

    // Summary Sheet
    sheets.push({
      name: 'Executive Summary',
      data: [
        ['Title', this.title],
        ['Subtitle', this.subtitle],
        ['Date', this.date],
        ['Summary', this.executiveSummary],
      ],
    });

    // Data / Section Sheets
    this.sections.forEach((sec, idx) => {
      if (Array.isArray(sec.table?.rows) && sec.table.rows.length > 0) {
        const headers = sec.table.headers || Object.keys(sec.table.rows[0]);
        const rows = sec.table.rows.map((r) => headers.map((h) => r[h] ?? ''));
        sheets.push({
          name: sec.heading ? sec.heading.slice(0, 30) : `Section ${idx + 1}`,
          data: [headers, ...rows],
        });
      }
    });

    return { sheets };
  }

  /**
   * Export PowerPoint slide deck specification.
   */
  toPowerPointSpec() {
    const slides = [];

    // Title Slide
    slides.push({
      type: 'title',
      title: this.title,
      subtitle: this.subtitle || this.executiveSummary.slice(0, 120),
    });

    // Executive Summary Slide
    if (this.executiveSummary) {
      slides.push({
        type: 'content',
        title: 'Executive Summary',
        bullets: [this.executiveSummary],
      });
    }

    // Section Slides
    for (const sec of this.sections) {
      slides.push({
        type: 'content',
        title: sec.heading || 'Key Insights',
        bullets: Array.isArray(sec.bullets) && sec.bullets.length > 0 ? sec.bullets.slice(0, 5) : [sec.content?.slice(0, 200) || ''],
      });
    }

    // Recommendations Slide
    if (this.recommendations.length > 0) {
      slides.push({
        type: 'content',
        title: 'Recommendations',
        bullets: this.recommendations.slice(0, 5),
      });
    }

    return { slides };
  }
}
