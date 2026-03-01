'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download, Copy, RefreshCw, XCircle, Crown, AlertTriangle, Send, Loader2, Cpu } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'react-toastify'
import { useAuth } from '@/contexts/AuthContext'
import { v4 as uuidv4 } from 'uuid'

const IMAGE_MODELS = [
    // {
    //     id: "chatboxai",
    //     name: "ChatBoxAI v1.0",
    //     desc: "Your custom ChatBoxAI model - high-quality image generation",
    //     isFeatured: true
    // },
    {
        id: "provider-4/imagen-4",
        name: "Imagen 4",
        desc: "Google's latest high-quality image generation model"
    },
    {
        id: "provider-2/flux-schnell",
        name: "Flux Schnell",
        desc: "Fast and efficient image generation model"
    },
    {
        id: "provider-4/z-image-turbo",
        name: "Z-Image Turbo",
        desc: "Z-Image Turbo is a text-to-image model that can generate high-quality images from text prompts."
    },
    {
        id: "provider-4/flux-2-klein-9b",
        name: "Flux 2 Klein 9B",
        desc: "Flux 2 Klein 9B is a text-to-image model that can generate high-quality images from text prompts."
    }
]

const ASPECT_RATIOS = [
    { label: "1:1 (Square)", value: "1:1", width: 1024, height: 1024 },
    { label: "16:9 (Landscape)", value: "16:9", width: 1344, height: 768 },
    { label: "9:16 (Portrait)", value: "9:16", width: 768, height: 1344 },
    { label: "4:3 (Standard)", value: "4:3", width: 1024, height: 768 },
    { label: "3:4 (Portrait)", value: "3:4", width: 768, height: 1024 },
    { label: "21:9 (Ultrawide)", value: "21:9", width: 1344, height: 576 },
]

