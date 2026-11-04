'use client'

import React, { useId, useState } from 'react'
import { X, ChevronDown, ChevronUp, FileText } from '@/components/ui/animated-icon'

import { FOCUS_RING } from '@/components/surface'

export const PASTE_LINE_THRESHOLD = 12
export const PASTE_CHAR_THRESHOLD = 1200

export function normalizePastedText(text = '') {
  return String(text || '').replace(/\r\n?/g, '\n').trim()
}

export function getPasteMetrics(text = '') {
  const normalized = normalizePastedText(text)
  const lines = normalized ? normalized.split('\n') : []
  const nonEmptyLineCount = lines.filter(line => line.trim()).length

  return {
    text: normalized,
    lines,
    lineCount: nonEmptyLineCount,
    charCount: normalized.length,
  }
}

export function isLargePastedContent(text = '') {
  const { lineCount, charCount } = getPasteMetrics(text)
  return lineCount >= PASTE_LINE_THRESHOLD || charCount >= PASTE_CHAR_THRESHOLD
}

function formatCharCount(count) {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k chars`
  return `${count} chars`
}

function PasteMeta({ metrics }) {
  return (
    // `text-2.75` rendered nothing — namespaced Tailwind v4 utilities reject bare
    // decimals — so this line inherited its parent size. `tabular-nums` keeps the
    // counts from shifting the dot separator as digits change.
    <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
      <span>{metrics.lineCount} lines</span>
      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
      <span>{formatCharCount(metrics.charCount)}</span>
    </div>
  )
}

function LargePasteCard({ content, onRemove, readOnly }) {
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  const metrics = getPasteMetrics(content)
  const preview = metrics.lines.slice(0, 8).join('\n')
  const hasMore = metrics.lines.length > 8 || metrics.charCount > preview.length

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/35 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/60 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-foreground">Pasted text</div>
            <PasteMeta metrics={metrics} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(value => !value)}
              className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${FOCUS_RING}`}
              aria-expanded={expanded}
              aria-controls={bodyId}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span>{expanded ? 'Less' : 'More'}</span>
            </button>
          )}
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 ${FOCUS_RING}`}
              aria-label="Remove pasted text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        id={bodyId}
        role={hasMore ? 'button' : undefined}
        tabIndex={hasMore ? 0 : undefined}
        aria-expanded={hasMore ? expanded : undefined}
        aria-label={hasMore ? (expanded ? 'Collapse pasted text' : 'Expand pasted text') : undefined}
        onClick={() => hasMore && setExpanded(value => !value)}
        onKeyDown={(event) => {
          if (!hasMore) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setExpanded(value => !value)
          }
        }}
        className={`relative block w-full px-3 py-2 text-left ${hasMore ? `cursor-pointer ${FOCUS_RING}` : 'cursor-default'}`}
      >
        <pre className={`max-w-full whitespace-pre-wrap wrap-break-word font-mono text-xs leading-relaxed text-foreground/75 ${!expanded ? 'max-h-28 overflow-hidden' : 'max-h-72 overflow-auto pr-1'}`}>
          {expanded ? metrics.text : preview}
        </pre>
        {!expanded && hasMore && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-muted" />
        )}
      </div>
    </div>
  )
}

function SmallPasteChip({ content, index, onRemove, readOnly }) {
  const metrics = getPasteMetrics(content)
  const firstLine = metrics.lines.find(line => line.trim())?.trim() || ''
  const label = firstLine || `Paste ${index + 1}`

  return (
    <div className="flex h-9 min-w-37.5 max-w-full flex-1 basis-[calc(50%-0.375rem)] items-center gap-2 rounded-lg border border-border/70 bg-muted/35 px-2.5 text-xs shadow-sm sm:basis-[calc(25%-0.375rem)] sm:max-w-45">
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground/85" title={label}>
        {label}
      </span>
      <span className="shrink-0 rounded bg-background/70 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
        {metrics.lineCount}L
      </span>
      {!readOnly && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 ${FOCUS_RING}`}
          aria-label={`Remove pasted text: ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export default function PastedContentPreview({
  contents = [],
  onRemove,
  readOnly = false,
  extraContext = '',
  variant = 'default',
}) {
  const normalizedContents = contents.map(normalizePastedText).filter(Boolean)
  if (!normalizedContents.length) return null

  const isMultiple = normalizedContents.length > 1
  const isInline = variant === 'inline'

  return (
    <div className={readOnly ? 'w-full' : 'px-3 pt-3'}>
      <div className={isInline || !isMultiple ? 'space-y-2' : 'flex flex-wrap gap-1.5'}>
        {isMultiple ? (
          normalizedContents.map((item, i) => (
            isInline ? (
              <LargePasteCard
                key={`inline-paste-${i}`}
                content={item}
                readOnly={readOnly}
                onRemove={onRemove ? () => onRemove(i) : null}
              />
            ) : (
              <SmallPasteChip
                key={`paste-chip-${i}`}
                content={item}
                index={i}
                readOnly={readOnly}
                onRemove={onRemove ? () => onRemove(i) : null}
              />
            )
          ))
        ) : (
          <LargePasteCard
            content={normalizedContents[0]}
            readOnly={readOnly}
            onRemove={onRemove ? () => onRemove(0) : null}
          />
        )}
      </div>

      {readOnly && extraContext.trim() && (
        <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground/80">
            {extraContext}
          </p>
        </div>
      )}
    </div>
  )
}
