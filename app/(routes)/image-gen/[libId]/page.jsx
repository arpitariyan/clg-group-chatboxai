'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw, XCircle, ArrowUp, Cpu, ImagePlus, ThumbsUp, ThumbsDown, Check, Crown, AlertCircle, Sparkles, Bot } from '@/components/ui/animated-icon'
import { Progress } from '@/components/ui/progress'
import { useSidebar } from '@/components/ui/sidebar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    COMPOSER_CARD,
    COMPOSER_TEXTAREA,
    FOCUS_RING,
    NEUTRAL_BADGE,
    SEND_BUTTON,
    TOOLBAR_DIVIDER,
    TOOLBAR_PILL,
    TRAY_ITEM,
    TRAY_ITEM_STYLE,
} from '@/components/surface'
import {
    Attachment,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentGroup,
    AttachmentMedia,
    AttachmentProgress,
    AttachmentRemove,
    AttachmentTitle,
} from '@/components/ui/attachment'
import {
    DEFAULT_MODEL_ID,
    IMAGE_MODELS,
    getModelById,
    getProviderById,
    getDefaultModelForProvider,
    getProviderIdByModelId,
    getDefaultImageToImageModelForProvider,
} from '@/lib/hf-image-config'
import { toast } from '@/lib/alert'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import { v4 as uuidv4 } from 'uuid'
import ImageGenLoading from '@/components/ImageGenLoading'

