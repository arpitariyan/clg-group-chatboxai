'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Copy, Check, ExternalLink, Globe } from 'lucide-react'

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

/* ─── Copy button ─── */
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
            title={copied ? 'Copied!' : 'Copy code'}
            aria-label={copied ? 'Copied!' : 'Copy code'}
            className={`
                flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium
                transition-all duration-150 cursor-pointer select-none active:scale-95
                ${copied
                    ? 'text-emerald-400 bg-emerald-400/10'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
                }
            `}
        >
            {copied ? (
                <><Check className="w-3.5 h-3.5 shrink-0" /><span>Copied!</span></>
            ) : (
                <><Copy className="w-3.5 h-3.5 shrink-0" /><span>Copy</span></>
            )}
        </button>
    )
}

/* ─── Smart link ─── */
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
                className="inline-flex items-center gap-2 my-0.5 px-3 py-1.5
                           rounded-lg border border-gray-200 dark:border-zinc-700
                           bg-gray-50 dark:bg-zinc-800/60
                           text-gray-700 dark:text-zinc-300
                           hover:border-gray-400 dark:hover:border-zinc-500
                           hover:bg-gray-100 dark:hover:bg-zinc-800
                           transition-all duration-150 no-underline group max-w-full
                           text-sm font-medium leading-tight"
            >
                <Globe className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
                <span className="truncate">
                    <span className="font-semibold text-gray-900 dark:text-zinc-100">{domain}</span>
                    {shortPath && (
                        <span className="text-gray-400 dark:text-zinc-500 font-normal">{shortPath}</span>
                    )}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0 text-gray-400 dark:text-zinc-500
                                        group-hover:text-gray-600 dark:group-hover:text-zinc-300
                                        transition-colors ml-auto" />
            </a>
        )
    }

    return (
        <a
            {...commonProps}
            className="inline-flex items-center gap-0.5 font-medium
                       text-gray-800 dark:text-zinc-200
                       underline underline-offset-2 decoration-gray-400 dark:decoration-zinc-500
                       hover:text-gray-900 dark:hover:text-zinc-100
                       hover:decoration-gray-600 dark:hover:decoration-zinc-300
                       transition-colors duration-150"
        >
            {children}
            <ExternalLink className="w-3 h-3 shrink-0 opacity-60 ml-0.5 mt-0.5" />
        </a>
    )
}