const getRatioDimensions = (ratio) => {
    const found = ASPECT_RATIOS.find(r => r.value === ratio)
    return found ? { width: found.width, height: found.height } : { width: 1024, height: 1024 }
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
    const [selectedModel, setSelectedModel] = useState('provider-4/flux-schnell')
    const [selectedRatio, setSelectedRatio] = useState('1:1')

    const latestGeneration = useMemo(() => generations[generations.length - 1], [generations])

    const upsertGeneration = useCallback((libId, data) => {
        setGenerations(prev => {
            const idx = prev.findIndex(item => item.libId === libId)
            if (idx !== -1) {
                const updated = [...prev]
                updated[idx] = { ...updated[idx], ...data, libId }
                return updated
            }
            return [...prev, { ...data, libId, clientCreatedAt: Date.now() }]
        })
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
            const response = await fetch(`/api/generate-image?libId=${targetLibId}`)

            if (!response.ok) {
                if (response.status === 404) {
                    upsertGeneration(targetLibId, {
                        status: 'generating',
                        prompt: '',
                        selectedModel: '',
                        width: 0,
                        height: 0,
                        aspectRatio: ''
                    })
                    if (isInitial) {
                        setInitialLoading(false)
                    }
                    return
                }
                throw new Error('Failed to fetch generation data')
            }

            const data = await response.json()
            upsertGeneration(targetLibId, { ...data, libId: targetLibId })

            if (isInitial) {
                setInitialLoading(false)
            }
        } catch (err) {
            if (isInitial) {
                setPageError(err.message)
                setInitialLoading(false)
            }
        }
    }, [upsertGeneration])

    useEffect(() => {
        if (!conversationId) return
        fetchGenerationData(conversationId, { isInitial: true })
    }, [conversationId, fetchGenerationData])

    useEffect(() => {
        fetchUserPlan()
    }, [fetchUserPlan])

    useEffect(() => {
        const interval = setInterval(() => {
            const pendingIds = generations
                .filter(gen => gen.status === 'generating')
                .map(gen => gen.libId)

            pendingIds.forEach(id => fetchGenerationData(id))
        }, 2000)

        return () => clearInterval(interval)
    }, [generations, fetchGenerationData])

    const handleDownload = async (generation) => {
        if (!generation?.generatedImageUrl) return

        try {
            const response = await fetch(generation.generatedImageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `generated-image-${generation.libId}.png`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success('Image downloaded successfully!')
        } catch (error) {
            toast.error('Failed to download image')
        }
    }

    const handleCopyImageUrl = async (generation) => {
        if (!generation?.generatedImageUrl) return

        try {
            await navigator.clipboard.writeText(generation.generatedImageUrl)
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

        setRegeneratingId(generation.libId)
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: generation.prompt,
                    model: generation.selectedModel,
                    width: generation.width,
                    height: generation.height,
                    referenceImage: generation.referenceImage,
                    libId: generation.libId,
                    userEmail: currentUser?.email
                }),
            })

            const responseData = await response.json()

            if (response.ok) {
                toast.success('Regenerating image...')
                upsertGeneration(generation.libId, { status: 'generating' })
                fetchUserPlan()
            } else {
                if (responseData.limitExceeded) {
                    toast.error(`${responseData.details}`)
                    fetchUserPlan()
                } else {
                    throw new Error(responseData.error || 'Failed to regenerate image')
                }
            }
        } catch (error) {
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

        const dimensions = getRatioDimensions(selectedRatio)
        const width = dimensions.width
        const height = dimensions.height
        const modelToUse = selectedModel || 'provider-4/flux-schnell'
        const aspectRatio = selectedRatio
        const newLibId = uuidv4()

        upsertGeneration(newLibId, {
            prompt,
            selectedModel: modelToUse,
            width,
            height,
            aspectRatio,
            status: 'generating'
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
                    model: modelToUse,
                    width,
                    height,
                    referenceImage: null,
                    libId: newLibId,
                    userEmail: currentUser?.email
                }),
            })

            const responseData = await response.json()

            if (response.ok) {
                fetchUserPlan()
                fetchGenerationData(newLibId)
            } else {
                const message = responseData?.details || responseData?.error || 'Failed to generate image'
                toast.error(message)
                upsertGeneration(newLibId, { status: 'failed', errorMessage: message })
                if (responseData?.limitExceeded) {
                    fetchUserPlan()
                }
            }
        } catch (error) {
            console.error('Error initiating image generation:', error)
            toast.error('Failed to initiate image generation. Please try again.')
            upsertGeneration(newLibId, { status: 'failed', errorMessage: 'Failed to initiate image generation' })
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
            <div className="max-w-6xl mx-auto">
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

                <div className="space-y-10">
                    {generations.map(generation => (
                        <div key={generation.libId} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            <div className="lg:col-span-3">
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900">
                                    {generation?.status === 'generating' ? (
                                        <div className="aspect-square flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="animate-spin w-12 h-12 border-2 border-slate-300 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-300 rounded-full mx-auto mb-4"></div>
                                                <p className="text-slate-600 dark:text-slate-400 text-sm">Creating image...</p>
                                                {generation?.prompt && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-3 px-4">
                                                        "{generation.prompt.substring(0, 100)}{generation.prompt.length > 100 ? '...' : ''}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : generation?.status === 'completed' && generation?.generatedImageUrl ? (
                                        <img
                                            src={generation.generatedImageUrl}
                                            alt="Generated"
                                            className="w-full h-auto"
                                        />
                                    ) : generation?.status === 'failed' ? (
                                        <div className="aspect-square flex items-center justify-center">
                                            <div className="text-center">
                                                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                                <p className="text-slate-900 dark:text-white font-medium">Generation Failed</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                                    {generation.errorMessage || 'Unknown error'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-square flex items-center justify-center">
                                            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Details</h3>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Prompt</p>
                                            <p className="text-slate-900 dark:text-white">{generation?.prompt || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Model</p>
                                            <p className="text-slate-900 dark:text-white">
                                                {generation?.selectedModel === 'chatboxai' ? 'ChatBoxAI v1.0' : 
                                                 generation?.selectedModel?.includes('imagen') ? 'Google Imagen' : 
                                                 generation?.selectedModel?.includes('flux') ? 'Flux Schnell' :
                                                 generation?.selectedModel?.includes('dall-e') ? 'DALL-E 2' :
                                                 generation?.selectedModel?.includes('qwen') ? 'Qwen Image' :
                                                 generation?.selectedModel || '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Ratio</p>
                                            <p className="text-slate-900 dark:text-white">
                                                {generation?.aspectRatio || '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Size</p>
                                            <p className="text-slate-900 dark:text-white">
                                                {generation?.width}×{generation?.height}
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
                                            disabled={regeneratingId === generation.libId || (!planLoading && userPlan && !userPlan?.limits?.canGenerate)}
                                            className="w-full cursor-pointer justify-start"
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${regeneratingId === generation.libId ? 'animate-spin' : ''}`} />
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
                                        disabled={regeneratingId === generation.libId}
                                        className="w-full cursor-pointer"
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${regeneratingId === generation.libId ? 'animate-spin' : ''}`} />
                                        Try Again
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-20">
                <div className="w-full max-w-3xl">
                    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[oklch(0.3092_0_0)] rounded-2xl shadow-lg p-3">
                        {/* Aspect Ratio Selection */}
                        <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {ASPECT_RATIOS.map((ratio) => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => setSelectedRatio(ratio.value)}
                                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                                            selectedRatio === ratio.value
                                                ? 'dark:bg-[oklch(0.3092_0_0)] text-white'
                                                : 'bg-slate-100 dark:bg-[oklch(0.209_0_0)] text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer'
                                        }`}
                                    >
                                        {ratio.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-end gap-3">
                            <textarea
                                value={newPrompt}
                                onChange={(e) => setNewPrompt(e.target.value)}
                                onKeyDown={handlePromptKeyDown}
                                placeholder="Describe the image you want to generate..."
                                className="w-full p-2 outline-none resize-none min-h-11 text-sm md:text-base leading-relaxed scrollbar-hide overflow-hidden bg-transparent text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-300"
                                rows={1}
                            />
                            <DropdownMenu>
                                <DropdownMenuTrigger className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-10 w-10 p-0 shrink-0 cursor-pointer relative'>
                                    <Cpu className='text-gray-500 dark:text-gray-400 w-4 h-4' />
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
                            <Button
                                size="sm"
                                className="flex items-center cursor-pointer h-10 w-10 p-0 shrink-0"
                                onClick={handleNewGeneration}
                                disabled={isSubmittingPrompt || !newPrompt.trim()}
                            >
                                {isSubmittingPrompt ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}