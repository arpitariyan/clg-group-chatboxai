'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Copy, Check, ExternalLink, Globe, ChevronDown, Brain } from '@/components/ui/animated-icon'
import { motion } from 'motion/react'
import { MEASURE, LABEL, FOCUS_RING, QUIET_BUTTON } from './answerSurface'

/* Typography and colour here come from the shared answer-surface vocabulary in
   ./answerSurface.js — read the docblock there before changing anything visual,
   and do NOT reintroduce raw `gray-` / `zinc-` shades into this file. That split
   palette is exactly what made the answer look unrelated to the rest of the
   message. */

/* Code stays on an inverted panel in both themes — the same call Claude and
   ChatGPT make, because Prism's `oneDark` is a dark theme and swapping palettes
   mid-answer is more jarring than a consistent dark block. These literals are
   the *dark* ramp from globals.css, so in dark mode the block is continuous with
   the surrounding surface instead of being a foreign object. */
const CODE_SURFACE = '#17171a' // = .dark --canvas
const CODE_HEADER = '#0f0f11'  // = .dark --page
const CODE_EDGE = '#2a2a30'    // = .dark --line

/* ─────────────────────────────────────────────────────────────────────────────
   localStorage-backed animation tracker.

   WHY localStorage (not module-level Set, not sessionStorage):
   - Module-level Set: Next.js resets it on every page navigation → re-animates
   - sessionStorage:   Same problem — clears on navigation in some Next.js setups
   - localStorage:     Persists until user clears browser data → perfect

   Rule: a resultId is animated ONCE ever. Back-navigate? Already in storage → skip.
   New question answered? New resultId → not in storage → animate.
───────────────────────────────────────────────────────────────────────────── */
const LS_KEY = 'ai_typing_animated_ids'

function hasBeenAnimated(id) {
    if (!id || typeof window === 'undefined') return false
    try {
        const raw = localStorage.getItem(LS_KEY)
        const ids = raw ? JSON.parse(raw) : []
        return Array.isArray(ids) && ids.includes(id)
    } catch {
        return false
    }
}

function markAsAnimated(id) {
    if (!id || typeof window === 'undefined') return
    try {
        const raw = localStorage.getItem(LS_KEY)
        const ids = raw ? JSON.parse(raw) : []
        if (!Array.isArray(ids) || ids.includes(id)) return
        // Keep last 200 IDs max to avoid bloat
        const trimmed = ids.slice(-199)
        trimmed.push(id)
        localStorage.setItem(LS_KEY, JSON.stringify(trimmed))
    } catch {
        /* silent */
    }
}

/* Typing out an answer character-by-character is decorative motion, so it has to
   yield to a reduced-motion preference. Both signals are honoured: the OS media
   query, and `html.reduced-motion` which the app's own appearance setting sets. */
function prefersReducedMotion() {
    if (typeof window === 'undefined') return false
    try {
        return (
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            document.documentElement.classList.contains('reduced-motion')
        )
    } catch {
        return false
    }
}

/* ─── Language display-name map ─── */
const LANG_NAMES = {
    js: 'JavaScript', jsx: 'JSX',
    ts: 'TypeScript', tsx: 'TSX',
    py: 'Python', python: 'Python',
    rb: 'Ruby', rs: 'Rust',
    go: 'Go', java: 'Java',
    cs: 'C#', cpp: 'C++', c: 'C',
    php: 'PHP', swift: 'Swift',
    kt: 'Kotlin', scala: 'Scala',
    sh: 'Shell', bash: 'Bash', zsh: 'Zsh',
    sql: 'SQL', graphql: 'GraphQL',
    html: 'HTML', css: 'CSS', scss: 'SCSS',
    json: 'JSON', yaml: 'YAML', toml: 'TOML',
    xml: 'XML', md: 'Markdown',
    dockerfile: 'Dockerfile', docker: 'Docker',
    text: 'Plain Text', txt: 'Plain Text',
}

const getLangLabel = (lang) =>
    LANG_NAMES[lang?.toLowerCase()] ?? lang?.toUpperCase() ?? 'CODE'

