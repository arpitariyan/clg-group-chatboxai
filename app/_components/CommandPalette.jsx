'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Search, Slash } from '@/components/ui/animated-icon'
import { findMatchingCommands } from '@/services/Commands'

export default function CommandPalette({
  visible = false,
  initialQuery = '',
  anchorRef = null,
  onClose = () => {},
  onSelect = () => {},
}) {
  const [query, setQuery] = useState(initialQuery || '')
  const [results, setResults] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 360 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setQuery(initialQuery || '')
  }, [initialQuery])

  useEffect(() => {
    if (!visible) return
    const nextResults = findMatchingCommands(query)
    setResults(nextResults)
    setActiveIndex((current) => Math.min(current, Math.max(0, nextResults.length - 1)))
  }, [visible, query])

  const updatePosition = useMemo(() => {
    return () => {
      if (!anchorRef?.current || typeof window === 'undefined') return

      const rect = anchorRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const preferredWidth = Math.min(560, Math.max(320, rect.width))
      const left = Math.min(Math.max(16, rect.left), Math.max(16, viewportWidth - preferredWidth - 16))

      const aboveSpace = Math.max(0, rect.top - 20)
      const belowSpace = Math.max(0, viewportHeight - rect.bottom - 20)
      const openAbove = aboveSpace >= belowSpace || belowSpace < 240
      const maxHeight = Math.max(220, Math.min(420, openAbove ? aboveSpace : belowSpace))
      const top = openAbove
        ? Math.max(16, rect.top - Math.min(maxHeight, 360) - 14)
        : Math.min(viewportHeight - 16, rect.bottom + 14)

      setPosition({ top, left, width: preferredWidth, maxHeight })
    }
  }, [anchorRef])

  useEffect(() => {
    if (!visible) return

    updatePosition()

    const handleMove = () => updatePosition()
    window.addEventListener('resize', handleMove)
    window.addEventListener('scroll', handleMove, true)
    return () => {
      window.removeEventListener('resize', handleMove)
      window.removeEventListener('scroll', handleMove, true)
    }
  }, [visible, updatePosition])

  useEffect(() => {
    if (!visible) return

    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((current) => Math.min(current + 1, Math.max(0, results.length - 1)))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((current) => Math.max(current - 1, 0))
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        if (results[activeIndex]) {
          onSelect(results[activeIndex])
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, results, activeIndex, onClose, onSelect])

  if (!visible || !mounted) return null

  const palette = (
    <div className="fixed inset-0 z-70">
      <button
        aria-label="Close command palette"
        /* `backdrop-blur-0.5` emitted nothing — the blur namespace rejects bare
           decimals in Tailwind v4 — so the scrim was a flat tint with no blur. */
        className="absolute inset-0 cursor-default bg-black/20 backdrop-blur-sm"
        onMouseDown={onClose}
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="absolute rounded-2xl border border-border/60 bg-card/95 shadow-2xl shadow-black/20 ring-1 ring-black/5 backdrop-blur-xl overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: `${position.maxHeight}px`,
        }}
      >
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground">
            <Slash className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            {/* `text-2.75` / `text-2.5` render nothing in v4, so these three
                labels inherited 16px — an eyebrow and two pills all set at body
                size, with 0.24em tracking on top. */}
            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Command Palette</div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands or type /help"
              className="mt-0.5 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[inherit] overflow-y-auto p-2" style={{ maxHeight: `${Math.max(220, position.maxHeight - 66)}px` }}>
          {results.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              No commands found.
            </div>
          ) : (
            results.map((cmd, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={cmd.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onSelect(cmd)}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${isActive
                      ? 'bg-foreground/6 ring-1 ring-foreground/10'
                      : 'hover:bg-muted/70'
                    }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? 'bg-foreground text-background' : 'bg-muted/80 text-muted-foreground'}`}>
                    {isActive ? <Check className="h-4 w-4" /> : <Slash className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-medium text-foreground">{cmd.title}</div>
                      <span className="shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {cmd.category}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{cmd.description}</div>
                  </div>
                  <div className="mt-0.5 shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {cmd.shortcut || cmd.id}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(palette, document.body)
}