/* ─── Fenced code block ─── */
function CodeBlock({ language, code }) {
    const lang = language || 'text'
    const label = getLangLabel(lang)

    return (
        <div className="my-5 rounded-xl overflow-hidden border border-zinc-700/40 bg-[#1a1a1a] shadow-lg not-prose">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#111111] border-b border-zinc-700/40">
                <div className="flex items-center gap-2">
                    <span className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-zinc-700" />
                        <span className="w-3 h-3 rounded-full bg-zinc-700" />
                        <span className="w-3 h-3 rounded-full bg-zinc-700" />
                    </span>
                    <span className="text-xs font-mono font-medium text-zinc-400 select-none ml-1">
                        {label}
                    </span>
                </div>
                <CopyButton text={code} />
            </div>
            <div className="overflow-x-auto">
                <SyntaxHighlighter
                    style={oneDark}
                    language={lang}
                    PreTag="div"
                    showLineNumbers
                    lineNumberStyle={{
                        minWidth: '2.5em',
                        paddingRight: '1em',
                        color: '#4b5563',
                        borderRight: '1px solid #27272a',
                        marginRight: '1em',
                        userSelect: 'none',
                        fontSize: '0.75rem',
                    }}
                    customStyle={{
                        margin: 0,
                        padding: '1rem 1.25rem',
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
}) {
    /*
     * shouldAnimate — decided at component mount using localStorage.
     *
     * true  → first time this resultId is shown → play typing animation
     * false → already animated before (back-navigation, re-render, etc.) → instant show
     *
     * We use useState initializer (runs only once at mount) so the decision
     * never flips during the component's lifetime.
     *
     * NOTE: isLatestMessage is intentionally NOT used here because the parent
     * passes true even on back-navigation, which was causing re-animation.
     */
    const [shouldAnimate] = useState(() => {
        if (!resultId) return false
        return !hasBeenAnimated(resultId)
    })

    const [displayedText, setDisplayedText] = useState(
        shouldAnimate ? '' : (aiResp ?? '')
    )

    const rafRef = useRef(null)

    useEffect(() => {
        if (!aiResp) return

        // History message or already animated → show instantly
        if (!shouldAnimate) {
            setDisplayedText(aiResp)
            return
        }

        // Cancel any stray animation frame
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }

        // Stream text in at ~1500 chars/sec (ChatGPT / Claude pace)
        const fullText = aiResp
        let currentIndex = 0
        const CHARS_PER_FRAME = 25

        const tick = () => {
            currentIndex = Math.min(currentIndex + CHARS_PER_FRAME, fullText.length)
            setDisplayedText(fullText.slice(0, currentIndex))

            if (currentIndex < fullText.length) {
                rafRef.current = requestAnimationFrame(tick)
            } else {
                // Animation done — persist to localStorage so back-navigation skips it
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aiResp])

    const components = useMemo(() => ({
        pre: ({ children }) => <>{children}</>,

        h1: ({ node, ...props }) => (
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-zinc-50 mt-8 mb-4 leading-tight tracking-tight" {...props} />
        ),
        h2: ({ node, ...props }) => (
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-zinc-50 mt-7 mb-3 leading-snug" {...props} />
        ),
        h3: ({ node, ...props }) => (
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-zinc-100 mt-6 mb-2 leading-snug" {...props} />
        ),
        h4: ({ node, ...props }) => (
            <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-zinc-100 mt-5 mb-2 leading-snug" {...props} />
        ),
        h5: ({ node, ...props }) => (
            <h5 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-zinc-100 mt-4 mb-1.5 leading-snug" {...props} />
        ),
        h6: ({ node, ...props }) => (
            <h6 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 mt-3 mb-1 leading-snug uppercase tracking-wider" {...props} />
        ),

        p: ({ node, ...props }) => (
            <p className="text-[0.9375rem] leading-[1.85] text-gray-700 dark:text-zinc-300 mb-4 last:mb-0 break-words" {...props} />
        ),

        a: ({ node, href, children, ...props }) => (
            <SmartLink href={href}>{children}</SmartLink>
        ),

        ul: ({ node, ...props }) => (
            <ul className="my-3 ml-5 space-y-1.5 text-[0.9375rem] text-gray-700 dark:text-zinc-300 list-disc marker:text-gray-400 dark:marker:text-zinc-600" {...props} />
        ),
        ol: ({ node, ...props }) => (
            <ol className="my-3 ml-5 space-y-1.5 text-[0.9375rem] text-gray-700 dark:text-zinc-300 list-decimal marker:font-medium marker:text-gray-500 dark:marker:text-zinc-500" {...props} />
        ),
        li: ({ node, ...props }) => (
            <li className="leading-[1.75] pl-0.5 break-words" {...props} />
        ),

        blockquote: ({ node, ...props }) => (
            <blockquote className="my-4 pl-4 pr-2 py-1 border-l-[3px] border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 italic" {...props} />
        ),

        hr: ({ node, ...props }) => (
            <hr className="my-8 border-0 border-t border-gray-200 dark:border-zinc-800" {...props} />
        ),

        table: ({ node, ...props }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700/80 shadow-sm">
                <table className="w-full text-sm text-gray-700 dark:text-zinc-300 border-collapse" {...props} />
            </div>
        ),
        thead: ({ node, ...props }) => (
            <thead className="bg-gray-50 dark:bg-zinc-800 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400" {...props} />
        ),
        th: ({ node, ...props }) => (
            <th className="px-4 py-3 text-left border-b border-gray-200 dark:border-zinc-700 whitespace-nowrap" {...props} />
        ),
        tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800" {...props} />
        ),
        tr: ({ node, ...props }) => (
            <tr className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors duration-100" {...props} />
        ),
        td: ({ node, ...props }) => (
            <td className="px-4 py-2.5 align-top break-words" {...props} />
        ),

        code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children).replace(/\n$/, '')

            if (match) {
                return <CodeBlock language={match[1]} code={codeString} />
            }

            return (
                <code
                    className="px-[5px] py-[2px] mx-[2px] rounded-[5px]
                               text-[0.8125rem] font-mono leading-normal
                               bg-gray-100 dark:bg-zinc-800
                               text-rose-600 dark:text-rose-400
                               border border-gray-200/80 dark:border-zinc-700
                               break-all"
                    {...props}
                >
                    {children}
                </code>
            )
        },

        del: ({ node, ...props }) => (
            <del className="line-through text-gray-400 dark:text-zinc-500" {...props} />
        ),

        input: ({ node, ...props }) => {
            if (props.type === 'checkbox') {
                return (
                    <input
                        className="mr-2 h-4 w-4 rounded border-gray-300 dark:border-zinc-600 accent-blue-600 cursor-default"
                        readOnly
                        {...props}
                    />
                )
            }
            return <input {...props} />
        },

        strong: ({ node, ...props }) => (
            <strong className="font-semibold text-gray-900 dark:text-zinc-100" {...props} />
        ),
        em: ({ node, ...props }) => (
            <em className="italic text-gray-700 dark:text-zinc-300 not-italic-code" {...props} />
        ),
    }), [])

    return (
        <div className="w-full min-w-0">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={components}
            >
                {displayedText}
            </ReactMarkdown>
        </div>
    )
}

export default DisplaySummery
