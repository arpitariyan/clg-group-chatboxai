'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { Loader2Icon } from 'lucide-react'
import BuilderSidebar from '@/app/_components/builder/BuilderSidebar'
import BuilderPreview from '@/app/_components/builder/BuilderPreview'
import BuilderNavbar from '@/app/_components/builder/BuilderNavbar'
import CreditInsufficientModal from '@/app/_components/builder/CreditInsufficientModal'
import CreditPurchaseModal from '@/app/_components/builder/CreditPurchaseModal'
import { useAuth } from '@/contexts/AuthContext'
import { useCreditManager } from '@/hooks/useCreditManager'

export default function WebsiteBuilderPage({ params: paramsPromise }) {
    const [projectId, setProjectId] = useState(null)
    const router = useRouter()
    const { currentUser } = useAuth()
    const previewRef = useRef(null)

    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [device, setDevice] = useState('desktop')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [showInsufficientModal, setShowInsufficientModal] = useState(false)
    const [showPurchaseModal, setShowPurchaseModal] = useState(false)

    // Credit management
    const { credits, refreshCredits, hasCredits, loading: creditsLoading } = useCreditManager()

    // Unwrap params Promise
    useEffect(() => {
        paramsPromise.then((p) => {
            setProjectId(p.projectId)
        })
    }, [paramsPromise])

    // Fetch project data
    const fetchProject = async () => {
        if (!projectId) return
        
        try {
            const response = await fetch(`/api/website-builder/project/${projectId}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch project')
            }

            setProject(data.project)
            setIsGenerating(!data.project.current_code)
            setLoading(false)
        } catch (error) {
            console.error('Error fetching project:', error)
            toast.error(`Failed to load project: ${error.message}`)
            setLoading(false)
        }
    }

    // Handle revision submission
    const handleRevision = async (message) => {
        // Check credits before making revision
        if (!hasCredits(1)) {
            setShowInsufficientModal(true)
            return
        }

        try {
            setIsGenerating(true)

            // Start polling for updates
            const pollInterval = setInterval(fetchProject, 5000)

            const response = await fetch(`/api/website-builder/revision/${projectId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            })

            const data = await response.json()

            if (!response.ok) {
                // Handle insufficient credits error
                if (response.status === 402) {
                    setShowInsufficientModal(true)
                    toast.error(data.message || 'Insufficient credits')
                } else {
                    throw new Error(data.error || 'Failed to generate revision')
                }
                clearInterval(pollInterval)
                setIsGenerating(false)
                return
            }

            // Refresh credits after successful operation
            await refreshCredits()

            // Fetch updated project
            await fetchProject()
            clearInterval(pollInterval)
            setIsGenerating(false)
            toast.success('Website updated!')
        } catch (error) {
            console.error('Error generating revision:', error)
            toast.error(`Failed to update website: ${error.message}`)
            setIsGenerating(false)
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

    // Poll while generating
    useEffect(() => {
        if (project && !project.current_code) {
            const pollInterval = setInterval(fetchProject, 10000)
            return () => clearInterval(pollInterval)
        }
    }, [project])

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
                device={device}
                onDeviceChange={setDevice}
                previewRef={previewRef}
                hasUnsavedChanges={hasUnsavedChanges}
                onUnsavedChangesReset={() => setHasUnsavedChanges(false)}
                onProjectUpdate={fetchProject}
                credits={credits}
                onRefreshCredits={refreshCredits}
            />

            {/* Main Content: Sidebar + Preview */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <BuilderSidebar
                    project={project}
                    isGenerating={isGenerating}
                    onRevision={handleRevision}
                />

                {/* Right Preview */}
                <div className="flex-1 p-2 pl-0 overflow-hidden dark:bg-[oklch(0.3092_0_0)]">
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