/* ─── Copy button (lives on the inverted code panel, so it is dark-only) ─── */
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        if (copied) return
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text)
            } else {
                const ta = document.createElement('textarea')
                ta.value = text
                ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0'
                document.body.appendChild(ta)
                ta.focus()
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
            }
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch { /* silent */ }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Code copied to clipboard' : 'Copy code'}
            className={`
                flex items-center gap-1.5 rounded-control px-2 py-1
                text-[0.6875rem] font-medium tracking-wide
                transition-colors duration-150 cursor-pointer select-none
                ${FOCUS_RING}
                ${copied
                    ? 'text-emerald-400'
                    : 'text-white/45 hover:text-white/90 hover:bg-white/8'
                }
            `}
        >
            {copied ? (
                <><Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /><span>Copied</span></>
            ) : (
                <><Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /><span>Copy</span></>
            )}
        </button>
    )
}

/* ─── Smart link ───
   A bare URL pasted into an answer becomes a compact source chip; anything with
   real link text stays inline prose. The inline case is deliberately `inline`
   (not inline-flex, and with no trailing icon): inline-flex stops a multi-word
   link from wrapping across lines, and an icon after every link breaks the
   reading rhythm — neither Claude nor ChatGPT stamps one. */
function SmartLink({ href, children }) {
    const childText = typeof children === 'string' ? children : ''
    const isRawUrl = childText.startsWith('http://') || childText.startsWith('https://')

    let domain = ''
    let pathname = ''
    try {
        const u = new URL(href || childText)
        domain = u.hostname.replace(/^www\./, '')
        pathname = u.pathname + u.search
    } catch { /* not a valid URL */ }

    const shortPath = pathname && pathname !== '/'
        ? (pathname.length > 40 ? pathname.slice(0, 40) + '…' : pathname)
        : ''

    const commonProps = {
        href: href || childText,
        target: '_blank',
        rel: 'noopener noreferrer',
    }

    if (isRawUrl && domain) {
        return (
            <a
                {...commonProps}
                className={`group my-0.5 inline-flex max-w-full items-center gap-2
                            rounded-control px-2.5 py-1.5 align-middle
                            text-[0.8125rem] leading-tight font-medium
                            no-underline ${QUIET_BUTTON}`}
            >
                <Globe className="w-3.5 h-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                <span className="min-w-0 truncate">
                    <span className="font-semibold text-ink">{domain}</span>
                    {shortPath && <span className="font-normal text-ink-3">{shortPath}</span>}
                </span>
                <ExternalLink
                    className="ml-auto w-3 h-3 shrink-0 text-ink-3 transition-colors group-hover:text-ink-2"
                    aria-hidden="true"
                />
            </a>
        )
    }

    return (
        <a
            {...commonProps}
            className={`inline font-medium text-ink underline decoration-line-strong
                        decoration-1 underline-offset-[3px] transition-colors duration-150
                        hover:decoration-ink-3 [overflow-wrap:anywhere] ${FOCUS_RING}`}
        >
            {children}
        </a>
    )
}

/* ─── Fenced code block ───
   The three fake macOS traffic-light dots that used to sit in the header were
   pure decoration: they carry no state, aren't clickable, and pulled the eye to
   the least important part of the block. Header is now just language + copy. */
