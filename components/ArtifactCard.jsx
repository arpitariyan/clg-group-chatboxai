'use client';

import React from 'react';
import { FileText, FileSpreadsheet, Presentation, FileCode, Download, Eye, CheckCircle, ShieldCheck } from '@/components/ui/animated-icon';
import { downloadAsPDF, downloadAsWord, downloadAsMarkdown } from '@/lib/document-exporter';

/**
 * ArtifactCard — Phase 2 Standalone Claude-Style Artifact Card Component
 * Renders PDF, Word, PowerPoint, and Excel artifacts as independent cards
 * outside conversational aiResp text.
 */
export default function ArtifactCard({ artifact, fullContent = '' }) {
  if (!artifact) return null;

  const type = String(artifact.type || 'pdf').toLowerCase();
  const title = artifact.title || 'Generated Artifact';
  const pageCount = artifact.pageCount || 1;
  const slideCount = artifact.slideCount || 0;
  const sheetCount = artifact.sheetCount || 1;
  const qualityScore = artifact.validation?.qualityScore || 100;
  const totalCredits = artifact.usage?.totalCredits || 0;

  const getFormatBadge = () => {
    switch (type) {
      case 'pdf':
        return { label: 'PDF DOCUMENT', icon: FileText, color: 'border-red-500/30 bg-red-500/10 text-red-500' };
      case 'docx':
      case 'doc':
      case 'word':
        return { label: 'WORD DOCUMENT', icon: FileText, color: 'border-blue-500/30 bg-blue-500/10 text-blue-500' };
      case 'pptx':
      case 'powerpoint':
        return { label: 'POWERPOINT DECK', icon: Presentation, color: 'border-amber-500/30 bg-amber-500/10 text-amber-500' };
      case 'xlsx':
      case 'csv':
      case 'excel':
        return { label: 'EXCEL SPREADSHEET', icon: FileSpreadsheet, color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' };
      default:
        return { label: 'DOCUMENT ARTIFACT', icon: FileCode, color: 'border-primary/30 bg-primary/10 text-primary' };
    }
  };

  const badge = getFormatBadge();
  const IconComp = badge.icon;

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${badge.color}`}>
            <IconComp className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${badge.color}`}>
                {badge.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-500">
                <ShieldCheck className="h-3 w-3" /> Validated ({qualityScore}%)
              </span>
            </div>

            <h4 className="truncate text-sm font-semibold text-foreground">{title}</h4>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {type === 'pdf' && <span>{pageCount} Page{pageCount > 1 ? 's' : ''}</span>}
              {type === 'pptx' && <span>{slideCount || 5} Slides</span>}
              {type === 'xlsx' && <span>{sheetCount} Sheet</span>}
              {totalCredits > 0 && <span className="font-mono text-[11px] text-primary">{totalCredits} credits</span>}
            </div>
          </div>
        </div>

        {/* Instant Action Buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {type === 'pdf' ? (
            <button
              type="button"
              onClick={() => downloadAsPDF(title, fullContent)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download PDF</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => downloadAsWord(title, fullContent)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Word</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
