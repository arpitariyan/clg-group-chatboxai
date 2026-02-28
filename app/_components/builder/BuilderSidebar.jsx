'use client'

import React, { useRef, useState } from 'react'
import { Bot, ChevronDown, Eye, Loader2, Send, User } from 'lucide-react'
import { toast } from 'react-toastify'

export default function BuilderSidebar({ project, isGenerating, onRevision }) {
    const messageRef = useRef(null)
    const [input, setInput] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [expandedMessages, setExpandedMessages] = useState(new Map())

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!input.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            await onRevision(input)
            setInput('')
        } catch (error) {
            console.error('Error submitting revision:', error)
            toast.error('Failed to submit revision')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRollback = async (versionId) => {
        try {
            const confirm = window.confirm('Are you sure you want to rollback to this version?')
            if (!confirm) return

            const response = await fetch(`/api/website-builder/rollback/${project.id}/${versionId}`)
            
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }
            
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to rollback')
            }

            toast.success('Rolled back successfully! Refresh the page to see changes.')
            setTimeout(() => window.location.reload(), 1000)
        } catch (error) {
            console.error('Error rolling back:', error)
            toast.error(`Failed to rollback: ${error.message}`)
        }
    }

    // Helper function to count lines in text
    const countLines = (text) => {
        if (!text) return 0
        return text.split('\n').length
    }

    // Helper function to get first N lines
    const getFirstLines = (text, n) => {
        if (!text) return ''
        return text.split('\n').slice(0, n).join('\n')
    }

    // Toggle message expansion
    const toggleMessageExpansion = (messageId) => {
        setExpandedMessages(prev => {
            const newMap = new Map(prev)
            newMap.set(messageId, !newMap.get(messageId))
            return newMap
        })
    }

    // Combine conversations and versions for timeline display
    const timeline = [
        ...(project.conversations || []).map(c => ({ ...c, type: 'message' })),
        ...(project.versions || []).map(v => ({ ...v, type: 'version' }))
    ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    React.useEffect(() => {
        if (messageRef.current) {
            messageRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [timeline.length, isGenerating])

    return (
        <div className="h-full w-full sm:max-w-sm bg-gray-900 border-gray-800 transition-all overflow-hidden dark:bg-[oklch(0.2478_0_0)]">
            <div className="flex flex-col h-full">
                {/* Messages container */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-3 flex flex-col gap-4 pt-4">
                    {timeline.map((item, index) => {
                        if (item.type === 'message') {
                            const isUser = item.role === 'user'
                            const messageId = item.id || index
                            const isExpanded = expandedMessages.get(messageId) || false
                            const lineCount = countLines(item.content)
                            const shouldTruncate = lineCount > 2 && !isExpanded
                            const displayContent = shouldTruncate 
                                ? getFirstLines(item.content, 2) + '...' 
                                : item.content

                            return (
                                <div key={messageId} className="flex flex-col gap-1">
                                    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        {!isUser && (
                                            <div className="w-8 h-8 rounded-full dark:bg-[oklch(0.3092_0_0)] from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0">
                                                <Bot className="size-5 text-white" />
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] p-2 px-4 dark:bg-[oklch(0.3092_0_0)] rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'dark:bg-[oklch(0.3092_0_0)] from-indigo-500 to-indigo-600 text-white rounded-tr-none' : 'rounded-tl-none bg-gray-800 text-gray-100'}`}>
                                            {displayContent}
                                        </div>
                                        {isUser && (
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                                                <User className="size-5 text-gray-200" />
                                            </div>
                                        )}
                                    </div>
                                    {lineCount > 2 && (
                                        <div className={`flex ${isUser ? 'justify-end pr-11' : 'justify-start pl-11'}`}>
                                            <button
                                                onClick={() => toggleMessageExpansion(messageId)}
                                                className="text-xs cursor-pointer text-gray-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
                                            >
                                                {isExpanded ? 'Show less' : 'Show more'}
                                                <ChevronDown className={`size-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        } else {
                            // Version marker
                            return (
                                <div key={item.id || index} className="w-4/5 mx-auto my-2 p-3 rounded-xl bg-gray-800 text-gray-100 shadow flex flex-col gap-2 dark:bg-[oklch(0.3092_0_0)]">
                                    <div className="text-xs font-medium">
                                        Code updated <br />
                                        <span className="text-gray-500 text-xs font-normal">
                                            {new Date(item.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        {project.current_version_id === item.id ? (
                                            <button className="px-3 py-1 rounded-md text-xs bg-gray-700 cursor-default dark:bg-[oklch(0.2478_0_0)]">Current version</button>
                                        ) : (
                                            <button
                                                onClick={() => handleRollback(item.id)}
                                                className="px-3 py-1 rounded-md cursor-pointer text-xs bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                                            >
                                                Roll back to this version
                                            </button>
                                        )}
                                        <button
                                            onClick={() => window.open(`/website-builder/preview/${project.id}/${item.id}`, '_blank')}
                                            className="p-1 bg-gray-700 hover:bg-indigo-500 transition-colors rounded dark:bg-[oklch(0.2478_0_0)] cursor-pointer"
                                        >
                                            <Eye className="size-5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        }
                    })}
                    {isGenerating && (
                        <div className="flex items-start gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0">
                                <Bot className="size-5 text-white" />
                            </div>
                            <div className="flex gap-1.5 h-full items-end">
                                <span className="size-2 rounded-full animate-bounce bg-gray-600" style={{ animationDelay: '0s' }} />
                                <span className="size-2 rounded-full animate-bounce bg-gray-600" style={{ animationDelay: '0.2s' }} />
                                <span className="size-2 rounded-full animate-bounce bg-gray-600" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messageRef} />
                </div>

                {/* Input area */}
                <form onSubmit={handleSubmit} className="m-3 relative ">
                    <div className="flex items-center gap-2">
                        <textarea
                            onChange={(e) => setInput(e.target.value)}
                            value={input}
                            rows={4}
                            placeholder="Describe changes you want to make..."
                            className="flex-1 p-3 rounded-xl resize-none text-sm outline-none ring ring-gray-700 focus:ring-indigo-500 dark:bg-[oklch(0.3092_0_0)] text-gray-100 placeholder-gray-400 transition-all"
                            disabled={isGenerating || isSubmitting}
                        />
                        <button
                            type="submit"
                            disabled={isGenerating || isSubmitting || !input.trim()}
                            className="absolute cursor-pointer bottom-2.5 right-2.5 rounded-full dark:bg-[oklch(0.2478_0_0)] from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white transition-colors disabled:opacity-60"
                        >
                            {isSubmitting || isGenerating ? (
                                <Loader2 className="size-7 p-1.5 animate-spin text-white" />
                            ) : (
                                <Send className="size-7 p-1.5 text-white" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
