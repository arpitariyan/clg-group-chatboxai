'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Eye, EyeOff, Laptop, PanelLeft, Save, Loader2, Coins, Sparkles, Smartphone, Tablet } from 'lucide-react'
import { toast } from '@/lib/alert'
import Image from 'next/image'
import { useTheme } from '@/contexts/ThemeContext'
import { formatCredits, getCreditStatus, getStatusColor } from '@/lib/creditUtils'
import CreditPurchaseModal from './CreditPurchaseModal'

export default function BuilderNavbar({ project, projectId, device, onDeviceChange, onBack, previewRef, hasUnsavedChanges, onUnsavedChangesReset, onProjectUpdate, credits, onRefreshCredits, userEmail, isMobile, onToggleSidebar }) {
    const [isSaving, setIsSaving] = useState(false)
    const [isPublishing, setIsPublishing] = useState(false)
    const [showPurchaseModal, setShowPurchaseModal] = useState(false)
    const { isDarkMode } = useTheme()

    const handleSave = async () => {
        if (!previewRef?.current) return
        if (!userEmail) {
            toast.error('Please sign in to save changes')
            return
        }

        setIsSaving(true)
        try {
            const code = previewRef.current.getCode()

            const response = await fetch(`/api/website-builder/update/${project.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, userEmail }),
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save website')
            }

            toast.success('Website saved successfully!')
            if (onUnsavedChangesReset) {
                onUnsavedChangesReset()
            }
            if (onProjectUpdate) {
                await onProjectUpdate()
            }
        } catch (error) {
            console.error('Error saving:', error)
            toast.error('Failed to save website')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDownload = () => {
        const code = previewRef?.current?.getCode() || project?.current_code
        if (!code) {
            toast.error('No code to download')
            return
        }

        const element = document.createElement('a')
        const file = new Blob([code], { type: 'text/html' })
        const url = URL.createObjectURL(file)
        element.href = url
        element.download = `${project.project_name || 'website'}.html`
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        URL.revokeObjectURL(url)
        toast.success('Website downloaded!')
    }

    const handlePublishToggle = async () => {
        setIsPublishing(true)
        try {
            if (!userEmail) {
                toast.error('Please sign in to publish')
                return
            }

            const response = await fetch(`/api/website-builder/publish/${project.id}?userEmail=${encodeURIComponent(userEmail)}`)
            
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }
            
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to toggle publish status')
            }

            toast.success(data.message)
            // Reload to update publish status
            setTimeout(() => window.location.reload(), 1000)
        } catch (error) {
            console.error('Error publishing:', error)
            toast.error(`Failed to publish: ${error.message}`)
        } finally {
            setIsPublishing(false)
        }
    }

    const handleUpdate = async () => {
        setIsPublishing(true)
        try {
            if (!userEmail) {
                toast.error('Please sign in to update changes')
                return
            }

            const code = previewRef?.current?.getCode() || project?.current_code
            if (!code) {
                toast.error('No code to update')
                return
            }

            const response = await fetch(`/api/website-builder/update/${project.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, userEmail }),
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update website')
            }

            toast.success(data.message)
            // Reset unsaved changes state
            if (onUnsavedChangesReset) {
                onUnsavedChangesReset()
            }
            // Refresh project data
            if (onProjectUpdate) {
                await onProjectUpdate()
            }
        } catch (error) {
            console.error('Error updating:', error)
            toast.error(`Failed to update: ${error.message}`)
        } finally {
            setIsPublishing(false)
        }
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-3 md:px-5 py-2.5 bg-gray-900 border-b border-gray-800 shadow-sm no-scrollbar dark:bg-[oklch(0.2478_0_0)]">
            {/* Left - Logo and Project Name */}
            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto md:min-w-0 min-w-0">
                {isMobile && (
                    <button
                        type="button"
                        onClick={onToggleSidebar}
                        className="inline-flex items-center justify-center size-9 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white transition-colors"
                        title="Open revisions"
                    >
                        <PanelLeft size={16} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => {
                        if (onBack) {
                            onBack()
                            return
                        }
                        window.location.href = '/app'
                    }}
                    className="inline-flex items-center cursor-pointer gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white transition-colors"
                    title="Back to Home"
                >
                    <ArrowLeft size={14} />
                    <span className="hidden sm:inline">Back</span>
                </button>
                <Link href="/app" className="transition-opacity hover:opacity-80 duration-200">
                    <Image
                        src={isDarkMode ? "/Chatboxai_logo_main_2.png" : "/Chatboxai_logo_main.png"}
                        alt="logo"
                        width={120}
                        height={40}
                        className="h-6 w-auto cursor-pointer"
                    />
                </Link>
                <div className="max-w-40 sm:max-w-xs ml-1 sm:ml-2 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold capitalize truncate text-white">{project?.project_name || 'Untitled Project'}</p>
                    {/* <p className="text-sm text-gray-400 truncate">Lib ID: {project?.id || projectId || 'N/A'}</p> */}
                </div>
            </div>

            {/* Middle - Device Toggle */}
            <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-gray-900/50 shadow-inner w-fit">
                <Smartphone
                    onClick={() => onDeviceChange('phone')}
                    className={`size-8 p-1.5 rounded-md cursor-pointer transition-all duration-200 ${
                        device === 'phone' 
                            ? 'bg-gray-700 text-white shadow-sm' 
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                    title="Mobile View"
                />
                <Tablet
                    onClick={() => onDeviceChange('tablet')}
                    className={`size-8 p-1.5 rounded-md cursor-pointer transition-all duration-200 ${
                        device === 'tablet' 
                            ? 'bg-gray-700 text-white shadow-sm' 
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                    title="Tablet View"
                />
                <Laptop
                    onClick={() => onDeviceChange('desktop')}
                    className={`size-8 p-1.5 rounded-md cursor-pointer transition-all duration-200 ${
                        device === 'desktop' 
                            ? 'bg-gray-700 text-white shadow-sm' 
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                    title="Desktop View"
                />
            </div>

            {/* Right - Credits and Actions */}
            <div className="flex items-center justify-start md:justify-end gap-2 flex-wrap flex-1 text-xs sm:text-sm w-full">
                {/* Credit Display */}
                {credits && (
                    <div className="flex items-center gap-2">
                        <button 
                            className={`group relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md font-medium ${
                                getCreditStatus(credits.total, credits.isPro) === 'low' || getCreditStatus(credits.total, credits.isPro) === 'empty'
                                    ? 'bg-orange-600/10 border-orange-500/40 hover:border-orange-500/60 hover:bg-orange-600/20 text-orange-300'
                                    : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 text-white'
                            }`}
                            onClick={() => setShowPurchaseModal(true)}
                            title="Click to buy credits"
                        >
                            <Coins className={`size-4 transition-transform duration-200 group-hover:scale-110 ${
                                getCreditStatus(credits.total, credits.isPro) === 'low' || getCreditStatus(credits.total, credits.isPro) === 'empty'
                                    ? 'text-orange-400'
                                    : 'text-indigo-400'
                            }`} />
                            <div className="flex items-center gap-1.5">
                                <span className={`font-bold ${
                                    getCreditStatus(credits.total, credits.isPro) === 'low' || getCreditStatus(credits.total, credits.isPro) === 'empty'
                                        ? 'text-orange-300'
                                        : 'text-white'
                                }`}>
                                    {formatCredits(credits.total)}
                                </span>
                                <span className="text-gray-400">credits</span>
                            </div>
                            
                            {/* Tooltip */}
                            <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-10">
                                <div className={`text-white text-xs rounded-lg p-3 shadow-xl border whitespace-nowrap ${
                                    getCreditStatus(credits.total, credits.isPro) === 'low' || getCreditStatus(credits.total, credits.isPro) === 'empty'
                                        ? 'bg-orange-900/95 border-orange-500/50 shadow-orange-500/20'
                                        : 'bg-gray-800 border-gray-700'
                                }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles className={`size-3 ${
                                            getCreditStatus(credits.total, credits.isPro) === 'low' || getCreditStatus(credits.total, credits.isPro) === 'empty'
                                                ? 'text-orange-400'
                                                : 'text-indigo-400'
                                        }`} />
                                        <span className="font-medium">Weekly: {credits.weekly}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Coins className={`size-3 ${
                                            getCreditStatus(credits.total, credits.isPro) === 'low' || getCreditStatus(credits.total, credits.isPro) === 'empty'
                                                ? 'text-orange-300'
                                                : 'text-green-400'
                                        }`} />
                                        <span className="font-medium">Purchased: {credits.purchased}</span>
                                    </div>
                                    <div className={`mt-2 pt-2 border-t ${
                                        getCreditStatus(credits.total, credits.isPro) === 'low' || getCreditStatus(credits.total, credits.isPro) === 'empty'
                                            ? 'border-orange-700 text-orange-300'
                                            : 'border-gray-700 text-gray-400'
                                    }`}>
                                        Click to buy more →
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                )}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="group cursor-pointer bg-gray-800 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 flex items-center gap-2 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md font-medium dark:bg-[oklch(0.2478_0_0)] dark:border-gray-700"
                    aria-label="Save website"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} className="group-hover:scale-110 transition-transform duration-200" />}
                    <span className="hidden sm:inline">Save</span>
                </button>

                <button
                    onClick={() => window.open(`/website-builder/preview/${project.id}`, '_blank')}
                    className="group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg cursor-pointer border border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 text-white transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                    aria-label="Preview website"
                >
                    <Eye size={16} className="group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden sm:inline">Preview</span>
                </button>

                <button
                    onClick={handleDownload}
                    className="group bg-linear-to-br from-blue-700 to-blue-600 cursor-pointer hover:from-blue-600 hover:to-blue-500 text-white px-3 sm:px-4 py-2 flex items-center gap-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-blue-500/20 transform hover:scale-[1.02] active:scale-[0.98] font-medium"
                    aria-label="Download website"
                >
                    <Download size={16} className="group-hover:translate-y-0.5 transition-transform duration-200" />
                    <span className="hidden sm:inline">Download</span>
                </button>

                <button
                    onClick={hasUnsavedChanges ? handleUpdate : handlePublishToggle}
                    disabled={isPublishing}
                    className={`group ${
                        hasUnsavedChanges
                            ? 'bg-linear-to-br from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 shadow-blue-500/20'
                            : project?.is_published 
                                ? 'bg-linear-to-br from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 shadow-green-500/20' 
                                : 'bg-linear-to-br from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 shadow-indigo-500/20'
                    } cursor-pointer text-white px-3 sm:px-4 py-2 flex items-center gap-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium`}
                    aria-label={hasUnsavedChanges ? 'Update website' : project?.is_published ? 'Unpublish website' : 'Publish website'}
                >
                    {isPublishing ? (
                        <Loader2 className="animate-spin" size={16} />
                    ) : hasUnsavedChanges ? (
                        <Save size={16} className="group-hover:scale-110 transition-transform duration-200" />
                    ) : project?.is_published ? (
                        <EyeOff size={16} className="group-hover:scale-110 transition-transform duration-200" />
                    ) : (
                        <Eye size={16} className="group-hover:scale-110 transition-transform duration-200" />
                    )}
                    <span className="hidden sm:inline">{isPublishing ? 'Processing...' : hasUnsavedChanges ? 'Update' : project?.is_published ? 'Unpublish' : 'Publish'}</span>
                </button>
            </div>

            {/* Credit Purchase Modal */}
            <CreditPurchaseModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                onSuccess={() => {
                    if (onRefreshCredits) {
                        onRefreshCredits()
                    }
                    toast.success('Credits added successfully!')
                }}
            />
        </div>
    )
}
