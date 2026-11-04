'use client'

import React, { useEffect, useRef } from 'react'
import { Upload, AlertCircle } from '@/components/ui/animated-icon'

import { LABEL } from '@/components/surface'

export default function DragDropOverlay({
    isVisible,
    isDragAccept = true,
    isDragReject = false,
    isImageMode = false,
    label,
    sublabel,
}) {
    const overlayRef = useRef(null)

    // Prevent any scroll/interaction behind overlay while visible
    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isVisible])

    if (!isVisible) return null

    const defaultLabel = isDragReject
        ? 'File type not supported'
        : (isImageMode ? 'Drop image here' : 'Drop files here')

    const defaultSublabel = isDragReject
        ? 'Please use supported file types'
        : (isImageMode
            ? 'JPG, PNG, WebP — max 10MB'
            : 'PDF, DOCX, TXT, CSV, JPG, PNG — max 10MB')

    return (
        <div
            ref={overlayRef}
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-9999 flex items-center justify-center bg-background/70 backdrop-blur-xl animate-drop-overlay-in"
        >
            {/* Scoped keyframes. The reduced-motion guard is inside the injected sheet
                rather than relying on the global `html.reduced-motion` rule, because
                that rule zeroes `animation-duration` on an element that starts at
                `opacity: 0` — the panel would flash rather than simply appear. Here
                the whole animation is dropped, so both elements render at their end
                state immediately. */}
            <style>{`
                @keyframes drop-overlay-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes drop-panel-in {
                    from { transform: scale(0.96); opacity: 0; }
                    to   { transform: scale(1);    opacity: 1; }
                }
                .animate-drop-overlay-in { animation: drop-overlay-in 200ms ease-out forwards; }
                .animate-drop-panel-in   { animation: drop-panel-in 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @media (prefers-reduced-motion: reduce) {
                    .animate-drop-overlay-in,
                    .animate-drop-panel-in { animation: none; }
                }
            `}</style>

            {/* The panel was a hard-coded dark card with raw rgba borders and glows, so
                it looked identical in light mode and ignored the accent switcher. It is
                on `card` / `primary` / `rose` tokens now, which is also what lets the
                accept state follow [data-accent] instead of being permanently blue —
                blue is reserved for Deep Research. */}
            <div
                className={[
                    'pointer-events-none relative flex max-w-lg w-[90%] flex-col items-center justify-center gap-5',
                    'overflow-hidden rounded-3xl border-2 bg-card p-10 md:p-12 text-center',
                    'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] animate-drop-panel-in',
                    isDragReject ? 'border-rose-500/40' : 'border-primary/40',
                ].join(' ')}
            >
                {/* Tinted wash instead of the old radial glow: same softness, but it
                    resolves through a token so it inverts with the theme. */}
                <div
                    className={`absolute inset-0 ${isDragReject ? 'bg-rose-500/8' : 'bg-primary/8'}`}
                    aria-hidden="true"
                />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-muted/60">
                    {isDragReject ? (
                        <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
                    ) : (
                        <Upload className="h-10 w-10 text-primary" />
                    )}
                </div>

                <div className="relative z-10 flex flex-col gap-2">
                    <h2 className="m-0 text-2xl font-bold tracking-tight text-balance text-foreground">
                        {label || defaultLabel}
                    </h2>
                    <p className="m-0 text-sm font-medium text-muted-foreground">
                        {sublabel || defaultSublabel}
                    </p>
                </div>

                {/* Accepted extensions. `text-2.75` here rendered no font-size at all —
                    namespaced Tailwind v4 utilities reject bare decimals — so these
                    inherited 16px and were far larger than intended. */}
                {!isDragReject && (
                    <div className="relative z-10 mt-3 flex flex-wrap justify-center gap-2">
                        {(isImageMode ? ['JPG', 'PNG', 'WEBP'] : ['PDF', 'DOC', 'CSV', 'IMG', 'TXT']).map((ext) => (
                            <span
                                key={ext}
                                className={`${LABEL} rounded-md border border-border/60 bg-muted/60 px-2.5 py-1 text-muted-foreground`}
                            >
                                {ext}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
