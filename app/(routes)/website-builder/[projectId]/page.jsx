'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/alert'
import { Loader2Icon } from '@/components/ui/animated-icon'
import BuilderSidebar from '@/app/_components/builder/BuilderSidebar'
import BuilderNavbar from '@/app/_components/builder/BuilderNavbar'
import CreditInsufficientModal from '@/app/_components/builder/CreditInsufficientModal'
import CreditPurchaseModal from '@/app/_components/builder/CreditPurchaseModal'
import GenerationProgress from '@/components/GenerationProgress'
import DesignUploadModal from '@/components/DesignUploadModal'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import { useCreditManager } from '@/hooks/useCreditManager'
import { useIsMobile } from '@/hooks/use-mobile'
import { useErrorCapture } from '@/hooks/useErrorCapture'
import { generateFixPrompt } from '@/lib/error-analyzer'
import CodePanel from '@/components/website-builder/CodePanel'
import ConsolePanel from '@/components/website-builder/ConsolePanel'
import dynamic from 'next/dynamic'

const WebContainerPreview = dynamic(
    () => import('@/components/website-builder/WebContainerPreview'),
    { ssr: false }
)

export default function WebsiteBuilderPage({ params: paramsPromise }) {
    const [projectId, setProjectId] = useState(null)
    const router = useRouter()
    const { currentUser } = useAuth()
    const previewRef = useRef(null)
    const generationRequestedRef = useRef(false)
    const generationRetryStateRef = useRef({ attempts: 0, timer: null })
    const hasShownGenerationErrorRef = useRef(false)
    const generationPollingHealthRef = useRef({ failedPolls: 0 })
    // ── NEW: Track generation start time and polling state ───────────────────
    const generationStartTimeRef = useRef(null)
    const generationPollingRef = useRef({ active: false, intervalId: null })


    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isInitialGeneration, setIsInitialGeneration] = useState(false)
    const [isRevisionPending, setIsRevisionPending] = useState(false)
    const [device, setDevice] = useState('desktop')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [showInsufficientModal, setShowInsufficientModal] = useState(false)
    const [showPurchaseModal, setShowPurchaseModal] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [view, setView] = useState('preview')
    const [editedFiles, setEditedFiles] = useState(null)
    const [isSavingCode, setIsSavingCode] = useState(false)
    const [detectedError, setDetectedError] = useState(null)
    const [isConsolePanelOpen, setIsConsolePanelOpen] = useState(false)
    // ── NEW: Generation status for async polling ────────────────────────────
    const [generationStatus, setGenerationStatus] = useState(null) // { status, generation_step, progress, error_message }
    const [showDesignUploadModal, setShowDesignUploadModal] = useState(false)
    const [validationStatus, setValidationStatus] = useState(null) // 'validating', 'fixing', 'valid', 'has-errors'
    // Batch error fix state - collect all errors before fixing together
    const batchFixStateRef = useRef({ pending: false, timer: null, collectedErrors: new Map(), lastFixedBatch: null })
    // Bounded self-repair tracker: error fingerprint -> attempt count (capped at 3)
    const errorRepairAttemptsRef = useRef(new Map())
    const isMobile = useIsMobile()
    const isGenerating = isInitialGeneration || isRevisionPending

    // Error capture hook (with batch fixing support)
    const { errors, addError, clearErrors, removeError, filteredBy, setFilteredBy, getFilteredErrors, getErrorStats, isFixing, lockErrorsForFix, unlockErrorsAndRemove, unlockErrorsOnFailure } = useErrorCapture()

    // FIX: getCurrentFiles always returns a copy — never mutate in place
    const getCurrentFiles = useCallback(() => {
        if (editedFiles) return editedFiles
        if (!project?.current_code) return {}
        try { return JSON.parse(project.current_code) }
        catch { return {} }
    }, [editedFiles, project?.current_code])

    // Previous files for visual version diffing in CodePanel
    const previousFiles = React.useMemo(() => {
        if (!project?.versions || project.versions.length < 2) return null
        const prevVersion = project.versions.find(v => (v.id || v.$id) !== project.current_version_id) || project.versions[1]
        const prevCode = prevVersion?.code || prevVersion?.html_content
        if (!prevCode) return null
        try {
            return typeof prevCode === 'string' ? JSON.parse(prevCode) : prevCode
        } catch {
            return null
        }
    }, [project?.versions, project?.current_version_id])

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
            const response = await authFetch(`/api/website-builder/project/${projectId}?userEmail=${encodeURIComponent(currentUser.email)}`)
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

    // ── NEW: Fetch generation status for async polling ──────────────────────
    const fetchGenerationStatus = useCallback(async () => {
        if (!projectId || !currentUser?.email) return null

        try {
            const response = await authFetch(
                `/api/website-builder/status?projectId=${projectId}&userEmail=${encodeURIComponent(currentUser.email)}`
            )
            const data = await response.json()

            if (!response.ok) {
                console.warn('Failed to fetch generation status:', data.error)
                return null
            }

            // Update generation status state
            setGenerationStatus({
                status: data.status || 'queued',
                generation_step: data.generation_step || '',
                progress: data.progress || 0,
                error_message: data.error_message || null
            })

            // If generation completed, fetch project to apply new code
            if (data.status === 'success' && data.has_code) {
                await fetchProject({ suppressErrors: true })
            }

            return data
        } catch (error) {
            console.error('Error fetching generation status:', error)
            return null
        }
    }, [projectId, currentUser?.email])

    // ── NEW: Update validation status based on generation step and errors ──
    useEffect(() => {
        const step = generationStatus?.generation_step?.toLowerCase() || '';
        const hasErrors = errors && errors.length > 0;

        // Map generation steps to validation status
        if (step.includes('validating')) {
            setValidationStatus('validating');
        } else if (step.includes('fixing') || (isFixing && hasErrors)) {
            setValidationStatus('fixing');
        } else if (hasErrors) {
            setValidationStatus('has-errors');
        } else if (step.includes('validate') && !step.includes('validating')) {
            // Validation step just completed
            setValidationStatus('valid');
        } else if (isGenerating) {
            // While generating, don't show validation status
            setValidationStatus(null);
        }
    }, [generationStatus?.generation_step, errors, isFixing, isGenerating])

    // ── NEW: Start async polling for generation status ──────────────────────
    const startGenerationPolling = useCallback(() => {
        if (generationPollingRef.current.active) return

        const MAX_POLL_DURATION_MS = 12 * 60 * 1000
        const MAX_FAILED_POLLS = 8

        generationPollingRef.current.active = true
        generationStartTimeRef.current = Date.now()
        generationPollingHealthRef.current.failedPolls = 0

        // Poll every 5 seconds to reduce status-endpoint flood during long generations.
        generationPollingRef.current.intervalId = setInterval(async () => {
            const elapsed = Date.now() - (generationStartTimeRef.current || Date.now())
            if (elapsed >= MAX_POLL_DURATION_MS) {
                if (generationPollingRef.current.intervalId) {
                    clearInterval(generationPollingRef.current.intervalId)
                    generationPollingRef.current.intervalId = null
                }
                generationPollingRef.current.active = false
                setIsInitialGeneration(false)
                setGenerationStatus({
                    status: 'error',
                    generation_step: 'Timed out while waiting for generation',
                    progress: 100,
                    error_message: 'Generation timed out. Please try again.'
                })
                toast.error('Generation timed out. Please retry.')
                return
            }

            const status = await fetchGenerationStatus()

            if (!status) {
                generationPollingHealthRef.current.failedPolls += 1

                if (generationPollingHealthRef.current.failedPolls >= MAX_FAILED_POLLS) {
                    const latestProject = await fetchProject({ suppressErrors: true })
                    const recovered = Boolean(latestProject?.current_code)

                    if (generationPollingRef.current.intervalId) {
                        clearInterval(generationPollingRef.current.intervalId)
                        generationPollingRef.current.intervalId = null
                    }
                    generationPollingRef.current.active = false
                    setIsInitialGeneration(false)

                    if (recovered) {
                        toast.success('Website generated successfully!')
                    } else {
                        setGenerationStatus({
                            status: 'error',
                            generation_step: 'Unable to reach status endpoint',
                            progress: 100,
                            error_message: 'Status polling failed repeatedly. Please refresh and try again.'
                        })
                        toast.error('Generation status lost. Please refresh and retry if needed.')
                    }
                }

                return
            }

            generationPollingHealthRef.current.failedPolls = 0

            const isCompleteSuccess = status?.status === 'success' && Boolean(status?.has_code)
            const isFailure = status?.status === 'error'

            if (isCompleteSuccess || isFailure) {
                // Stop polling when done
                if (generationPollingRef.current.intervalId) {
                    clearInterval(generationPollingRef.current.intervalId)
                    generationPollingRef.current.intervalId = null
                }
                generationPollingRef.current.active = false
                setIsInitialGeneration(false)

                if (isFailure) {
                    toast.error(`Generation failed: ${status.error_message || 'Unknown error'}`)
                } else {
                    toast.success('Website generated successfully!')
                }
            }
        }, 5000)
    }, [fetchGenerationStatus])

    // ── NEW: Stop polling ──────────────────────────────────────────────────
    const stopGenerationPolling = useCallback(() => {
        if (generationPollingRef.current.intervalId) {
            clearInterval(generationPollingRef.current.intervalId)
            generationPollingRef.current.intervalId = null
        }
        generationPollingRef.current.active = false
        generationPollingHealthRef.current.failedPolls = 0
        generationStartTimeRef.current = null
    }, [])

    const saveCurrentCodeToDb = useCallback(async ({ successMessage } = {}) => {
        if (!projectId) {
            toast.error('Project not found')
            return false
        }

        if (!currentUser?.email) {
            toast.error('Please sign in to save changes')
            return false
        }

        const filesToSave = getCurrentFiles()
        if (!filesToSave || !Object.keys(filesToSave).length) {
            toast.error('No code to save')
            return false
        }

        setIsSavingCode(true)
        try {
            const code = JSON.stringify(filesToSave)
            const response = await authFetch(`/api/website-builder/update/${projectId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, userEmail: currentUser.email }),
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save website')
            }

            toast.success(successMessage || data.message || 'Website saved successfully!')
            setHasUnsavedChanges(false)
            await fetchProject({ suppressErrors: true })
            return true
        } catch (error) {
            console.error('Error saving website code:', error)
            toast.error(`Failed to save website: ${error.message}`)
            return false
        } finally {
            setIsSavingCode(false)
        }
    }, [projectId, currentUser?.email, getCurrentFiles, fetchProject])

    // FIX #6: Abort-able revision polling — avoids the 45s blocking while-loop that
    // kept the UI frozen and fired fetchProject up to 22 times per revision.
    const waitForRevisionResult = async ({ expectedVersionId, previousVersionId, timeoutMs = 30000, intervalMs = 3000 }) => {
        const startedAt = Date.now()
        let resolved = false

        return new Promise((resolve) => {
            const check = async () => {
                if (resolved) return
                if (Date.now() - startedAt >= timeoutMs) {
                    resolved = true
                    resolve({ success: false, project: null })
                    return
                }

                const updatedProject = await fetchProject({ suppressErrors: true })
                const hasExpectedVersion = Boolean(
                    updatedProject?.current_version_id &&
                    (expectedVersionId
                        ? updatedProject.current_version_id === expectedVersionId
                        : updatedProject.current_version_id !== previousVersionId)
                )

                if (hasExpectedVersion && updatedProject?.current_code) {
                    resolved = true
                    resolve({ success: true, project: updatedProject })
                    return
                }

                setTimeout(check, intervalMs)
            }

            setTimeout(check, intervalMs)
        })
    }

    const normalizeErrorContext = (err) => {
        if (!err) return null
        if (typeof err === 'string') {
            return { message: err, type: 'UNKNOWN', suggestion: '' }
        }

        // If already a normalized error object, return it as-is
        if (typeof err === 'object' && err.message && err.type) {
            return {
                message: String(err.message).trim(),
                type: String(err.type).trim(),
                suggestion: String(err.suggestion || '').trim()
            }
        }

        // Extract message from various error object formats
        let messageText = ''
        if (err.message && typeof err.message === 'string') {
            messageText = err.message.trim()
        } else if (err.error && typeof err.error === 'string') {
            messageText = err.error.trim()
        } else if (err.msg && typeof err.msg === 'string') {
            messageText = err.msg.trim()
        } else if (err.text && typeof err.text === 'string') {
            messageText = err.text.trim()
        } else if (typeof err === 'object') {
            // Try to extract from object properties
            const strings = Object.values(err)
                .filter(v => typeof v === 'string' && v.length > 0)
                .map(v => String(v).trim())
                .slice(0, 3)
            messageText = strings.join(' — ') || 'An unexpected error occurred'
        }

        return {
            message: messageText || 'Unknown runtime error',
            type: String(err.type || 'RUNTIME_ERROR').trim(),
            suggestion: String(err.suggestion || '').trim()
        }
    }

    // Handle revision submission
    const handleRevision = React.useCallback(async (message, options = {}) => {
        const errorContext = normalizeErrorContext(options?.errorContext)
        const batchErrors = options?.batchErrors || null
        const revisionSource = options?.source || 'manual'
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
                // FIX #7: wrapped in try/finally so backgroundPollActive is ALWAYS
                // set to false — even if fetchProject throws or the component unmounts
                // mid-revision. The old code would leave an infinite loop running.
                try {
                    while (backgroundPollActive) {
                        await new Promise((r) => setTimeout(r, 3000))
                        if (backgroundPollActive) {
                            await fetchProject({ suppressErrors: true })
                        }
                    }
                } finally {
                    backgroundPollActive = false
                }
            }
            runBackgroundPoll() // fire-and-forget; controlled by flag

            const response = await authFetch(`/api/website-builder/revision/${projectId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: revisionMessage,
                    userEmail: currentUser.email,
                    errorType: errorContext?.type || null,
                    originalError: errorContext?.message || null,
                    errorSuggestion: errorContext?.suggestion || null,
                    revisionSource,
                    batchErrors: batchErrors
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
                batchFixStateRef.current.pending = false
                // Clear collected errors on failure so user can try again with fresh state
                batchFixStateRef.current.collectedErrors.clear()
                return false
            }

            await refreshCredits()

            // Apply the completed project from the API response immediately —
            // this updates current_code so BuilderPreview can render the new site.
            if (data?.project) {
                applyProjectData(data.project, true)
            }

            // FIX: Always clear editedFiles on successful revision
            // This prevents stale editedFiles (missing package.json scenario) from persisting
            setEditedFiles(null)
            setHasUnsavedChanges(false)
            setIsRevisionPending(false)

            if (data?.project?.current_code || data?.versionId) {
                toast.success('Website updated!')
                setDetectedError(null)
                // CRITICAL: Clear ALL accumulated errors after successful revision
                // This prevents errors from building up and repeating in the console
                clearErrors()
                errorRepairAttemptsRef.current.clear()
                // Reset batch fix state after successful revision
                batchFixStateRef.current = { pending: false, timer: null, collectedErrors: new Map(), lastFixedBatch: null }
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
                setDetectedError(null)
                clearErrors()
                errorRepairAttemptsRef.current.clear()
                batchFixStateRef.current = { pending: false, timer: null, collectedErrors: new Map(), lastFixedBatch: null }
                return true
            }

            toast.error('The revision finished on the server, but the latest version could not be loaded. Please refresh.')
            return false
        } catch (error) {
            console.error('Error generating revision:', error)
            toast.error(`Failed to update website: ${error.message}`)
            setIsRevisionPending(false)
            batchFixStateRef.current.pending = false
            batchFixStateRef.current.collectedErrors.clear()
            return false
        }
    }, [
        project?.current_code,
        project?.current_version_id,
        projectId,
        currentUser?.email,
        hasCredits,
        refreshCredits,
        fetchProject,
        clearErrors
    ])

    const triggerInitialGeneration = async (projectData) => {
        if (!projectData || !currentUser?.email) return
        if (projectData.current_code) return
        if (generationRequestedRef.current) return

        // If project is already active on the backend, resume polling without double-charging
        if (projectData.status === 'queued' || projectData.status === 'generating') {
            generationRequestedRef.current = true
            setIsInitialGeneration(true)
            setGenerationStatus({
                status: projectData.status,
                generation_step: projectData.generation_step || 'In progress',
                progress: 10
            })
            startGenerationPolling()
            return
        }

        const enhancedPrompt = projectData.enhanced_prompt || projectData.original_prompt
        if (!enhancedPrompt) {
            toast.error('Missing prompt data for generation')
            return
        }

        generationRequestedRef.current = true
        setIsInitialGeneration(true)
        setGenerationStatus({ status: 'queued', generation_step: 'Queued', progress: 0 })

        try {
            // ── NEW: Emit async event (HTTP 202) instead of blocking ───────────
            const response = await authFetch('/api/website-builder/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId: projectData.id,
                    enhancedPrompt,
                    originalPrompt: projectData.original_prompt,
                    userEmail: currentUser.email
                    // imageUrl can be added here if design upload is enabled
                })
            })

            const data = await response.json()
            
            if (!response.ok) {
                const errorDetails = [data?.error, data?.details].filter(Boolean).join(': ')
                const error = new Error(errorDetails || 'Failed to generate website')
                error.status = response.status
                throw error
            }

            // HTTP 202 Accepted - generation is running in background
            // Start polling for status updates
            startGenerationPolling()

            if (generationRetryStateRef.current.timer) {
                clearTimeout(generationRetryStateRef.current.timer)
                generationRetryStateRef.current.timer = null
            }
            generationRetryStateRef.current.attempts = 0
        } catch (error) {
            stopGenerationPolling()
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
            setGenerationStatus({ status: 'error', generation_step: '', error_message: error.message })
            toast.error(`Website generation failed: ${error.message}`)
        }
    }

    // ── NEW: Handle design description ──────────────────────────────────────────
    const handleDesignUpload = async (designDescription) => {
        if (!project?.id) {
            toast.error('Project not found')
            return
        }

        // Combine design description with original prompt
        const prompt = `${project.original_prompt || project.enhanced_prompt}\n\n# Design Specification:\n${designDescription}`

        // Start generation with design description
        generationRequestedRef.current = true
        setIsInitialGeneration(true)
        setGenerationStatus({ status: 'queued', generation_step: 'Extracting design', progress: 0 })

        try {
            const response = await authFetch('/api/website-builder/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId: project.id,
                    enhancedPrompt: prompt,
                    originalPrompt: project.original_prompt,
                    userEmail: currentUser.email,
                    designDescription: designDescription,
                    imageUrl: null
                })
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to start generation')
            }

            // Start polling for status
            startGenerationPolling()
            setShowDesignUploadModal(false)
            toast.success('Generation started with design specifications!')
        } catch (error) {
            generationRequestedRef.current = false
            setIsInitialGeneration(false)
            toast.error(`Generation failed: ${error.message}`)
        }
    }

    // Comprehensive batch fix: Collect all errors, fix them together in one pass
    // FIX #8: Added maxAutoFix counter (max 3 per session) + exponential backoff
    // to prevent the system looping 3-5x on persistent Vite build errors.
    const MAX_AUTO_FIXES_PER_SESSION = 3
    useEffect(() => {
        if (!detectedError || isRevisionPending || isInitialGeneration || !project?.current_code) return

        // FIX #8: Hard stop after 3 auto-fixes per session
        if (autoFixCountRef.current.count >= MAX_AUTO_FIXES_PER_SESSION) {
            console.log(`[Batch Fix] Session limit reached (${MAX_AUTO_FIXES_PER_SESSION} fixes). Stopping auto-fix.`)
            return
        }

        const normalized = normalizeErrorContext(detectedError)
        if (!normalized?.message) return

        // Add this error to the batch collection
        const state = batchFixStateRef.current
        const errorKey = `${normalized.type}:${normalized.message.slice(0, 100)}`
        state.collectedErrors.set(errorKey, normalized)

        // Check if this is the exact same batch that was already fixed
        // If so, skip fixing again (prevents infinite loops)
        const currentBatchHash = Array.from(state.collectedErrors.keys()).sort().join('|')
        if (state.lastFixedBatch === currentBatchHash) {
            console.log('[Batch Fix] Skipping — same errors already attempted to be fixed')
            return
        }

        // Clear existing timer
        if (state.timer) {
            clearTimeout(state.timer)
        }

        // FIX #8: Use exponential backoff so repeated errors don't immediately re-trigger
        const backoffMs = autoFixCountRef.current.lastBackoffMs

        // Wait backoffMs to collect more errors before triggering batch fix
        state.timer = setTimeout(async () => {
            const collectedErrors = Array.from(state.collectedErrors.values())
            const batchHash = Array.from(state.collectedErrors.keys()).sort().join('|')
            state.collectedErrors.clear()
            state.timer = null

            if (collectedErrors.length === 0 || state.pending) return

            // Record this batch before attempting fix
            state.lastFixedBatch = batchHash
            state.pending = true

            // Increment auto-fix counter and double next backoff (exponential)
            autoFixCountRef.current.count += 1
            autoFixCountRef.current.lastBackoffMs = Math.min(backoffMs * 2, 8000)

            // Lock these fingerprints so the same errors are not re-added while fix is running
            lockErrorsForFix(collectedErrors)

            // Build comprehensive fix prompt with ALL errors
            const errorList = collectedErrors
                .map((err, idx) => `${idx + 1}. [${err.type}] ${err.message}${err.suggestion ? ` (Suggestion: ${err.suggestion})` : ''}`)
                .join('\n')

            const fixMessage = `The generated website has multiple errors that need to be fixed together in a single pass:\n\n${errorList}\n\nPlease analyze all these errors carefully and fix them all at once. Ensure:\n- All variables are properly defined and imported\n- All import paths are correct and files exist\n- All JSX syntax is valid\n- All required providers are in place\n- No circular dependencies\n- All functions are properly declared\n\nGenerate clean, working code that resolves ALL errors above simultaneously.`

            const sessionRemaining = MAX_AUTO_FIXES_PER_SESSION - autoFixCountRef.current.count + 1
            console.log(`[Batch Fix] Fixing ${collectedErrors.length} error(s) together (auto-fix ${autoFixCountRef.current.count}/${MAX_AUTO_FIXES_PER_SESSION})`)
            toast.info(`🔧 Fixing all ${collectedErrors.length} error(s) in a single pass... (${sessionRemaining} left this session)`)

            try {
                const success = await handleRevision(fixMessage, {
                    source: 'batch_auto_fix',
                    errorContext: collectedErrors[0],
                    batchErrors: collectedErrors,
                })

                if (success) {
                    unlockErrorsAndRemove(collectedErrors)
                } else {
                    state.pending = false
                    unlockErrorsOnFailure()
                }
            } catch (err) {
                console.error('[Batch Fix] Failed:', err)
                state.pending = false
                unlockErrorsOnFailure()
            }
        }, backoffMs)

        return () => {
            if (state.timer) {
                clearTimeout(state.timer)
                state.timer = null
            }
        }
    }, [detectedError, lockErrorsForFix, unlockErrorsAndRemove, unlockErrorsOnFailure]) // Auto-trigger on any error detection
    // eslint-disable-next-line react-hooks/exhaustive-deps

    // Initial load and periodic polling for generation
    useEffect(() => {
        if (!currentUser?.email) {
            toast.error('Please sign in to access the website builder')
            router.push('/sign-in')
            return
        }
        void fetchProject()
    }, [currentUser?.email, projectId])
    // eslint-disable-next-line react-hooks/exhaustive-deps

    useEffect(() => {
        return () => {
            if (batchFixStateRef.current.timer) {
                clearTimeout(batchFixStateRef.current.timer)
                batchFixStateRef.current.timer = null
            }
            // FIX #5: Stop polling on unmount and reset auto-fix counter
            // so re-mounting the page starts fresh without inheriting stale state
            stopGenerationPolling()
            autoFixCountRef.current = { count: 0, lastBackoffMs: 1500 }
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
                view={view}
                onViewChange={setView}
                getCurrentFiles={getCurrentFiles}
                onSaveCode={saveCurrentCodeToDb}
                isSavingCode={isSavingCode}
                // ── NEW: Design upload ─────────────────────────────────────────
                onDesignUpload={() => setShowDesignUploadModal(true)}
                isGenerating={isGenerating}
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
                        detectedError={detectedError}
                        onClearError={() => setDetectedError(null)}
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
                                detectedError={detectedError}
                                onClearError={() => setDetectedError(null)}
                            />
                        </div>
                    </>
                )}

                {/* Right Preview */}
                <div className="flex-1 min-w-0 overflow-hidden p-2 md:pl-0 bg-background">
                    {view === 'code' ? (
                        <div className="w-full h-full rounded-xl overflow-hidden border border-gray-800 relative z-0">
                            <CodePanel
                                files={getCurrentFiles()}
                                previousFiles={previousFiles}
                                onChange={newFiles => {
                                    setEditedFiles(newFiles)
                                    setHasUnsavedChanges(true)
                                    setDetectedError(null)
                                }}
                                onSaveCode={saveCurrentCodeToDb}
                                isSavingCode={isSavingCode}
                                hasUnsavedChanges={hasUnsavedChanges}
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl relative z-0">
                            <WebContainerPreview
                                files={JSON.stringify(getCurrentFiles())}
                                isGenerating={isGenerating}
                                isRevisionPending={isRevisionPending}
                                device={device}
                                validationStatus={validationStatus}
                                onError={(err) => {
                                    const next = normalizeErrorContext(err)
                                    if (!next?.message) return

                                    // Add to console panel
                                    addError({
                                        type: next.type || 'RUNTIME_ERROR',
                                        message: next.message,
                                        severity: next.severity || 'error',
                                        isAutoFixable: next.isAutoFixable,
                                    })
                                    setIsConsolePanelOpen(true)

                                    setDetectedError((prev) => {
                                        const prevNorm = normalizeErrorContext(prev)
                                        if (prevNorm?.message === next.message && prevNorm?.type === next.type) {
                                            return prev
                                        }
                                        return next
                                    })
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Console Panel for error capture */}
            <ConsolePanel
                errors={getFilteredErrors()}
                onClearErrors={clearErrors}
                onRemoveError={removeError}
                onFixError={async (error) => {
                    // Single error fix with bounded repeat limit
                    const fingerprint = `${error.type || 'RUNTIME_ERROR'}:${(error.message || '').trim().slice(0, 120)}`
                    const currentAttempts = (errorRepairAttemptsRef.current.get(fingerprint) || 0) + 1
                    if (currentAttempts > 3) {
                        toast.error('Repeated error reached the 3-attempt repair limit. Preserving last known-good version. Please edit code directly or refine your prompt.')
                        return
                    }
                    errorRepairAttemptsRef.current.set(fingerprint, currentAttempts)

                    lockErrorsForFix([error]);
                    
                    // Generate context-aware fix prompt
                    let fixPrompt = '';
                    
                    if (error.type === 'NETWORK_ERROR' || error.type === 'FILE_NOT_FOUND') {
                        fixPrompt = `The generated website is showing a network/server error: "${error.message}"\n\nPlease regenerate the entire website from scratch, making sure all files are valid and properly imported. Ensure no files are missing or have syntax errors.`;
                    } else if (error.type === 'RUNTIME_ERROR') {
                        fixPrompt = `There's a runtime error in the generated code: "${error.message}"\n\nPlease review and fix the code to resolve this error. Make sure all variables are defined and all imports are correct.`;
                    } else {
                        fixPrompt = generateFixPrompt(error);
                    }
                    
                    toast.info(`🔧 Fixing ${error.type} (attempt ${currentAttempts}/3)...`);
                    const success = await handleRevision(fixPrompt, { source: 'console_fix', errorContext: error });
                    
                    if (success) {
                        unlockErrorsAndRemove([error]);
                    } else {
                        unlockErrorsOnFailure();
                    }
                }}
                onFixAll={async (errorList) => {
                    // Batch fix all errors at once with bounded repeat limit
                    if (!errorList || errorList.length === 0) {
                        toast.error('No fixable errors to fix');
                        return;
                    }

                    const batchFingerprint = errorList.map(e => `${e.type}:${(e.message || '').slice(0, 40)}`).sort().join('|')
                    const currentAttempts = (errorRepairAttemptsRef.current.get(batchFingerprint) || 0) + 1
                    if (currentAttempts > 3) {
                        toast.error('Repeated batch errors reached the 3-attempt repair limit. Preserving last known-good version. Please edit code directly.')
                        return
                    }
                    errorRepairAttemptsRef.current.set(batchFingerprint, currentAttempts)
                    
                    lockErrorsForFix(errorList);
                    
                    // Generate batch prompt
                    const errorDescriptions = errorList.map((error, idx) => {
                        return `${idx + 1}. [${error.type}] ${error.message}`;
                    }).join('\n');
                    
                    const fixPrompt = `The generated website has multiple errors that need to be fixed simultaneously:\n\n${errorDescriptions}\n\nPlease fix all of these issues together in a single pass. Ensure all variables are defined, imports are correct, and the code is syntactically valid.`;
                    
                    toast.info(`🔧 Fixing all ${errorList.length} error(s) (attempt ${currentAttempts}/3)...`);
                    const success = await handleRevision(fixPrompt, { source: 'batch_console_fix', errorContext: errorList[0], batchErrors: errorList });
                    
                    if (success) {
                        unlockErrorsAndRemove(errorList);
                    } else {
                        unlockErrorsOnFailure();
                    }
                }}
                filteredBy={filteredBy}
                setFilteredBy={setFilteredBy}
                isOpen={isConsolePanelOpen}
                onClose={() => setIsConsolePanelOpen(false)}
                isFixing={isFixing}
                validationStatus={validationStatus}
            />

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

            {/* ── NEW: Generation Progress Display ──────────────────────────────────── */}
            {isInitialGeneration && generationStatus && (
                <GenerationProgress
                    status={generationStatus.status}
                    generation_step={generationStatus.generation_step}
                    progress={generationStatus.progress}
                    error_message={generationStatus.error_message}
                    elapsed_time={
                        generationStartTimeRef.current
                            ? Math.floor((Date.now() - generationStartTimeRef.current) / 1000)
                            : 0
                    }
                    onDismiss={stopGenerationPolling}
                />
            )}

            {/* ── NEW: Design Upload Modal ──────────────────────────────────────────── */}
            <DesignUploadModal
                isOpen={showDesignUploadModal}
                onClose={() => setShowDesignUploadModal(false)}
                onUpload={handleDesignUpload}
                isLoading={isInitialGeneration}
            />
        </div>
    )
}
