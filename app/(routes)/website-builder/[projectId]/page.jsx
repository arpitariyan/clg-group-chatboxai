'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/alert'
import { Loader2Icon } from 'lucide-react'
import BuilderSidebar from '@/app/_components/builder/BuilderSidebar'
import BuilderPreview from '@/app/_components/builder/BuilderPreview'
import BuilderNavbar from '@/app/_components/builder/BuilderNavbar'
import CreditInsufficientModal from '@/app/_components/builder/CreditInsufficientModal'
import CreditPurchaseModal from '@/app/_components/builder/CreditPurchaseModal'
import { useAuth } from '@/contexts/AuthContext'
import { useCreditManager } from '@/hooks/useCreditManager'
import { useIsMobile } from '@/hooks/use-mobile'

export default function WebsiteBuilderPage({ params: paramsPromise }) {
    const [projectId, setProjectId] = useState(null)
    const router = useRouter()
    const { currentUser } = useAuth()
    const previewRef = useRef(null)
    const generationRequestedRef = useRef(false)
    const generationRetryStateRef = useRef({ attempts: 0, timer: null })

    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [device, setDevice] = useState('desktop')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [showInsufficientModal, setShowInsufficientModal] = useState(false)
    const [showPurchaseModal, setShowPurchaseModal] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const isMobile = useIsMobile()

    // Credit management
    const { credits, refreshCredits, hasCredits } = useCreditManager()

    // Unwrap params Promise
    useEffect(() => {
        paramsPromise.then((p) => {
            setProjectId(p.projectId)
        })
    }, [paramsPromise])

    // Fetch project data
    const fetchProject = async () => {
        if (!projectId || !currentUser?.email) return
        
        try {
            const response = await fetch(`/api/website-builder/project/${projectId}?userEmail=${encodeURIComponent(currentUser.email)}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch project')
            }

            setProject(data.project)
            const conversations = data.project?.conversations || []
            const lastAssistantMessage = [...conversations]
                .reverse()
                .find((item) => item.role === 'assistant')

            const hasGenerationError = Boolean(
                !data.project.current_code &&
                lastAssistantMessage?.content?.toLowerCase().includes('error generating your website')
            )

            setIsGenerating(!data.project.current_code && !hasGenerationError)

            if (hasGenerationError) {
                toast.error('Website generation failed. Please try again with a new prompt.')
            }
            setLoading(false)
            return data.project
        } catch (error) {
            console.error('Error fetching project:', error)
            toast.error(`Failed to load project: ${error.message}`)
            setLoading(false)
            return null
        }
    }

    const waitForRevisionResult = async (previousVersionId, timeoutMs = 30000, intervalMs = 2500) => {
        const startedAt = Date.now()

        while (Date.now() - startedAt < timeoutMs) {
            const updatedProject = await fetchProject()

            if (
                updatedProject?.current_version_id &&
                updatedProject.current_version_id !== previousVersionId &&
                updatedProject?.current_code
            ) {
                return { success: true, project: updatedProject }
            }

            await new Promise((resolve) => setTimeout(resolve, intervalMs))
        }

        return { success: false, project: null }
    }

    // Handle revision submission
    const handleRevision = async (message) => {
        const revisionMessage = (message || '').trim()

        if (!revisionMessage) {
            toast.error('Please enter what you want to change.')
            return false
        }

        if (!project?.current_code) {
            toast.info('Initial website generation is still in progress. Please try again in a moment.')
            return false
        }

        // Check credits before making revision
        if (!hasCredits(1)) {
            setShowInsufficientModal(true)
            return false
        }

        try {
            setIsGenerating(true)
            const previousVersionId = project?.current_version_id

            const response = await fetch(`/api/website-builder/revision/${projectId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: revisionMessage,
                    userEmail: currentUser.email
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 402) {
                    setShowInsufficientModal(true)
                    toast.error(data.message || 'Insufficient credits')
                } else {
                    toast.error(data.error || 'Failed to generate revision')
                }
                setIsGenerating(false)
                return false
            }

            await refreshCredits()

            const revisionResult = await waitForRevisionResult(previousVersionId)
            setIsGenerating(false)

            if (revisionResult.success) {
                toast.success('Website updated!')
                return true
            }

            toast.info('Revision request accepted. Update is taking longer than expected; it should appear shortly.')
            return false
        } catch (error) {
            console.error('Error generating revision:', error)
            toast.error(`Failed to update website: ${error.message}`)
            setIsGenerating(false)
            return false
        }
    }

    const triggerInitialGeneration = async (projectData) => {
        if (!projectData || !currentUser?.email) return
        if (projectData.current_code) return
        if (generationRequestedRef.current) return

        const enhancedPrompt = projectData.enhanced_prompt || projectData.original_prompt
        if (!enhancedPrompt) {
            toast.error('Missing prompt data for generation')
            return
        }

        generationRequestedRef.current = true
        setIsGenerating(true)

        try {
            const response = await fetch('/api/website-builder/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId: projectData.id,
                    enhancedPrompt,
                    originalPrompt: projectData.original_prompt,
                    userEmail: currentUser.email
                })
            })

            const data = await response.json()
            if (!response.ok) {
                const errorDetails = [data?.error, data?.details].filter(Boolean).join(': ')
                const error = new Error(errorDetails || 'Failed to generate website')
                error.status = response.status
                throw error
            }

            if (generationRetryStateRef.current.timer) {
                clearTimeout(generationRetryStateRef.current.timer)
                generationRetryStateRef.current.timer = null
            }
            generationRetryStateRef.current.attempts = 0

            await fetchProject()
            toast.success('Website generated successfully!')
        } catch (error) {
            generationRequestedRef.current = false

            const message = String(error?.message || '').toLowerCase()
            const status = Number(error?.status || 0)
            const retryable =
                status === 429 ||
                status >= 500 ||
                message.includes('429') ||
                message.includes('rate limit') ||
                message.includes('timeout') ||
                message.includes('network')

            if (retryable && generationRetryStateRef.current.attempts < 3) {
                generationRetryStateRef.current.attempts += 1
                const retryDelay = generationRetryStateRef.current.attempts * 8000

                toast.info(`Generation is busy. Retrying automatically (${generationRetryStateRef.current.attempts}/3)...`)

                generationRetryStateRef.current.timer = setTimeout(() => {
                    generationRetryStateRef.current.timer = null
                    triggerInitialGeneration(projectData)
                }, retryDelay)

                return
            }

            setIsGenerating(false)
            toast.error(`Website generation failed: ${error.message}`)
        }
    }

    // Initial load and periodic polling for generation
    useEffect(() => {
        if (!currentUser?.email) {
            toast.error('Please sign in to access the website builder')
            router.push('/sign-in')
            return
        }

        fetchProject()

        // If generating, poll for updates
        let pollInterval
        if (isGenerating && !project?.current_code) {
            pollInterval = setInterval(fetchProject, 10000)
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval)
        }
    }, [currentUser, projectId, router])

    useEffect(() => {
        return () => {
            if (generationRetryStateRef.current.timer) {
                clearTimeout(generationRetryStateRef.current.timer)
                generationRetryStateRef.current.timer = null
            }
        }
    }, [])

    useEffect(() => {
        if (isMobile && isSidebarOpen) {
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = ''
            }
        }

        document.body.style.overflow = ''
        return undefined
    }, [isMobile, isSidebarOpen])

    useEffect(() => {
        if (!isMobile) {
            setIsSidebarOpen(false)
        }
    }, [isMobile])

    // Poll while generating
    useEffect(() => {
        if (project && !project.current_code) {
            const pollInterval = setInterval(fetchProject, 10000)
            return () => clearInterval(pollInterval)
        }
    }, [project])

    useEffect(() => {
        if (project && !project.current_code && currentUser?.email) {
            triggerInitialGeneration(project)
        } else if (project?.current_code) {
            generationRetryStateRef.current.attempts = 0
            if (generationRetryStateRef.current.timer) {
                clearTimeout(generationRetryStateRef.current.timer)
                generationRetryStateRef.current.timer = null
            }
        }
    }, [project?.id, project?.current_code, currentUser?.email])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <Loader2Icon className="size-10 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (!project) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center">
                    <p className="text-2xl font-medium text-gray-200">Project not found</p>
                    <button
                        onClick={() => router.push('/app')}
                        className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen w-full bg-gray-900 text-white overflow-hidden">
            {/* Builder Navbar */}
            <BuilderNavbar
                project={project}
                projectId={projectId}
                device={device}
                onDeviceChange={setDevice}
                onBack={() => router.push('/app')}
                previewRef={previewRef}
                hasUnsavedChanges={hasUnsavedChanges}
                onUnsavedChangesReset={() => setHasUnsavedChanges(false)}
                onProjectUpdate={fetchProject}
                credits={credits}
                onRefreshCredits={refreshCredits}
                userEmail={currentUser?.email}
                isMobile={isMobile}
                onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            />

            {/* Main Content: Sidebar + Preview */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Left Sidebar (desktop) */}
                <div className="hidden md:block h-full w-full max-w-sm shrink-0 border-r border-gray-800">
                    <BuilderSidebar
                        project={project}
                        isGenerating={isGenerating}
                        onRevision={handleRevision}
                        userEmail={currentUser?.email}
                    />
                </div>

                {/* Left Sidebar (mobile drawer) */}
                {isMobile && isSidebarOpen && (
                    <>
                        <button
                            type="button"
                            aria-label="Close revisions panel"
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                        <div className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm border-r border-gray-800 bg-gray-900 shadow-2xl">
                            <BuilderSidebar
                                project={project}
                                isGenerating={isGenerating}
                                onRevision={handleRevision}
                                userEmail={currentUser?.email}
                            />
                        </div>
                    </>
                )}

                {/* Right Preview */}
                <div className="flex-1 min-w-0 overflow-hidden p-2 md:pl-0 dark:bg-[oklch(0.3092_0_0)]">
                    <BuilderPreview
                        ref={previewRef}
                        project={project}
                        isGenerating={isGenerating}
                        device={device}
                        onChangeDetected={() => setHasUnsavedChanges(true)}
                    />
                </div>
            </div>

            {/* Credit Modals */}
            <CreditInsufficientModal
                isOpen={showInsufficientModal}
                onClose={() => setShowInsufficientModal(false)}
                onPurchase={() => {
                    setShowInsufficientModal(false)
                    setShowPurchaseModal(true)
                }}
                credits={credits}
                isPro={credits?.isPro || false}
            />

            <CreditPurchaseModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                onSuccess={() => {
                    refreshCredits()
                    toast.success('Credits added successfully!')
                }}
            />
        </div>
    )
}
