'use client'

import React, { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
    Loader2,
    X,
    Monitor,
    Tablet,
    Smartphone,
    ExternalLink,
    ArrowLeft,
    CheckCircle,
    Eye
} from 'lucide-react'
import { toast } from '@/lib/alert'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'

const WebContainerPreview = dynamic(
    () => import('@/components/website-builder/WebContainerPreview'),
    {
        ssr: false,
        loading: () => (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm">Initializing preview sandbox...</p>
            </div>
        )
    }
)

function isViteFileMap(code) {
    if (!code) return false
    if (typeof code === 'object' && code !== null) return true
    if (typeof code === 'string') {
        const trimmed = code.trim()
        if (trimmed.startsWith('{') && (trimmed.includes('"package.json"') || trimmed.includes('"index.html"') || trimmed.includes('"src/App.jsx"'))) {
            try {
                const parsed = JSON.parse(trimmed)
                return Boolean(parsed && typeof parsed === 'object' && (parsed['package.json'] || parsed['index.html']))
            } catch {
                return false
            }
        }
    }
    return false
}

export default function PreviewPage({ params: paramsPromise }) {
    const [projectId, setProjectId] = useState(null)
    const [versionId, setVersionId] = useState(null)
    const [project, setProject] = useState(null)
    const [currentVersion, setCurrentVersion] = useState(null)
    const [code, setCode] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [device, setDevice] = useState('desktop') // 'desktop' | 'tablet' | 'mobile'

    const htmlIframeRef = useRef(null)
    const { currentUser } = useAuth()

    // Unwrap params Promise
    useEffect(() => {
        if (!paramsPromise) return
        Promise.resolve(paramsPromise).then((p) => {
            setProjectId(p?.projectId || null)
            const vId = Array.isArray(p?.versionId) ? p.versionId[0] : p?.versionId
            setVersionId(vId || null)
        })
    }, [paramsPromise])

    useEffect(() => {
        if (!projectId) return

        let isCancelled = false

        const fetchCode = async () => {
            try {
                setLoading(true)
                setError(null)

                const ownerQuery = currentUser?.email
                    ? `?userEmail=${encodeURIComponent(currentUser.email)}`
                    : ''
                const response = await authFetch(`/api/website-builder/project/${projectId}${ownerQuery}`)
                const data = await response.json()

                if (isCancelled) return

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch project preview')
                }

                const proj = data.project
                setProject(proj)

                // If versionId is specified, find that version's code
                if (versionId) {
                    if (proj?.versions?.length) {
                        const matchedVersion = proj.versions.find(
                            (v) => (v.id || v.$id) === versionId
                        )
                        if (matchedVersion) {
                            setCurrentVersion(matchedVersion)
                            setCode(matchedVersion.code)
                        } else {
                            throw new Error(`Version "${versionId}" not found for this project`)
                        }
                    } else {
                        throw new Error('Historical version preview is restricted to the project owner.')
                    }
                } else {
                    setCurrentVersion(null)
                    setCode(proj?.current_code || proj?.html_content || '')
                }

                setLoading(false)
            } catch (err) {
                if (!isCancelled) {
                    console.error('Error fetching preview project:', err)
                    setError(err.message || 'Failed to load preview')
                    setLoading(false)
                }
            }
        }

        fetchCode()

        return () => {
            isCancelled = true
        }
    }, [projectId, versionId, currentUser?.email])

    // For legacy HTML (not Vite multi-file JSON), render via standard iframe srcDoc
    const isVite = isViteFileMap(code)

    useEffect(() => {
        if (!isVite && code && htmlIframeRef.current) {
            try {
                const iframeDoc =
                    htmlIframeRef.current.contentDocument ||
                    htmlIframeRef.current.contentWindow?.document
                if (iframeDoc) {
                    iframeDoc.open()
                    iframeDoc.write(code)
                    iframeDoc.close()
                }
            } catch (err) {
                console.error('Error rendering legacy preview HTML:', err)
                toast.error('Failed to render preview')
            }
        }
    }, [code, isVite])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0d0f17] text-white">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-medium text-gray-300">Loading website preview...</p>
                <p className="text-xs text-gray-500 mt-1">Preparing sandbox container</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0d0f17] text-white p-6">
                <div className="max-w-md w-full bg-gray-900/80 border border-red-500/30 rounded-2xl p-6 text-center backdrop-blur-sm shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <X className="w-6 h-6 text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-2">Unable to load preview</h2>
                    <p className="text-sm text-red-300/90 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <Link
                            href={projectId ? `/website-builder/${projectId}` : '/'}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to builder
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (!code) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0d0f17] text-white p-6">
                <div className="max-w-md w-full bg-gray-900/80 border border-gray-800 rounded-2xl p-6 text-center shadow-xl">
                    <Eye className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-white mb-2">No code available yet</h2>
                    <p className="text-sm text-gray-400 mb-6">
                        This project does not have any saved code to preview. Generate your website first!
                    </p>
                    <Link
                        href={`/website-builder/${projectId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors shadow-lg shadow-indigo-600/20"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Open in Builder
                    </Link>
                </div>
            </div>
        )
    }

    const deviceWidthClass =
        device === 'mobile'
            ? 'w-[375px] h-[667px] rounded-3xl shadow-2xl border-4 border-gray-800 overflow-hidden my-auto'
            : device === 'tablet'
            ? 'w-[768px] h-[1024px] rounded-2xl shadow-2xl border-4 border-gray-800 overflow-hidden my-auto'
            : 'w-full h-full'

    return (
        <div className="flex flex-col w-full h-screen bg-[#0a0c12] text-white overflow-hidden select-none">
            {/* Top Navigation Bar */}
            <header className="h-12 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <Link
                        href={`/website-builder/${projectId}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
                        title="Back to Editor"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editor</span>
                    </Link>

                    <div className="h-4 w-px bg-gray-800" />

                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-gray-200 truncate max-w-[200px] sm:max-w-[320px]">
                            {project?.project_name || 'Website Preview'}
                        </span>
                        {currentVersion ? (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {currentVersion.version_name || `v${currentVersion.version_number || '1'}`}
                            </span>
                        ) : project?.is_published ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle className="w-2.5 h-2.5" />
                                Published
                            </span>
                        ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                Draft
                            </span>
                        )}
                    </div>
                </div>

                {/* Device controls */}
                <div className="flex items-center gap-1 bg-gray-900/90 border border-gray-800 rounded-lg p-0.5">
                    <button
                        onClick={() => setDevice('desktop')}
                        title="Desktop view (100%)"
                        className={`p-1.5 rounded text-xs transition-colors ${
                            device === 'desktop'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                        <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setDevice('tablet')}
                        title="Tablet view (768px)"
                        className={`p-1.5 rounded text-xs transition-colors ${
                            device === 'tablet'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                        <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setDevice('mobile')}
                        title="Mobile view (375px)"
                        className={`p-1.5 rounded text-xs transition-colors ${
                            device === 'mobile'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                        <Smartphone className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Direct / full page link */}
                <div className="flex items-center gap-2">
                    <a
                        href={`/website-builder/preview/${projectId}${versionId ? `/${versionId}` : ''}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
                        title="Open in new window"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Open Fullscreen</span>
                    </a>
                </div>
            </header>

            {/* Main Preview Container */}
            <main className="flex-1 w-full h-[calc(100vh-48px)] bg-[#05070a] flex items-center justify-center p-0 md:p-4 overflow-auto">
                <div className={`transition-all duration-300 relative flex flex-col ${deviceWidthClass}`}>
                    {isVite ? (
                        <WebContainerPreview
                            files={typeof code === 'string' ? code : JSON.stringify(code)}
                            device={device}
                            isGenerating={false}
                            isRevisionPending={false}
                            onError={(err) => {
                                console.warn('[Preview Runtime Warning]', err)
                            }}
                        />
                    ) : (
                        <iframe
                            ref={htmlIframeRef}
                            title="Website HTML Preview"
                            className="w-full h-full border-none bg-white"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                    )}
                </div>
            </main>
        </div>
    )
}
