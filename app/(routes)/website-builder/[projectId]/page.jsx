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
    const hasShownGenerationErrorRef = useRef(false)

    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isInitialGeneration, setIsInitialGeneration] = useState(false)
    const [isRevisionPending, setIsRevisionPending] = useState(false)
    const [device, setDevice] = useState('desktop')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [showInsufficientModal, setShowInsufficientModal] = useState(false)
    const [showPurchaseModal, setShowPurchaseModal] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const isMobile = useIsMobile()
    const isGenerating = isInitialGeneration || isRevisionPending

    // Credit management
    const { credits, refreshCredits, hasCredits } = useCreditManager()

    // Unwrap params Promise
    useEffect(() => {
        paramsPromise.then((p) => {
            setProjectId(p.projectId)
        })
    }, [paramsPromise])

    const applyProjectData = (nextProject, mergeWithCurrent = false) => {
        if (!nextProject) {
            return null
        }

        const mergedProject = mergeWithCurrent && project
            ? { ...project, ...nextProject }
            : nextProject

        setProject(mergedProject)

        const conversations = mergedProject?.conversations || []
        const lastAssistantMessage = [...conversations]
            .reverse()
            .find((item) => item.role === 'assistant')

        const hasGenerationError = Boolean(
            !mergedProject.current_code &&
            lastAssistantMessage?.content?.toLowerCase().includes('error generating your website')
        )

        setIsInitialGeneration(!mergedProject.current_code && !hasGenerationError)

        if (hasGenerationError && !hasShownGenerationErrorRef.current) {
            toast.error('Website generation failed. Please try again with a new prompt.')
            hasShownGenerationErrorRef.current = true
        }

        if (!hasGenerationError) {
            hasShownGenerationErrorRef.current = false
        }

        setLoading(false)
        return mergedProject
    }

    // Fetch project data
    const fetchProject = async ({ suppressErrors = false } = {}) => {
        if (!projectId || !currentUser?.email) return
        
        try {
            const response = await fetch(`/api/website-builder/project/${projectId}?userEmail=${encodeURIComponent(currentUser.email)}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch project')
            }

            return applyProjectData(data.project)
        } catch (error) {
            console.error('Error fetching project:', error)
            if (!suppressErrors) {
                toast.error(`Failed to load project: ${error.message}`)
            }
            setLoading(false)
            return null
        }
    }

    const waitForRevisionResult = async ({ expectedVersionId, previousVersionId, timeoutMs = 45000, intervalMs = 2000 }) => {
        const startedAt = Date.now()

        while (Date.now() - startedAt < timeoutMs) {
            const updatedProject = await fetchProject({ suppressErrors: true })
            const hasExpectedVersion = Boolean(
                updatedProject?.current_version_id &&
                (expectedVersionId
                    ? updatedProject.current_version_id === expectedVersionId
                    : updatedProject.current_version_id !== previousVersionId)
            )

            if (hasExpectedVersion && updatedProject?.current_code) {
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
            setIsRevisionPending(true)
            const previousVersionId = project?.current_version_id

            // Poll the project every 3 s WHILE the server is generating so that
            // intermediate AI messages (enhanced prompt, "making changes…") appear
            // in the sidebar chat in real time instead of all at once at the end.
            let backgroundPollActive = true
            const runBackgroundPoll = async () => {
                while (backgroundPollActive) {
                    await new Promise((r) => setTimeout(r, 3000))
                    if (backgroundPollActive) {
                        await fetchProject({ suppressErrors: true })
                    }
                }
            }
            runBackgroundPoll() // fire-and-forget; controlled by flag

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

            // Stop intermediate polling — the final fetchProject below takes over.
            backgroundPollActive = false

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 402) {
                    setShowInsufficientModal(true)
                    toast.error(data.message || 'Insufficient credits')
                } else {
                    toast.error(data.error || 'Failed to generate revision')
                }
                setIsRevisionPending(false)
                return false
            }

            await refreshCredits()

            // Apply the completed project from the API response immediately —
            // this updates current_code so BuilderPreview can render the new site.
            if (data?.project) {
                applyProjectData(data.project, true)
            }

            // Dismiss the loading screen as soon as we have the new code.
            // (BuilderPreview's useEffect will write it to the iframe once the
            //  loading overlay unmounts and the iframe is back in the DOM.)
            setIsRevisionPending(false)

            if (data?.project?.current_code || data?.versionId) {
                toast.success('Website updated!')
                // Refresh in background to pull fresh conversations + versions list.
                void fetchProject({ suppressErrors: true })
                return true
            }

            // Fallback: Appwrite propagation may be slow — poll for the new version.
            const revisionResult = await waitForRevisionResult({
                expectedVersionId: data?.versionId,
                previousVersionId,
                timeoutMs: 20000,
            })

            if (revisionResult.success) {
                toast.success('Website updated!')
                return true
            }

            toast.error('The revision finished on the server, but the latest version could not be loaded. Please refresh.')
            return false
        } catch (error) {
            console.error('Error generating revision:', error)
            toast.error(`Failed to update website: ${error.message}`)
            setIsRevisionPending(false)
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
        setIsInitialGeneration(true)

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

            await fetchProject({ suppressErrors: true })
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

            setIsInitialGeneration(false)
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

        void fetchProject()
    }, [currentUser?.email, projectId, router])

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
        if (isInitialGeneration && !project?.current_code) {
            const pollInterval = setInterval(() => {
                void fetchProject({ suppressErrors: true })
            }, 10000)
            return () => clearInterval(pollInterval)
        }
    }, [isInitialGeneration, project?.current_code, projectId, currentUser?.email])

    useEffect(() => {
        if (project && !project.current_code && currentUser?.email) {
            triggerInitialGeneration(project)
        } else if (project?.current_code) {
            setIsInitialGeneration(false)
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
                        onProjectUpdate={fetchProject}
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
                                onProjectUpdate={fetchProject}
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
                        isRevisionPending={isRevisionPending}
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