const getModelLogo = (name, isTrigger = false) => {
    const n = name?.toLowerCase() || '';
    let src = null;
    let Icon = Bot;

    if (n.includes('flux')) src = "FLUX_icon.png";
    else if (n.includes('qwen')) src = "Qwen.png";
    else if (n.includes('stable diffusion') || n.includes('sdxl') || n.includes('stability')) src = "Stability_icon.webp";
    else if (n.includes('hyper-sd') || n.includes('hypersd')) src = "Seed.webp";
    else if (n.includes('claude')) src = "Claude.png";
    else if (n.includes('gpt') || n.includes('openai')) src = "Chatgpt.png";
    else if (n.includes('gemini') || n.includes('lyria') || n.includes('gemma')) src = "Gemini.webp";
    else if (n.includes('mistral') || n.includes('mixtral')) src = "Mistral.png";
    else if (n.includes('seed')) src = "Seed.webp";
    else if (n.includes('auto')) src = "Auto.png";

    if (isTrigger) {
        if (src) {
            return (
                <div className="flex items-center justify-center w-[22px] h-[22px] rounded-md bg-white border border-gray-200/60 dark:border-white/10 dark:bg-white/90 p-[2px] shrink-0 overflow-hidden shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
                    <img src={`/model icon/${src}`} alt={name} className="w-full h-full object-contain" />
                </div>
            );
        }
        return <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />;
    }

    if (src) {
        return (
            <div className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-white border border-gray-200/60 dark:border-white/10 dark:bg-white/90 p-0.5 shrink-0 overflow-hidden shadow-sm">
                <img src={`/model icon/${src}`} alt={name} className="w-full h-full object-contain" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 text-gray-500 shadow-sm">
            <Icon className="w-4 h-4" />
        </div>
    );
};

const resolveRatioDimensions = (modelId, ratio) => {
    const model = getModelById(modelId)
    const found = model.ratios.find((item) => item.value === ratio)
    return found ? { width: found.width, height: found.height } : model.ratios[0]
}

const DEFAULT_IMAGE_MODEL_ID = getDefaultModelForProvider('cloudflare')?.id || DEFAULT_MODEL_ID;

const buildProxyImageUrl = (fileId, userEmail, libId) => {
    const params = new URLSearchParams({ fileId })
    if (userEmail) params.set('userEmail', userEmail)
    if (libId) params.set('libId', libId)
    return `/api/generate-image/file?${params.toString()}`
}

const resolveGenerationImageUrl = (generation) => {
    if (!generation) return ''

    if (generation.displayUrl) return generation.displayUrl
    if (generation.publicUrl) return generation.publicUrl
    if (generation.generatedImagePath) {
        return buildProxyImageUrl(generation.generatedImagePath, generation.userEmail, generation.libId)
    }
    return ''
}

const PROMPT_MAX_LENGTH = 1500

export default function ImageGenerationResult() {
    const { libId: conversationId } = useParams()
    const { currentUser, loading: authLoading } = useAuth()
    const { state: sidebarState, isMobile: isSidebarMobile } = useSidebar()

    const [generations, setGenerations] = useState([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [pageError, setPageError] = useState(null)
    const [regeneratingId, setRegeneratingId] = useState(null)
    const [userPlan, setUserPlan] = useState(null)
    const [planLoading, setPlanLoading] = useState(true)
    const [newPrompt, setNewPrompt] = useState('')
    const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false)
    const [selectedModel, setSelectedModel] = useState(DEFAULT_IMAGE_MODEL_ID)
    const [selectedRatio, setSelectedRatio] = useState(getModelById(DEFAULT_IMAGE_MODEL_ID).ratios[0].value)
    const [imageUploadedFiles, setImageUploadedFiles] = useState([])
    /* The progress map was being written and thrown away (`const [, setX]`), so a
       reference-image upload showed nothing at all until its success toast. It
       feeds the tray now, the same way the search composer's does. */
    const [imageUploadProgress, setImageUploadProgress] = useState({})
    const [, setImageUploadError] = useState('')
    const [generationReactions, setGenerationReactions] = useState({})

    const selectedModelConfig = useMemo(() => getModelById(selectedModel), [selectedModel])
    const selectedRatioConfig = useMemo(() => {
        const ratios = selectedModelConfig?.ratios || []
        return ratios.find((item) => item.value === selectedRatio) || ratios[0] || null
    }, [selectedModelConfig, selectedRatio])
    const inputCenterLeft = useMemo(() => {
        if (isSidebarMobile) return '50%'

        const sidebarWidth = sidebarState === 'collapsed'
            ? 'var(--sidebar-width-icon)'
            : 'var(--sidebar-width)'

        return `calc(50% + (${sidebarWidth} / 2))`
    }, [isSidebarMobile, sidebarState])
    const inputShellWidth = useMemo(() => {
        if (isSidebarMobile) return 'calc(100% - 2rem)'
        const sidebarWidth = sidebarState === 'collapsed'
            ? 'var(--sidebar-width-icon)'
            : 'var(--sidebar-width)'
        return `calc(100% - ${sidebarWidth} - 3rem)`
    }, [isSidebarMobile, sidebarState])
    const hasActiveGeneration = useMemo(
        () => generations.some(g => g?.status === 'generating' || g?.isLocalPending),
        [generations]
    )

    useEffect(() => {
        const nextRatio = selectedModelConfig?.ratios?.[0]?.value
        if (nextRatio && !selectedModelConfig.ratios.some((ratio) => ratio.value === selectedRatio)) {
            setSelectedRatio(nextRatio)
        }
    }, [selectedModelConfig, selectedRatio])

    const normalizeGeneration = useCallback((generation) => ({
        ...generation,
        entryId: generation?.entryId || generation?.$id || generation?.libId,
        resolvedImageUrl: resolveGenerationImageUrl(generation),
    }), [])

    const dedupeGenerations = useCallback((items) => {
        const byId = new Map()

        for (const item of items) {
            const id = item?.entryId || item?.$id || item?.libId
            if (!id) continue

            const normalized = { ...item, entryId: id }
            const existing = byId.get(id)
            if (!existing) {
                byId.set(id, normalized)
                continue
            }

            const existingTime = new Date(existing?.created_at || existing?.$createdAt || existing?.clientCreatedAt || 0).getTime()
            const nextTime = new Date(normalized?.created_at || normalized?.$createdAt || normalized?.clientCreatedAt || 0).getTime()
            byId.set(id, nextTime >= existingTime ? { ...existing, ...normalized } : { ...normalized, ...existing })
        }

        return Array.from(byId.values())
    }, [])

    const sortGenerations = useCallback((items) => {
        return dedupeGenerations(items).sort((a, b) => {
            const aTime = new Date(a?.created_at || a?.$createdAt || a?.clientCreatedAt || 0).getTime()
            const bTime = new Date(b?.created_at || b?.$createdAt || b?.clientCreatedAt || 0).getTime()
            return bTime - aTime
        })
    }, [dedupeGenerations])

    const upsertGeneration = useCallback((entryId, data) => {
        setGenerations(prev => {
            const idx = prev.findIndex(item => item.entryId === entryId)
            const nextEntryId = data?.entryId || entryId
            if (idx !== -1) {
                const updated = [...prev]
                updated[idx] = { ...updated[idx], ...data, entryId: nextEntryId }
                return sortGenerations(updated)
            }
            return sortGenerations([...prev, { ...data, entryId: nextEntryId, clientCreatedAt: Date.now() }])
        })
    }, [sortGenerations])

    const removeGeneration = useCallback((entryId) => {
        setGenerations(prev => prev.filter(item => item.entryId !== entryId))
    }, [])

    const handleGenerationReaction = useCallback((entryId, reactionType) => {
        setGenerationReactions(prev => {
            const current = prev[entryId] || { liked: false, disliked: false }
            if (reactionType === 'like') {
                const liked = !current.liked
                return {
                    ...prev,
                    [entryId]: {
                        liked,
                        disliked: liked ? false : current.disliked,
                    },
                }
            }

            const disliked = !current.disliked
            return {
                ...prev,
                [entryId]: {
                    liked: disliked ? false : current.liked,
                    disliked,
                },
            }
        })
    }, [])

    const fetchUserPlan = useCallback(async () => {
        if (!currentUser?.email) {
            setPlanLoading(false)
            return
        }

        try {
            const response = await authFetch(`/api/user/plan?email=${encodeURIComponent(currentUser.email)}`)
            if (response.ok) {
                const data = await response.json()
                setUserPlan(data)
            }
        } catch (error) {
            console.error('Error fetching user plan:', error)
        } finally {
            setPlanLoading(false)
        }
    }, [currentUser?.email])

    const fetchGenerationData = useCallback(async (targetLibId, { isInitial = false } = {}) => {
        if (!targetLibId) return

        try {
            const emailQuery = currentUser?.email ? `&userEmail=${encodeURIComponent(currentUser.email)}` : ''
            const response = await authFetch(`/api/generate-image?libId=${targetLibId}${emailQuery}`)

            if (!response.ok) {
                if (response.status === 401) {
                    if (isInitial && !currentUser) {
                        return
                    }
                }
                const errData = await response.json().catch(() => null)
                throw new Error(errData?.details || errData?.error || 'Failed to fetch generation data')
            }

            const data = await response.json()
            const incoming = Array.isArray(data?.generations)
                ? data.generations.map(normalizeGeneration)
                : []

            setGenerations(prev => {
                const localPending = prev.filter(g => g.isLocalPending && !incoming.some(i => i.entryId === g.entryId))
                return sortGenerations([...incoming, ...localPending])
            })
            setPageError(null)
        } catch (error) {
            console.warn('Notice in fetchGenerationData:', error?.message || error)
            if (isInitial && currentUser) {
                setPageError(error.message)
            }
        } finally {
            if (isInitial) {
                setInitialLoading(false)
            }
        }
    }, [currentUser, normalizeGeneration, sortGenerations])

    useEffect(() => {
        if (!conversationId) {
            setInitialLoading(false)
            return
        }

        if (authLoading) return

        fetchGenerationData(conversationId, { isInitial: true })
    }, [conversationId, fetchGenerationData, authLoading])

    useEffect(() => {
        fetchUserPlan()
    }, [fetchUserPlan])

    useEffect(() => {
        if (!conversationId) return

        let cancelled = false
        let timer = null

        const scheduleNextPoll = () => {
            const hiddenTab = typeof document !== 'undefined' && document.visibilityState === 'hidden'
            const intervalMs = hiddenTab ? 30000 : (hasActiveGeneration ? 3000 : 15000)
            timer = setTimeout(runPoll, intervalMs)
        }

        const runPoll = async () => {
            if (cancelled) return
            await fetchGenerationData(conversationId)
            if (cancelled) return
            scheduleNextPoll()
        }

        scheduleNextPoll()
        return () => {
            cancelled = true
            if (timer) clearTimeout(timer)
        }
    }, [conversationId, fetchGenerationData, hasActiveGeneration])

    const handleDownload = (generation) => {
        const imageUrl = generation?.resolvedImageUrl || resolveGenerationImageUrl(generation)
        if (!imageUrl) return

        try {
            const downloadUrl = imageUrl.replace('/view?', '/download?')
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = `generated-image-${generation.entryId || generation.libId}.png`
            a.target = '_blank'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            toast.success('Downloading image...')
        } catch (error) {
            toast.error('Failed to download image')
        }
    }

    const handleRegenerate = async (generation) => {
        if (!generation) return

        if (!isPaidUser && !planLoading && userPlan && isDailyLimitExceeded) {
            toast.error(userPlan?.limits?.message || 'Daily limit of 10 images reached. Upgrade to Pro for unlimited generation.')
            return
        }

        const providerToUse = generation.provider || getProviderIdByModelId(generation.model)
        const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`

        upsertGeneration(tempId, {
            libId: conversationId,
            prompt: generation.prompt,
            model: generation.model,
            provider: providerToUse,
            width: generation.width,
            height: generation.height,
            aspectRatio: generation.aspectRatio,
            generationType: generation.generationType,
            hasReferenceImage: generation.hasReferenceImage,
            status: 'generating',
            publicUrl: '',
            isLocalPending: true,
        })

        setRegeneratingId(generation.entryId)

        try {
            const shouldUseImageToImage = generation.generationType === 'image-to-image' && generation.hasReferenceImage
            const regeneratedReferenceImage = shouldUseImageToImage
                ? (generation?.resolvedImageUrl || generation?.displayUrl || generation?.publicUrl || null)
                : null

            const response = await authFetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: generation.prompt,
                    provider: providerToUse,
                    model: generation.model,
                    width: generation.width,
                    height: generation.height,
                    generationType: shouldUseImageToImage ? 'image-to-image' : 'text-to-image',
                    referenceImage: regeneratedReferenceImage,
                    libId: conversationId,
                    userEmail: currentUser?.email,
                }),
            })

            const responseData = await response.json()

            if (response.ok) {
                fetchUserPlan()
                if (responseData.generation) {
                    const enrichedGeneration = {
                        ...responseData.generation,
                        generationType: responseData.generationType || responseData.generation?.generationType || generation.generationType || 'text-to-image',
                        hasReferenceImage: responseData.hasReferenceImage ?? responseData.generation?.hasReferenceImage ?? generation.hasReferenceImage ?? false,
                    }
                    upsertGeneration(tempId, normalizeGeneration(enrichedGeneration))
                    if (responseData?.fallbackReason) {
                        toast.info(responseData.fallbackReason)
                    } else {
                        const actualMode = responseData?.generationType || 'text-to-image'
                        const actualModel = responseData?.modelName || responseData?.model || 'model'
                        toast.success(`Regenerated (${actualMode}) with ${actualModel}`)
                    }
                } else {
                    removeGeneration(tempId)
                    fetchGenerationData(conversationId)
                }
            } else {
                removeGeneration(tempId)
                if (responseData.limitExceeded) {
                    toast.error(responseData.details)
                    fetchUserPlan()
                } else {
                    toast.error(responseData.error || 'Failed to regenerate image')
                }
            }
        } catch (error) {
            removeGeneration(tempId)
            toast.error('Failed to regenerate image')
            console.error('Regeneration error:', error)
        } finally {
            setRegeneratingId(null)
        }
    }

    const handleNewGeneration = async () => {
        const prompt = newPrompt.trim().slice(0, PROMPT_MAX_LENGTH)
        if (!prompt || isSubmittingPrompt) return

        if (!currentUser?.email) {
            toast.error('Please sign in to generate images.')
            return
        }

        if (!planLoading && userPlan && !userPlan?.limits?.canGenerate) {
            toast.error(userPlan?.limits?.message || 'Daily image generation limit reached')
            return
        }

        const modelToUse = selectedModel || DEFAULT_IMAGE_MODEL_ID
        const providerToUse = getProviderIdByModelId(modelToUse)
        const dimensions = resolveRatioDimensions(modelToUse, selectedRatioConfig?.value || selectedRatio)
        const width = dimensions.width
        const height = dimensions.height
        const aspectRatio = selectedRatioConfig?.value || selectedRatio
        const targetConversationId = conversationId || uuidv4()
        const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`

        const isImageToImage = imageUploadedFiles.length > 0
        upsertGeneration(tempId, {
            libId: targetConversationId,
            prompt,
            model: modelToUse,
            provider: providerToUse,
            width,
            height,
            aspectRatio,
            status: 'generating',
            generationType: isImageToImage ? 'image-to-image' : 'text-to-image',
            hasReferenceImage: isImageToImage,
            isLocalPending: true,
        })

        setNewPrompt('')
        setIsSubmittingPrompt(true)

        try {
            // Hidden auto-switch: image upload triggers image-to-image mode.
            let referenceImagePath = null
            let referenceImageBase64 = null
            let generationMode = 'text-to-image'

            if (imageUploadedFiles.length > 0) {
                generationMode = 'image-to-image'
                const uploadedFile = imageUploadedFiles[0]
                referenceImagePath = uploadedFile.uploadResult.publicUrl
                try {
                    referenceImageBase64 = await fileToBase64(uploadedFile.file)
                } catch (base64Error) {
                    // Silently fail and continue with URL-based reference
                }
            }

            const response = await authFetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    provider: providerToUse,
                    model: modelToUse,
                    width,
                    height,
                    referenceImage: referenceImagePath,
                    referenceImageBase64: referenceImageBase64,
                    generationType: generationMode, // Auto-detected mode
                    aspectRatio,
                    libId: targetConversationId,
                    userEmail: currentUser?.email
                }),
            })
            const responseData = await response.json()

            if (response.ok) {
                fetchUserPlan()
                // Immediately update state from the API response so the image shows without waiting for DB polling
                if (responseData.generation) {
                    const enrichedGeneration = {
                        ...responseData.generation,
                        generationType: responseData.generationType || responseData.generation?.generationType || 'text-to-image',
                        hasReferenceImage: responseData.hasReferenceImage ?? responseData.generation?.hasReferenceImage ?? false,
                    }
                    upsertGeneration(tempId, normalizeGeneration(enrichedGeneration))
                    
                    if (responseData?.fallbackReason) {
                        toast.info(responseData.fallbackReason)
                    } else {
                        const actualMode = responseData?.generationType || 'text-to-image'
                        const actualModel = responseData?.modelName || responseData?.model || 'model'
                        if (actualMode === 'image-to-image') {
                            toast.success(`Image edited successfully with ${actualModel}`)
                        } else {
                            toast.info(`Generated via ${actualModel} (${actualMode})`)
                        }
                    }
                } else {
                    removeGeneration(tempId)
                    fetchGenerationData(targetConversationId)
                }
            } else {
                const message = responseData?.details || responseData?.error || 'Failed to generate image'
                toast.error(message)
                removeGeneration(tempId)
                if (responseData?.limitExceeded) {
                    fetchUserPlan()
                }
            }
        } catch (error) {
            console.error('Error initiating image generation:', error)
            toast.error('Failed to initiate image generation. Please try again.')
            removeGeneration(tempId)
        } finally {
            setIsSubmittingPrompt(false)
            // Clear uploaded images after generation attempt
            setImageUploadedFiles([])
            setImageUploadProgress({})
            setImageUploadError('')
        }
    }

    /* Shift+Enter sends, plain Enter inserts a newline — matching the home and
       search composers. This page was the only one of the three that submitted on
       bare Enter, so the same keystroke did opposite things depending on which
       composer you were looking at, and a multi-line image prompt was impossible
       to type here. */
    const handlePromptKeyDown = (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault()
            if (isDailyLimitExceeded) {
                toast.error('Daily limit of 10 images reached. Upgrade to Pro for unlimited generation.')
                return
            }
            handleNewGeneration()
        }
    }

    const handlePromptChange = useCallback((event) => {
        setNewPrompt(event.target.value.slice(0, PROMPT_MAX_LENGTH))
    }, [])

    const handlePromptPaste = useCallback((event) => {
        const clipboardText = event.clipboardData?.getData('text') || ''
        if (!clipboardText) return

        const textarea = event.currentTarget
        const selectionStart = textarea?.selectionStart ?? newPrompt.length
        const selectionEnd = textarea?.selectionEnd ?? newPrompt.length

        event.preventDefault()

        setNewPrompt((currentPrompt) => {
            const nextValue = `${currentPrompt.slice(0, selectionStart)}${clipboardText}${currentPrompt.slice(selectionEnd)}`
            return nextValue.slice(0, PROMPT_MAX_LENGTH)
        })
    }, [newPrompt])

    function renderGenerationCard(generation) {
        const imageUrl = generation?.resolvedImageUrl || resolveGenerationImageUrl(generation)
        const isCompleted = generation?.status === 'completed' && Boolean(imageUrl)
        const isGenerating = generation?.status === 'generating'
        const isFailed = generation?.status === 'failed'
        const reactionState = generationReactions[generation.entryId] || {}

        const actionButtonClass = 'h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors'

        return (
            <div key={generation.entryId} className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-border/40 bg-muted/80 px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-xs sm:max-w-[72%]">
                        <p className="whitespace-pre-wrap wrap-break-word">{generation?.prompt || '-'}</p>
                    </div>
                </div>

                <div className="flex justify-start">
                    <div className="w-full">
                        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                            <div className="p-2 sm:p-3">
                                {isGenerating ? (
                                    <ImageGenLoading isLoading={true} />
                                ) : isCompleted ? (
                                    <img
                                        src={imageUrl}
                                        alt="Generated"
                                        className="block h-auto max-h-[72vh] w-full rounded-xl object-contain"
                                    />
                                ) : isFailed ? (
                                    <div className="flex min-h-72 items-center justify-center px-6 py-10 text-center">
                                        <div>
                                            <XCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
                                            <p className="text-sm font-medium text-foreground">Generation failed</p>
                                            <p className="mt-1 text-sm text-muted-foreground">{generation?.failMessage || 'Check prompts or try again.'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex min-h-72 items-center justify-center">
                                        <p className="text-sm text-muted-foreground">Loading...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-2 flex items-center gap-1 px-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleGenerationReaction(generation.entryId, 'like')}
                                aria-label="Like image"
                                title="Like"
                                className={`${actionButtonClass} ${reactionState.liked ? 'bg-emerald-500/10 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400' : ''}`}
                            >
                                <ThumbsUp className={`h-4 w-4 ${reactionState.liked ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleGenerationReaction(generation.entryId, 'dislike')}
                                aria-label="Dislike image"
                                title="Dislike"
                                className={`${actionButtonClass} ${reactionState.disliked ? 'bg-rose-500/10 text-rose-600 hover:text-rose-700 dark:text-rose-400' : ''}`}
                            >
                                <ThumbsDown className={`h-4 w-4 ${reactionState.disliked ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(generation)}
                                disabled={!isCompleted}
                                aria-label="Download image"
                                title="Download"
                                className={actionButtonClass}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRegenerate(generation)}
                                disabled={regeneratingId === generation.entryId || (!planLoading && userPlan && !userPlan?.limits?.canGenerate)}
                                aria-label="Regenerate image"
                                title="Regenerate"
                                className={actionButtonClass}
                            >
                                <RefreshCw className={`h-4 w-4 ${regeneratingId === generation.entryId ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const cleanPublicUrl = (url) => {
        // Remove admin mode parameter to avoid CORS/auth issues
        if (!url) return url
        return url.replace(/[?&]mode=admin/g, '').replace('?&', '?').replace(/\?$/, '')
    }

    const uploadFileToStorage = async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const resp = await fetch('/api/upload-file', { method: 'POST', body: formData })
        if (!resp.ok) {
            const err = await resp.json()
            throw new Error(err.error || 'Upload failed')
        }
        const data = await resp.json()
        return {
            path: data.path,
            publicUrl: cleanPublicUrl(data.publicUrl),
            fileName: data.fileName || file.name,
            fileType: data.fileType || file.type,
            fileSize: data.fileSize || file.size
        }
    }

    const fileToBase64 = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                resolve(reader.result)
            }
            reader.onerror = (error) => {
                reject(new Error(`Failed to convert file to base64: ${error.message}`))
            }
            reader.readAsDataURL(file)
        })
    }

    const validateImageFile = (file) => {
        const MAX_FILE_SIZE = 10 * 1024 * 1024
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
        
        if (!ALLOWED_TYPES.includes(file.type)) {
            return `${file.name}: Invalid image type (only JPG, PNG, WebP allowed)`
        }
        if (file.size > MAX_FILE_SIZE) {
            return `${file.name}: Image is too large (max 10MB)`
        }
        return null
    }

    const onImageDrop = useCallback((acceptedFiles, rejectedFiles) => {
        const handleImageDrop = async () => {
            setImageUploadError('')

            if (rejectedFiles.length > 0) {
                const errors = rejectedFiles.map(({ file, errors }) => {
                    return errors.map(error => {
                        if (error.code === 'file-too-large') {
                            return `${file.name}: Image is too large (max 10MB)`
                        } else if (error.code === 'file-invalid-type') {
                            return `${file.name}: Invalid image type`
                        }
                        return `${file.name}: ${error.message}`
                    }).join(', ')
                }).join('; ')
                setImageUploadError(errors)
                toast.error(errors)
                return
            }

            const validationErrors = []
            acceptedFiles.forEach(file => {
                const error = validateImageFile(file)
                if (error) {
                    validationErrors.push(error)
                }
            })

            if (validationErrors.length > 0) {
                const errorMessage = validationErrors.join('; ')
                setImageUploadError(errorMessage)
                toast.error(errorMessage)
                return
            }

            for (const file of acceptedFiles) {
                const fileId = `img-${Date.now()}-${Math.random().toString(16).slice(2)}`
                try {
                    setImageUploadProgress(prev => ({
                        ...prev,
                        [fileId]: 0
                    }))

                    const progressInterval = setInterval(() => {
                        setImageUploadProgress(prev => ({
                            ...prev,
                            [fileId]: Math.min((prev[fileId] || 0) + Math.random() * 30, 90)
                        }))
                    }, 200)

                    const uploadResult = await uploadFileToStorage(file)

                    clearInterval(progressInterval)
                    setImageUploadProgress(prev => ({
                        ...prev,
                        [fileId]: 100
                    }))

                    setImageUploadedFiles(prev => [...prev, {
                        id: fileId,
                        file,
                        uploadResult,
                        status: 'completed'
                    }])

                    // Hidden mode assist: uploaded image implies edit flow, so prefer HF image-edit model.
                    const preferredImageEditModel = getDefaultImageToImageModelForProvider('huggingface')
                    if (preferredImageEditModel?.id && selectedModel !== preferredImageEditModel.id) {
                        setSelectedModel(preferredImageEditModel.id)
                    }

                    toast.success(`${file.name} uploaded successfully!`)

                    setTimeout(() => {
                        setImageUploadProgress(prev => {
                            const newProgress = { ...prev }
                            delete newProgress[fileId]
                            return newProgress
                        })
                    }, 2000)
                } catch (error) {
                    console.error('Image upload error:', error)
                    setImageUploadError(error.message)
                    toast.error(`Failed to upload ${file.name}: ${error.message}`)

                    setImageUploadProgress(prev => {
                        const newProgress = { ...prev }
                        delete newProgress[fileId]
                        return newProgress
                    })
                }
            }
        }
        handleImageDrop()
    }, [])

    const {
        getRootProps: getImageRootProps,
        getInputProps: getImageInputProps,
        isDragActive: isImageDragActive,
        open: openImagePicker
    } = useDropzone({
        onDrop: onImageDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp']
        },
        maxSize: 10 * 1024 * 1024,
        noClick: true,
        noKeyboard: true
    })

    const removeImageFile = useCallback((fileId) => {
        const fileToRemove = imageUploadedFiles.find(f => f.id === fileId)
        if (fileToRemove?.uploadResult?.path) {
            fetch('/api/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: fileToRemove.uploadResult.path }),
            }).catch(console.error)
        }

        setImageUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    }, [imageUploadedFiles])

    const pendingUploads = Object.entries(imageUploadProgress)
        .filter(([fileId]) => !imageUploadedFiles.some(f => f.id === fileId))

    /* Derived user plan and daily limits */
    const rawPlan = userPlan?.user?.plan || userPlan?.plan
    const isPaidUser = Boolean(
        userPlan?.user?.isPro ||
        userPlan?.user?.isMax ||
        userPlan?.isPro ||
        userPlan?.isMax ||
        rawPlan === 'pro' ||
        rawPlan === 'max' ||
        userPlan?.limits?.dailyLimit === -1
    )
    const dailyLimit = typeof userPlan?.limits?.dailyLimit === 'number' && userPlan.limits.dailyLimit > 0
        ? userPlan.limits.dailyLimit
        : 10
    const dailyCount = userPlan?.limits?.dailyCount ?? 0
    const remainingImages = isPaidUser
        ? -1
        : (typeof userPlan?.limits?.remainingImages === 'number'
            ? userPlan.limits.remainingImages
            : Math.max(0, dailyLimit - dailyCount))
    const canGenerateImage = isPaidUser ? true : (userPlan?.limits?.canGenerate ?? (remainingImages > 0))
    const isDailyLimitExceeded = !isPaidUser && !planLoading && Boolean(userPlan) && (!canGenerateImage || remainingImages <= 0)

    /* Mirrors handleNewGeneration's own guard. */
    const canSend = Boolean(newPrompt.trim()) && !isSubmittingPrompt && !isDailyLimitExceeded

    /* The counter is noise for the first 1200 of 1500 characters. It appears at 80%,
       goes amber there and rose at the cap, and announces itself once when the limit
       is actually reached rather than on every keystroke. */
    const promptLength = newPrompt.length
    const showPromptCount = promptLength >= PROMPT_MAX_LENGTH * 0.8
    const promptAtLimit = promptLength >= PROMPT_MAX_LENGTH

    if (initialLoading) {
        return (
            <div className="min-h-dvh flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-border border-t-foreground" />
                    <p className="text-muted-foreground">Loading…</p>
                </div>
            </div>
        )
    }

    if (pageError) {
        return (
            <div className="min-h-dvh flex items-center justify-center p-4">
                <div className="text-center max-w-md" role="alert">
                    <XCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
                    <h1 className="mb-2 text-xl font-semibold text-foreground">Error</h1>
                    <p className="text-sm text-muted-foreground">{pageError}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-dvh scroll-smooth scroll-pb-64 overflow-x-hidden px-4 pt-8 pb-64 sm:px-6 md:pt-10 md:pb-72">
            <div className="mx-auto flex w-full max-w-3xl justify-center">
            <div className="w-full space-y-8 md:space-y-10">
                    {generations.length > 0 ? generations.map(renderGenerationCard) : (
                        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-8 text-center shadow-xs">
                            <p className="text-sm text-muted-foreground">No generations yet. Use the composer below to create your first image.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Composer ── */}
            <div
                className="fixed bottom-3 z-40 -translate-x-1/2 md:bottom-5"
                style={{ left: inputCenterLeft, width: inputShellWidth, maxWidth: '48rem' }}
            >
                <div
                    {...getImageRootProps()}
                    data-composer
                    className={`w-full overflow-hidden ${COMPOSER_CARD({
                        fixed: true,
                        dragActive: isImageDragActive,
                    })}`}
                >
                    <input {...getImageInputProps()} />

                    {/* Mode badge + inline aspect ratio selector (matching ChatBoxAiInput) */}
                    <div className="flex flex-wrap items-center gap-2 px-4 pt-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className={`${NEUTRAL_BADGE} text-xs font-medium`}>
                                <ImagePlus className="h-3.5 w-3.5" />
                                Create Image
                            </div>

                            {/* Aspect ratio pills */}
                            <div
                                role="group"
                                aria-label="Image aspect ratio"
                                className="inline-flex items-center gap-0.5 rounded-full border border-border/40 bg-muted/40 p-0.5"
                            >
                                {(selectedModelConfig?.ratios || []).map((ratio) => {
                                    const isSelected = selectedRatio === ratio.value
                                    const shortLabel = ratio.value
                                    const nameLabel = ratio.label.replace(/\s*\(.*\)/, '')
                                    return (
                                        <button
                                            key={ratio.value}
                                            type="button"
                                            onClick={() => setSelectedRatio(ratio.value)}
                                            aria-pressed={isSelected}
                                            className={`inline-flex min-h-8 cursor-pointer items-center whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-medium transition-colors duration-200 sm:px-2.5 ${FOCUS_RING} ${isSelected
                                                ? 'bg-foreground text-background shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            <span className="sm:hidden">{isSelected ? `${nameLabel} ${shortLabel}` : shortLabel}</span>
                                            <span className="hidden sm:inline">{ratio.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Reference image attachment tray */}
                    {(imageUploadedFiles.length > 0 || pendingUploads.length > 0) && (
                        <div className="px-4 pt-3">
                            <AttachmentGroup role="list" aria-label="Reference images">
                                {imageUploadedFiles.map((fileItem, index) => (
                                    <Attachment
                                        key={fileItem.id}
                                        role="listitem"
                                        state="done"
                                        className={TRAY_ITEM}
                                        style={TRAY_ITEM_STYLE(index)}
                                    >
                                        <AttachmentMedia variant="image">
                                            <img
                                                src={fileItem.file instanceof File || fileItem.file instanceof Blob
                                                    ? URL.createObjectURL(fileItem.file)
                                                    : (fileItem.uploadResult?.publicUrl || '')}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </AttachmentMedia>
                                        <AttachmentContent>
                                            <AttachmentTitle title={fileItem.file.name}>{fileItem.file.name}</AttachmentTitle>
                                            <AttachmentDescription>{(fileItem.file.size / 1024 / 1024).toFixed(1)} MB</AttachmentDescription>
                                        </AttachmentContent>
                                        <AttachmentActions>
                                            <AttachmentRemove
                                                label={fileItem.file.name}
                                                onClick={(e) => {
                                                    e?.stopPropagation?.()
                                                    removeImageFile(fileItem.id)
                                                }}
                                            />
                                        </AttachmentActions>
                                    </Attachment>
                                ))}
                                {pendingUploads.map(([fileId, progress], index) => (
                                    <Attachment
                                        key={`upload-${fileId}`}
                                        role="listitem"
                                        state="uploading"
                                        className={TRAY_ITEM}
                                        style={TRAY_ITEM_STYLE(imageUploadedFiles.length + index)}
                                    >
                                        <AttachmentMedia variant="image" />
                                        <AttachmentContent>
                                            <AttachmentTitle>Uploading image…</AttachmentTitle>
                                            <AttachmentProgress
                                                value={progress}
                                                label="Image upload progress"
                                                className="mt-1"
                                            />
                                        </AttachmentContent>
                                    </Attachment>
                                ))}
                            </AttachmentGroup>
                        </div>
                    )}

                    {/* Notice when daily free limit is exceeded */}
                    {isDailyLimitExceeded && (
                        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in">
                            <div className="flex items-center gap-2 min-w-0">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span className="font-medium truncate">Daily limit exceeded (10/10 used). Upgrade to Pro or Max for unlimited generation.</span>
                            </div>
                            <a href="/#pricing" className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80">
                                Upgrade
                            </a>
                        </div>
                    )}

                    {/* Textarea */}
                    <textarea
                        onPaste={handlePromptPaste}
                        value={newPrompt}
                        onChange={handlePromptChange}
                        onKeyDown={handlePromptKeyDown}
                        aria-label="Image prompt"
                        aria-describedby={showPromptCount ? 'image-prompt-count' : undefined}
                        placeholder={
                            isDailyLimitExceeded
                                ? 'Daily limit of 10 images reached. Upgrade to Pro for unlimited generation…'
                                : (imageUploadedFiles.length > 0 ? 'Describe the edits or changes you want…' : 'Describe the image you want to generate…')
                        }
                        className={`${COMPOSER_TEXTAREA} min-h-13 px-5 pt-4 pb-2 ${isDailyLimitExceeded ? 'opacity-85' : ''}`}
                        maxLength={PROMPT_MAX_LENGTH}
                        rows={1}
                        style={{ overflow: 'hidden' }}
                        onInput={(e) => {
                            e.target.style.height = 'auto'
                            const newHeight = e.target.scrollHeight
                            const maxHeight = 16 * 24
                            if (newHeight > maxHeight) {
                                e.target.style.height = `${maxHeight}px`
                                e.target.style.overflowY = 'auto'
                            } else {
                                e.target.style.height = `${newHeight}px`
                                e.target.style.overflowY = 'hidden'
                            }
                        }}
                    />

                    {/* Character limit counter */}
                    {showPromptCount && (
                        <div
                            id="image-prompt-count"
                            role={promptAtLimit ? 'status' : undefined}
                            className={`px-5 pb-1 text-right text-[11px] tabular-nums ${promptAtLimit ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}
                        >
                            {promptLength}/{PROMPT_MAX_LENGTH}
                            {promptAtLimit && <span className="ml-1 font-medium">limit reached</span>}
                        </div>
                    )}

                    {/* Bottom toolbar row (matching ChatBoxAiInput) */}
                    <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
                        <div className="flex min-w-0 items-center gap-0.5">
                            {/* Reference Image Button */}
                            <button
                                type="button"
                                onClick={openImagePicker}
                                aria-label="Upload reference image"
                                title="Upload reference image for editing"
                                className={TOOLBAR_PILL}
                            >
                                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Image</span>
                            </button>

                            <div className={TOOLBAR_DIVIDER} />

                            {/* Image Model Dropdown (matching ChatBoxAiInput search model design) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    aria-label={`Image model: ${selectedModelConfig?.name || 'default'}. Change model`}
                                    className={`${TOOLBAR_PILL} group border-0 bg-transparent`}
                                >
                                    {!selectedModelConfig ? (
                                        <Cpu className="h-4 w-4" />
                                    ) : (
                                        getModelLogo(selectedModelConfig.name, true)
                                    )}
                                    <span className="hidden sm:inline max-w-25 truncate">{selectedModelConfig?.name || 'Model'}</span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    sideOffset={8}
                                    className="w-[280px] rounded-2xl border border-border/60 bg-popover p-1.5 shadow-2xl"
                                >
                                    <div className="flex max-h-[340px] flex-col gap-0.5 overflow-y-auto p-1">
                                        {IMAGE_MODELS.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i).map((model, index) => {
                                            const isSelected = selectedModel === model.id;
                                            return (
                                                <DropdownMenuItem
                                                    key={index}
                                                    aria-label={model.name}
                                                    className={`flex items-center justify-between rounded-[10px] px-2.5 py-2 cursor-pointer transition-colors duration-200 outline-none select-none
                                                        ${isSelected ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'hover:bg-muted focus:bg-muted dark:hover:bg-muted/50 dark:focus:bg-muted/50'}`}
                                                    onClick={() => setSelectedModel(model.id)}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {getModelLogo(model.name)}
                                                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                            {model.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2.5 shrink-0">
                                                        {isSelected && (
                                                            <Check className="w-4 h-4 text-primary" strokeWidth={3} aria-hidden="true" />
                                                        )}
                                                    </div>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Send button on the bottom right */}
                        <button
                            type="button"
                            onClick={handleNewGeneration}
                            disabled={!canSend}
                            className={SEND_BUTTON(canSend)}
                            aria-label={isSubmittingPrompt ? 'Generating…' : 'Generate image'}
                            title={
                                isDailyLimitExceeded
                                    ? 'Daily limit of 10 images reached. Upgrade to Pro for unlimited generation.'
                                    : 'Generate (Shift + Enter)'
                            }
                        >
                            {isSubmittingPrompt ? (
                                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden="true" />
                            ) : (
                                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Image quota footer:
                    - Pro or Max plan: show NOTHING because image generation is unlimited.
                    - Free plan exhausted: show prominent daily limit exceeded card with upgrade CTA.
                    - Free plan active: show clean redesigned progress indicator. */}
                {!planLoading && userPlan && !isPaidUser && (
                    isDailyLimitExceeded ? (
                        <div className="w-full max-w-2xl mt-2.5 mx-auto animate-in fade-in">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300 shadow-sm backdrop-blur-sm">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                        <AlertCircle className="h-4.5 w-4.5" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-rose-900 dark:text-rose-200">
                                            Daily limit exceeded (10/10 used)
                                        </p>
                                        <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 truncate">
                                            Free plan includes 10 images/day. Upgrade to Pro or Max for unlimited generation.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href="/#pricing"
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110 active:scale-[0.98]"
                                >
                                    <Crown className="h-3.5 w-3.5" />
                                    Upgrade to Pro
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-2xl mt-2 mx-auto animate-in fade-in">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/85 dark:bg-card/60 backdrop-blur-sm px-3.5 py-2 text-xs text-muted-foreground shadow-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                                    <span className="font-medium text-foreground tabular-nums truncate">
                                        {remainingImages === 1
                                            ? '1 free generation left today'
                                            : `${remainingImages} of ${dailyLimit} free generations left today`}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2.5 min-w-[110px] max-w-[180px] flex-1">
                                    <Progress
                                        value={(remainingImages / dailyLimit) * 100}
                                        aria-label="Daily image quota remaining"
                                        className="h-1.5 flex-1 bg-muted"
                                    />
                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
                                        {dailyCount}/{dailyLimit}
                                    </span>
                                </div>

                                {remainingImages <= 3 && (
                                    <a
                                        href="/#pricing"
                                        className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                                    >
                                        <Crown className="h-3 w-3" />
                                        Go Unlimited
                                    </a>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
