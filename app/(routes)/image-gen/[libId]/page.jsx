'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download, Copy, RefreshCw, XCircle, Crown, AlertTriangle, ArrowUp, Loader2, Cpu } from 'lucide-react'
import {
    IMAGE_MODELS,
    DEFAULT_MODEL_ID,
    getModelById,
    getDefaultModelForProvider,
    getProviderIdByModelId,
} from '@/lib/hf-image-config'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from '@/lib/alert'
import { useAuth } from '@/contexts/AuthContext'
import { v4 as uuidv4 } from 'uuid'

const getRatioDimensions = (modelId, ratio) => {
    const model = getModelById(modelId)
    const found = model.ratios.find(r => r.value === ratio);
    return found ? { width: found.width, height: found.height } : model.ratios[0];
}

const DEFAULT_IMAGE_MODEL_ID = getDefaultModelForProvider('leonardo')?.id || DEFAULT_MODEL_ID;

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

export default function ImageGenerationResult() {
    const { libId: conversationId } = useParams()
    const { currentUser } = useAuth()

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

    const latestGeneration = useMemo(() => generations[0], [generations])

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

            // Keep the newest version when same entry appears from local optimistic + server polling.
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

    // Derive current model config reactively
    const currentModelConfig = useMemo(() => {
        return getModelById(selectedModel)
    }, [selectedModel])

    // Reset ratio when the model changes.
    useEffect(() => {
        setSelectedRatio(currentModelConfig.ratios[0].value)
    }, [currentModelConfig.id])

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

    const fetchUserPlan = useCallback(async () => {
        if (!currentUser?.email) {
            setPlanLoading(false)
            return
        }
        try {
            const response = await fetch(`/api/user/plan?email=${currentUser.email}`)
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
        try {
            const emailQuery = currentUser?.email ? `&userEmail=${encodeURIComponent(currentUser.email)}` : ''
            const response = await fetch(`/api/generate-image?libId=${targetLibId}${emailQuery}`)

            if (!response.ok) {
                throw new Error('Failed to fetch generation data')
            }

            const data = await response.json()
            const incoming = Array.isArray(data?.generations)
                ? data.generations.map(normalizeGeneration)
                : []
            setGenerations(sortGenerations(incoming))

            if (isInitial) {
                setInitialLoading(false)
            }
        } catch (err) {
            if (isInitial) {
                setPageError(err.message)
                setInitialLoading(false)
            }
        }
    }, [currentUser?.email, normalizeGeneration, sortGenerations])

    useEffect(() => {
        if (!conversationId) return
        fetchGenerationData(conversationId, { isInitial: true })
    }, [conversationId, fetchGenerationData])

    useEffect(() => {
        fetchUserPlan()
    }, [fetchUserPlan])

    useEffect(() => {
        const interval = setInterval(() => {
            const hasPending = generations.some(gen => gen.status === 'generating')
            if (hasPending && conversationId) {
                fetchGenerationData(conversationId)
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [generations, conversationId, fetchGenerationData])

    const handleDownload = (generation) => {
        const imageUrl = generation?.resolvedImageUrl || resolveGenerationImageUrl(generation)
        if (!imageUrl) return

        try {
            // Use /download endpoint — sets Content-Disposition: attachment so browser saves the file.
            // Avoids blob fetch which fails due to CORS restrictions on the admin-mode URL.
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

    const handleCopyImageUrl = async (generation) => {
        const imageUrl = generation?.resolvedImageUrl || resolveGenerationImageUrl(generation)
        if (!imageUrl) return

        try {
            await navigator.clipboard.writeText(imageUrl)
            toast.success('Image URL copied to clipboard!')
        } catch (error) {
            toast.error('Failed to copy URL')
        }
    }

    const handleRegenerate = async (generation) => {
        if (!generation) return

        if (!planLoading && userPlan && !userPlan?.limits?.canGenerate) {
            toast.error(userPlan?.limits?.message || 'Daily image generation limit reached')
            return
        }

        const providerToUse = generation.provider || getProviderIdByModelId(generation.model)

        // Show generating state immediately — before the API call starts
        const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`
        upsertGeneration(tempId, {
            libId: conversationId,
            prompt: generation.prompt,
            model: generation.model,
            provider: providerToUse,
            width: generation.width,
            height: generation.height,
            status: 'generating',
            publicUrl: '',
            isLocalPending: true,
        })
        setRegeneratingId(generation.entryId)
        try {
            const response = await fetch('/api/generate-image', {
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
                    libId: conversationId,
                    userEmail: currentUser?.email
                }),
            })

            const responseData = await response.json()

            if (response.ok) {
                fetchUserPlan()
                // Update directly from API response so image appears instantly
                if (responseData.generation) {
                    upsertGeneration(tempId, normalizeGeneration(responseData.generation))
                    toast.success('Image regenerated!')
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
        const prompt = newPrompt.trim()
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
        const dimensions = getRatioDimensions(modelToUse, selectedRatio)
        const width = dimensions.width
        const height = dimensions.height
        const aspectRatio = selectedRatio
        const targetConversationId = conversationId || uuidv4()
        const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`

        upsertGeneration(tempId, {
            libId: targetConversationId,
            prompt,
            model: modelToUse,
            provider: providerToUse,
            width,
            height,
            aspectRatio,
            status: 'generating',
            isLocalPending: true,
        })

        setNewPrompt('')
        setIsSubmittingPrompt(true)

        try {
            const response = await fetch('/api/generate-image', {
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
                    referenceImage: null,
                    libId: targetConversationId,
                    userEmail: currentUser?.email
                }),
            })

            const responseData = await response.json()

            if (response.ok) {
                fetchUserPlan()
                // Immediately update state from the API response so the image shows without waiting for DB polling
                if (responseData.generation) {
                    upsertGeneration(tempId, normalizeGeneration(responseData.generation))
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
        }
    }

    const handlePromptKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleNewGeneration()
        }
    }

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-[oklch(0.2478_0_0.24)] flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-2 border-slate-300 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-300 rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading...</p>
                </div>
            </div>
        )
    }

    if (pageError) {
        return (
            <div className="min-h-screen bg-white dark:bg-[oklch(0.2478_0_0.24)] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Error</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{pageError}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[oklch(0.2478_0_0.24)] p-6 md:p-8 pb-36">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                            Generated Image
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {latestGeneration?.status === 'generating' && 'Generating...'}
                            {latestGeneration?.status === 'completed' && 'Ready for download'}
                            {latestGeneration?.status === 'failed' && 'Generation failed'}
                            {!latestGeneration && 'No generations yet'}
                        </p>
                    </div>
                </div>

                <div className="space-y-8 md:space-y-10">
                    {generations.map(generation => {
                        const previewAspectClass = generation?.width && generation?.height
                            ? `aspect-[${generation.width}/${generation.height}]`
                            : 'aspect-square'

                        return (
                        <div key={generation.entryId} className="grid grid-cols-1 lg:grid-cols-4 gap-5 md:gap-6">
                            <div className="lg:col-span-3">
                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 max-w-2xl mx-auto shadow-sm">
                                    {generation?.status === 'generating' ? (
                                        <div className={`${previewAspectClass} flex items-center justify-center min-h-70`}>
                                            <div className="text-center">
                                                <div className="animate-spin w-12 h-12 border-2 border-slate-300 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-300 rounded-full mx-auto mb-4"></div>
                                                <p className="text-slate-600 dark:text-slate-400 text-sm">Creating image...</p>
                                                {generation?.prompt && (
                                                    <p className="text-xs leading-relaxed wrap-break-word text-slate-500 dark:text-slate-500 mt-3 px-4">
                                                        "{generation.prompt.substring(0, 100)}{generation.prompt.length > 100 ? '...' : ''}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : generation?.status === 'completed' && (generation?.resolvedImageUrl || generation?.publicUrl || generation?.displayUrl || generation?.generatedImagePath) ? (
                                        <img
                                            src={generation?.resolvedImageUrl || resolveGenerationImageUrl(generation)}
                                            alt="Generated"
                                            className="block w-full h-auto max-h-[65vh] object-contain"
                                        />
                                    ) : generation?.status === 'failed' ? (
                                        <div className={`${previewAspectClass} flex items-center justify-center min-h-70`}>
                                            <div className="text-center">
                                                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                                <p className="text-slate-900 dark:text-white font-medium">Generation Failed</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                                    {generation?.failMessage || 'Check prompts or try again.'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`${previewAspectClass} flex items-center justify-center min-h-70`}>
                                            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-5 lg:sticky lg:top-24 h-fit">
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Details</h3>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Prompt</p>
                                            <p className="text-slate-900 dark:text-white wrap-break-word leading-relaxed">{generation?.prompt || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Model</p>
                                            <p className="text-slate-900 dark:text-white">
                                                {generation?.model
                                                ? (getModelById(generation.model)?.name || generation.model)
                                                : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Size</p>
                                            <p className="text-slate-900 dark:text-white">
                                                {generation?.width && generation?.height
                                                    ? `${generation.width}×${generation.height}`
                                                    : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {!planLoading && userPlan && (
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            {userPlan.user.isPro ? (
                                                <Crown className="w-4 h-4 text-yellow-500" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-slate-500" />
                                            )}
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {userPlan.user.isPro ? 'Pro' : 'Free'}
                                            </h3>
                                        </div>
                                        {!userPlan.user.isPro && (
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600 dark:text-slate-400">Daily usage</span>
                                                    <span className="text-slate-900 dark:text-white font-medium">
                                                        {userPlan.limits.dailyCount}/{userPlan.limits.dailyLimit}
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-slate-400 dark:bg-slate-600"
                                                        style={{
                                                            width: `${(userPlan.limits.dailyCount / userPlan.limits.dailyLimit) * 100}%`
                                                        }}
                                                    ></div>
                                                </div>
                                                {!userPlan.limits.canGenerate && (
                                                    <p className="text-xs text-red-600 dark:text-red-400">Daily limit reached</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {generation?.status === 'completed' && (
                                    <div className="space-y-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyImageUrl(generation)}
                                            className="w-full cursor-pointer justify-start"
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copy URL
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRegenerate(generation)}
                                            disabled={regeneratingId === generation.entryId || (!planLoading && userPlan && !userPlan?.limits?.canGenerate)}
                                            className="w-full cursor-pointer justify-start"
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${regeneratingId === generation.entryId ? 'animate-spin' : ''}`} />
                                            Regenerate
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleDownload(generation)}
                                            className="w-full cursor-pointer justify-start"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                )}

                                {generation?.status === 'failed' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRegenerate(generation)}
                                        disabled={regeneratingId === generation.entryId}
                                        className="w-full cursor-pointer"
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${regeneratingId === generation.entryId ? 'animate-spin' : ''}`} />
                                        Try Again
                                    </Button>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            </div>

            <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-20">
                <div className="w-full max-w-3xl">
                    <div className="border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[oklch(0.3092_0_0)] backdrop-blur rounded-2xl shadow-lg">

                        {/* Aspect Ratio Selection — styled as badge area */}
                        <div className="flex flex-wrap items-center gap-1 px-4 pt-3">
                            {currentModelConfig.ratios.map((ratio) => (
                                <button
                                    key={ratio.value}
                                    onClick={() => setSelectedRatio(ratio.value)}
                                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                                        selectedRatio === ratio.value
                                            ? 'dark:bg-[oklch(0.2478_0_0)] text-white'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-gray-500/60 cursor-pointer'
                                    }`}
                                >
                                    {ratio.label}
                                </button>
                            ))}
                        </div>

                        {/* Textarea */}
                        <textarea
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            onKeyDown={handlePromptKeyDown}
                            placeholder="Describe the image you want to generate..."
                            className="w-full resize-none bg-transparent px-4 pt-4 pb-2 outline-none min-h-11 text-sm md:text-base leading-relaxed scrollbar-hide overflow-hidden text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-300"
                            rows={1}
                            style={{ overflow: 'hidden' }}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                const newHeight = e.target.scrollHeight;
                                const maxHeight = 12 * 24;
                                if (newHeight > maxHeight) {
                                    e.target.style.height = maxHeight + 'px';
                                    e.target.style.overflowY = 'scroll';
                                } else {
                                    e.target.style.height = newHeight + 'px';
                                    e.target.style.overflowY = 'hidden';
                                }
                            }}
                        />

                        {/* ── Bottom toolbar ── */}
                        <div className="flex items-center justify-between px-3 pb-3">
                            <div className="flex items-center gap-1">
                                {/* Model selector */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-500/60 transition-colors cursor-pointer border-0 bg-transparent outline-none">
                                        <Cpu className='text-gray-500 dark:text-gray-400 w-4 h-4' />
                                        <span className="hidden sm:inline">{IMAGE_MODELS.find(m => m.id === selectedModel)?.name || 'Model'}</span>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="dark:bg-[oklch(0.2478_0_0)] dark:border-gray-600 w-64 max-h-80 overflow-y-auto">
                                        <DropdownMenuLabel className="dark:text-white font-medium sticky top-0 bg-white dark:bg-[oklch(0.2478_0_0)] z-10">
                                            Image Models
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="dark:border-gray-600 sticky top-8 bg-white dark:bg-[oklch(0.2478_0_0)] z-10" />
                                        <div className="space-y-1">
                                            {IMAGE_MODELS.map((model) => (
                                                <DropdownMenuItem 
                                                    key={model.id}
                                                    className={`dark:text-white dark:hover:bg-[oklch(0.3092_0_0)] cursor-pointer ${
                                                        selectedModel === model.id ? 'bg-accent dark:bg-[oklch(0.3092_0_0)]' : ''
                                                    }`}
                                                    onClick={() => setSelectedModel(model.id)}
                                                >
                                                    <div className='w-full'>
                                                        <div className='flex items-center justify-between'>
                                                            <div className='flex items-center gap-2'>
                                                                <h2 className='text-sm dark:text-white font-medium'>{model.name}</h2>
                                                            </div>
                                                            {selectedModel === model.id && (
                                                                <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                                            )}
                                                        </div>
                                                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                                                            {model.desc}
                                                        </p>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Send button */}
                            <button
                                onClick={handleNewGeneration}
                                disabled={isSubmittingPrompt || !newPrompt.trim()}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                                    newPrompt.trim()
                                        ? 'bg-foreground text-background hover:opacity-80'
                                        : 'dark:bg-[oklch(0.2478_0_0)] text-muted-foreground cursor-not-allowed'
                                }`}
                            >
                                {isSubmittingPrompt ? (
                                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                ) : (
                                    <ArrowUp className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}