function CodeBlock({ language, code }) {
    const lang = language || 'text'
    const label = getLangLabel(lang)

    return (
        <div
            className="not-prose my-5 overflow-hidden rounded-xl border"
            style={{ background: CODE_SURFACE, borderColor: CODE_EDGE }}
        >
            <div
                className="flex items-center justify-between border-b px-3 py-1.5"
                style={{ background: CODE_HEADER, borderColor: CODE_EDGE }}
            >
                <span className={`${LABEL} select-none font-mono text-white/40`}>
                    {label}
                </span>
                <CopyButton text={code} />
            </div>
            <div className="overflow-x-auto">
                <SyntaxHighlighter
                    style={oneDark}
                    language={lang}
                    PreTag="div"
                    showLineNumbers
                    lineNumberStyle={{
                        minWidth: '2.25em',
                        paddingRight: '1em',
                        color: 'rgba(255,255,255,0.22)',
                        userSelect: 'none',
                        fontSize: '0.75rem',
                    }}
                    customStyle={{
                        margin: 0,
                        padding: '0.875rem 1rem',
                        background: 'transparent',
                        fontSize: '0.8125rem',
                        lineHeight: '1.7',
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
                            fontVariantLigatures: 'contextual',
                        }
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    )
}

const THINKING_PHRASES = [
    "Analyzing request...",
    "Searching knowledge base...",
    "Evaluating search results...",
    "Formulating reasoning...",
    "Drafting response...",
    "Synthesizing information..."
];

/* ─── Thinking Block ───
   Intentionally chrome-free: no background, no border, no circle behind the
   icon — just a label and a hairline rail. See
   memory_project/thinking_ui_redesign.md; that shape is a standing decision, so
   only the colour tokens changed here. */
function ThinkingBlock({ content, isFinished }) {
    const [isOpen, setIsOpen] = useState(!isFinished);
    const [phraseIndex, setPhraseIndex] = useState(0);

    // Auto-close when finished
    useEffect(() => {
        if (isFinished) {
            setIsOpen(false);
        }
    }, [isFinished]);

    useEffect(() => {
        if (isFinished || content) return;
        const interval = setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [isFinished, content]);

    return (
        <div className="not-prose mb-5 flex w-full flex-col group/thinking">
            <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                className={`-mx-1 flex w-fit cursor-pointer select-none items-center gap-2
                            rounded-control px-1 py-0.5 text-ink-3 transition-colors
                            hover:text-ink-2 ${FOCUS_RING}`}
            >
                <Brain className="w-4 h-4" aria-hidden="true" />
                <span className="text-[0.9375rem] font-medium">
                    {isFinished ? 'Reasoning' : 'Thinking…'}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </motion.div>
            </button>

            {isOpen && (
                <div className="relative ml-[7px] mt-2 pl-5">
                    <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-line-strong" />

                    <div className={`${MEASURE} w-full whitespace-pre-wrap font-sans text-[0.9375rem] leading-[1.7] text-ink-2`}>
                        {content ? (
                            content
                        ) : (
                            <motion.div
                                key={phraseIndex}
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, filter: "blur(4px)" }}
                                transition={{ duration: 0.4 }}
                                className="flex items-center gap-2"
                            >
                                <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ink-3" />
                                {THINKING_PHRASES[phraseIndex]}
                            </motion.div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
function DisplaySummery({
    aiResp,
    usedModel,
    modelApi,
    isFileAnalysis,
    analyzedFilesCount,
    isLatestMessage,
    resultId,
    isThinkingMode,
}) {
    /*
     * shouldAnimate — decided at component mount using localStorage.
     * A reduced-motion preference opts out entirely: the answer renders complete.
     */
    const [shouldAnimate] = useState(() => {
        if (!resultId) return false
        if (prefersReducedMotion()) return false
        return !hasBeenAnimated(resultId)
    })

    // Pre-parse the aiResp into thinking and final content ONCE
    const { fullThinking, fullFinal } = useMemo(() => {
        if (!aiResp) return { fullThinking: '', fullFinal: '' };

        const closedMatch = aiResp.match(/<think>([\s\S]*?)<\/think>/i);
        const openMatch = !closedMatch ? aiResp.match(/<think>([\s\S]*)$/i) : null;

        let thinking = '';
        let final = aiResp;

        if (closedMatch) {
            thinking = closedMatch[1].trim();
            final = aiResp.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
        } else if (openMatch) {
            const unclosed = openMatch[1];
            const transitionMatch = unclosed.match(/\n\n(?:\*\*|#|\d+\.\s|Here is)/);
            if (transitionMatch) {
                thinking = unclosed.substring(0, transitionMatch.index).trim();
                final = unclosed.substring(transitionMatch.index).trim();
            } else {
                thinking = unclosed.trim();
                final = '';
            }
        }

        // Remove trailing or leading tool_call tags from final
        final = final.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();

        return { fullThinking: thinking, fullFinal: final };
    }, [aiResp]);

    const [displayedThinking, setDisplayedThinking] = useState(
        shouldAnimate ? '' : fullThinking
    )
    const [displayedFinal, setDisplayedFinal] = useState(
        shouldAnimate ? '' : fullFinal
    )

    const rafRef = useRef(null)

    useEffect(() => {
        if (!aiResp) return

        if (!shouldAnimate) {
            setDisplayedThinking(fullThinking)
            setDisplayedFinal(fullFinal)
            return
        }

        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }

        const totalLength = fullThinking.length + fullFinal.length;
        let currentIndex = 0;

        const tick = () => {
            const isInsideThink = currentIndex < fullThinking.length;
            const charsPerFrame = isInsideThink ? 3 : 15;

            currentIndex = Math.min(currentIndex + charsPerFrame, totalLength)

            if (currentIndex <= fullThinking.length) {
                setDisplayedThinking(fullThinking.slice(0, currentIndex))
            } else {
                // Thinking block is done
                setDisplayedThinking(fullThinking)
                setDisplayedFinal(fullFinal.slice(0, currentIndex - fullThinking.length))
            }

            if (currentIndex < totalLength) {
                rafRef.current = requestAnimationFrame(tick)
            } else {
                markAsAnimated(resultId)
                rafRef.current = null
            }
        }

        rafRef.current = requestAnimationFrame(tick)

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [aiResp, shouldAnimate, fullThinking, fullFinal, resultId])

    /* Markdown renderers.

       Type scale is deliberately compressed relative to a document: an in-answer
       h1 is 20px, not 30px. A heading inside a chat reply is a section marker,
       not a page title — at 30px it out-shouted the page's own chrome. Hierarchy
       is carried by weight and by asymmetric margins (more space above a heading
       than below it, so it binds to the text it introduces).

       Headings and text blocks are capped at MEASURE; tables, code and rules run
       the full column width. */
    const components = useMemo(() => ({
        pre: ({ children }) => <>{children}</>,

        h1: ({ node, ...props }) => (
            <h1 className={`${MEASURE} mt-9 mb-3.5 text-xl font-semibold leading-snug tracking-[-0.011em] text-balance text-ink first:mt-0`} {...props} />
        ),
        h2: ({ node, ...props }) => (
            <h2 className={`${MEASURE} mt-8 mb-3 text-[1.0625rem] font-semibold leading-snug tracking-[-0.006em] text-balance text-ink first:mt-0`} {...props} />
        ),
        h3: ({ node, ...props }) => (
            <h3 className={`${MEASURE} mt-6 mb-2 text-base font-semibold leading-snug text-balance text-ink first:mt-0`} {...props} />
        ),
        h4: ({ node, ...props }) => (
            <h4 className={`${MEASURE} mt-5 mb-1.5 text-[0.9375rem] font-semibold leading-snug text-ink first:mt-0`} {...props} />
        ),
        h5: ({ node, ...props }) => (
            <h5 className={`${MEASURE} mt-5 mb-1.5 text-[0.9375rem] font-semibold leading-snug text-ink-2 first:mt-0`} {...props} />
        ),
        h6: ({ node, ...props }) => (
            <h6 className={`${MEASURE} ${LABEL} mt-5 mb-1.5 text-ink-3 first:mt-0`} {...props} />
        ),

        p: ({ node, ...props }) => (
            <p className={`${MEASURE} mb-4 text-base leading-[1.7] text-ink last:mb-0 wrap-break-word`} {...props} />
        ),

        a: ({ node, href, children, ...props }) => (
            <SmartLink href={href}>{children}</SmartLink>
        ),

        /* `[&_ul]` / `[&_ol]` tighten nested lists — a sub-list inheriting the
           top-level my-4 opened a gap that broke the parent item apart. */
        ul: ({ node, ...props }) => (
            <ul className={`${MEASURE} my-4 ml-5 list-disc space-y-2 text-base text-ink marker:text-ink-3 first:mt-0 last:mb-0 [&_ol]:my-2 [&_ul]:my-2`} {...props} />
        ),
        ol: ({ node, ...props }) => (
            <ol className={`${MEASURE} my-4 ml-5 list-decimal space-y-2 text-base text-ink marker:font-medium marker:text-ink-3 first:mt-0 last:mb-0 [&_ol]:my-2 [&_ul]:my-2`} {...props} />
        ),
        li: ({ node, ...props }) => (
            <li className="pl-0.5 leading-[1.7] wrap-break-word" {...props} />
        ),

        /* `border-l-0.75` used to be here — Tailwind v4's border-width utility
           rejects decimals outright, so it rendered no rail at all. Also dropped
           the italic: a whole block of italic body copy reads slower, and the
           rail already says "quoted". */
        blockquote: ({ node, ...props }) => (
            <blockquote className={`${MEASURE} my-5 border-l-2 border-line-strong py-0.5 pl-4 text-base leading-[1.7] text-ink-2 [&>p]:mb-2 [&>p:last-child]:mb-0`} {...props} />
        ),

        hr: ({ node, ...props }) => (
            <hr className="my-8 border-0 border-t border-line" {...props} />
        ),

        table: ({ node, ...props }) => (
            <div className="not-prose my-5 overflow-x-auto rounded-xl border border-line">
                <table className="w-full border-collapse text-[0.875rem] text-ink" {...props} />
            </div>
        ),
        thead: ({ node, ...props }) => (
            <thead className={`${LABEL} bg-inset text-ink-3`} {...props} />
        ),
        th: ({ node, ...props }) => (
            <th className="whitespace-nowrap border-b border-line px-3.5 py-2.5 text-left" {...props} />
        ),
        tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-line" {...props} />
        ),
        tr: ({ node, ...props }) => (
            <tr className="transition-colors duration-100 hover:bg-inset" {...props} />
        ),
        /* tabular-nums keeps figure columns from jittering row to row. */
        td: ({ node, ...props }) => (
            <td className="px-3.5 py-2.5 align-top leading-[1.6] tabular-nums wrap-break-word" {...props} />
        ),

        code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children).replace(/\n$/, '')

            if (match) {
                return <CodeBlock language={match[1]} code={codeString} />
            }

            /* Inline code is neutral, not rose. It appears mid-sentence dozens of
               times in a technical answer; a saturated colour at that frequency
               turns body copy into confetti and competed with the real accents.
               `rounded-1.25` was dead here (no such radius token) — now [5px], the
               same value the citation chips use. `em` sizing so it tracks whatever
               size its container sets. */
            return (
                <code
                    className="mx-0.5 rounded-[5px] bg-inset px-1.5 py-0.5
                               font-mono text-[0.85em] leading-normal text-ink
                               shadow-hairline [overflow-wrap:anywhere]"
                    {...props}
                >
                    {children}
                </code>
            )
        },

        del: ({ node, ...props }) => (
            <del className="text-ink-3 line-through" {...props} />
        ),

        input: ({ node, ...props }) => {
            if (props.type === 'checkbox') {
                return (
                    <input
                        className="mr-2 h-4 w-4 cursor-default rounded border-line-strong accent-primary"
                        readOnly
                        {...props}
                    />
                )
            }
            return <input {...props} />
        },

        /* Body copy is already `text-ink`, so emphasis reads through weight
           alone — no colour shift needed. `not-italic-code` used to hang off the
           `em` here; it is not a Tailwind class and was defined nowhere. */
        strong: ({ node, ...props }) => (
            <strong className="font-semibold text-ink" {...props} />
        ),
        em: ({ node, ...props }) => (
            <em className="italic" {...props} />
        ),
    }), [])

    // If the model skipped reasoning entirely
    const modelSkippedThinking = !fullThinking && fullFinal.length > 25;
    const shouldShowThinkingBlock = fullThinking.length > 0 || (isThinkingMode && !modelSkippedThinking);

    // Thinking is finished when we've typed it all out (or if we skipped animation)
    const isThinkingFinished = !shouldAnimate || displayedThinking.length >= fullThinking.length;

    return (
        <div className="w-full min-w-0">
            {shouldShowThinkingBlock && (
                <ThinkingBlock content={displayedThinking} isFinished={isThinkingFinished} />
            )}
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={components}
            >
                {displayedFinal}
            </ReactMarkdown>
        </div>
    )
}

export default DisplaySummery
