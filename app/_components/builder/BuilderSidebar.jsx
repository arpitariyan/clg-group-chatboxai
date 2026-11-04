'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Bot, ChevronDown, ChevronRight, Eye, Loader2, Send, User,
    FileText, ListChecks, CheckCircle2, Circle, AlertCircle,
    Layers, Code2, Palette, Zap, Pencil, Check, X
} from '@/components/ui/animated-icon'
import { toast } from '@/lib/alert'
import { authFetch } from '@/lib/auth-fetch'

function toDisplayText(value) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)

    if (typeof value === 'object') {
        // Try message first (most common case)
        if (typeof value.message === 'string' && value.message.trim()) {
            return value.message
        }
        // Try error, msg, or text fields
        if (typeof value.error === 'string' && value.error.trim()) {
            return value.error
        }
        if (typeof value.msg === 'string' && value.msg.trim()) {
            return value.msg
        }
        if (typeof value.text === 'string' && value.text.trim()) {
            return value.text
        }
        // Extract all string values and join them
        const strings = Object.values(value)
            .filter(v => typeof v === 'string' && v.trim().length > 0)
            .map(v => v.trim())
            .slice(0, 3) // Max 3 strings
        if (strings.length > 0) {
            return strings.join(' — ')
        }
        return 'Unknown error occurred'
    }

    return String(value)
}

// ── PRD Card ────────────────────────────────────────────────────────────────
function PRDCard({ prd, onApprovePlan, isGenerating }) {
    const [expanded, setExpanded] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [planData, setPlanData] = useState(() => ({
        projectName: prd?.projectName || '',
        description: prd?.description || '',
        primaryColor: prd?.designSystem?.primaryColor || '',
        style: prd?.designSystem?.style || 'modern',
        theme: prd?.designSystem?.theme || 'dark'
    }))

    React.useEffect(() => {
        setPlanData({
            projectName: prd?.projectName || '',
            description: prd?.description || '',
            primaryColor: prd?.designSystem?.primaryColor || '',
            style: prd?.designSystem?.style || 'modern',
            theme: prd?.designSystem?.theme || 'dark'
        })
    }, [prd])

    const typeIcon = {
        modern: <Palette className="size-3" />,
        minimal: <Layers className="size-3" />,
        bold: <Zap className="size-3" />,
    }

    const currentApprovedPlan = {
        ...prd,
        projectName: planData.projectName,
        description: planData.description,
        designSystem: {
            ...(prd?.designSystem || {}),
            primaryColor: planData.primaryColor,
            style: planData.style,
            theme: planData.theme
        }
    }

    return (
        <div className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-1.5 px-3 py-2.5 hover:bg-indigo-500/10 transition-colors">
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <FileText className="size-3.5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-indigo-300">Product Requirements Document</p>
                        <p className="text-2.75 text-gray-400 truncate">{planData.projectName || prd?.projectName}</p>
                    </div>
                    <ChevronDown className={`size-3.5 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && !isEditing && (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-2.5 text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors cursor-pointer"
                        title="Edit plan specifications before approving"
                    >
                        <Pencil className="size-2.5" />
                        <span>Edit</span>
                    </button>
                )}
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-3 pb-3 space-y-2.5 border-t border-indigo-500/20 pt-2.5">
                    {isEditing ? (
                        <div className="space-y-2.5 bg-gray-900/60 p-2.5 rounded-lg border border-indigo-500/20">
                            <div>
                                <label className="block text-2.25 uppercase font-semibold text-gray-400 mb-1">Project Name</label>
                                <input
                                    type="text"
                                    value={planData.projectName}
                                    onChange={e => setPlanData(prev => ({ ...prev, projectName: e.target.value }))}
                                    className="w-full text-xs px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-700 text-white focus:border-indigo-500 outline-none"
                                    placeholder="Project Name"
                                />
                            </div>
                            <div>
                                <label className="block text-2.25 uppercase font-semibold text-gray-400 mb-1">Goals & Description</label>
                                <textarea
                                    value={planData.description}
                                    onChange={e => setPlanData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full text-xs px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-700 text-gray-200 focus:border-indigo-500 outline-none resize-none"
                                    placeholder="What should this website build?"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-2.25 uppercase font-semibold text-gray-400 mb-1">Accent Color</label>
                                    <input
                                        type="text"
                                        value={planData.primaryColor}
                                        onChange={e => setPlanData(prev => ({ ...prev, primaryColor: e.target.value }))}
                                        className="w-full text-xs px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-700 text-gray-200 focus:border-indigo-500 outline-none font-mono"
                                        placeholder="#6366f1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-2.25 uppercase font-semibold text-gray-400 mb-1">Style</label>
                                    <select
                                        value={planData.style}
                                        onChange={e => setPlanData(prev => ({ ...prev, style: e.target.value }))}
                                        className="w-full text-xs px-2 py-1.5 rounded-md bg-gray-950 border border-gray-700 text-gray-200 focus:border-indigo-500 outline-none"
                                    >
                                        <option value="modern">Modern</option>
                                        <option value="minimal">Minimal</option>
                                        <option value="bold">Bold</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPlanData({
                                            projectName: prd?.projectName || '',
                                            description: prd?.description || '',
                                            primaryColor: prd?.designSystem?.primaryColor || '',
                                            style: prd?.designSystem?.style || 'modern',
                                            theme: prd?.designSystem?.theme || 'dark'
                                        })
                                        setIsEditing(false)
                                    }}
                                    className="px-2.5 py-1 rounded text-2.5 border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false)
                                        toast.success('Plan updated!')
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded text-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                                >
                                    <Check className="size-2.5" />
                                    <span>Done</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Description */}
                            <p className="text-2.75 text-gray-300 leading-relaxed">{planData.description || prd?.description}</p>

                            {/* Design system */}
                            <div className="flex flex-wrap gap-1.5">
                                {planData.primaryColor && (
                                    <span className="px-2 py-0.5 rounded-full text-2.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                                        {planData.primaryColor}
                                    </span>
                                )}
                                {planData.style && (
                                    <span className="px-2 py-0.5 rounded-full text-2.5 bg-purple-500/15 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                                        {typeIcon[planData.style] || <Palette className="size-3" />}
                                        {planData.style}
                                    </span>
                                )}
                                {planData.theme && (
                                    <span className="px-2 py-0.5 rounded-full text-2.5 bg-gray-600/30 text-gray-300 border border-gray-600/30">
                                        {planData.theme} theme
                                    </span>
                                )}
                            </div>

                            {/* Pages */}
                            {prd?.pages?.length > 0 && (
                                <div>
                                    <p className="text-2.5 font-semibold text-gray-500 uppercase tracking-wider mb-1">Pages</p>
                                    <div className="space-y-1">
                                        {prd.pages.map((page, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className="text-2.5 text-indigo-400 font-mono mt-px shrink-0">{page.route}</span>
                                                <span className="text-2.75 text-gray-300 leading-tight">{page.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Components */}
                            {prd?.components?.length > 0 && (
                                <div>
                                    <p className="text-2.5 font-semibold text-gray-500 uppercase tracking-wider mb-1">Components</p>
                                    <div className="flex flex-wrap gap-1">
                                        {prd.components.map((comp, i) => (
                                            <span key={i} className="px-1.5 py-0.5 rounded text-2.5 bg-gray-700/50 text-gray-300 border border-gray-600/30 flex items-center gap-1">
                                                <Code2 className="size-2.5" />
                                                {comp.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Approve & Build Plan Action */}
                            {onApprovePlan && (
                                <button
                                    type="button"
                                    onClick={() => onApprovePlan(currentApprovedPlan)}
                                    disabled={isGenerating}
                                    className="w-full mt-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <Zap className="size-3" />
                                    Approve &amp; Build Plan
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Task List Card ───────────────────────────────────────────────────────────
function TaskListCard({ tasks, taskStatuses }) {
    const [expanded, setExpanded] = useState(true)

    const getIcon = (taskId) => {
        const status = taskStatuses[taskId]
        if (status === 'done') return <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
        if (status === 'running') return <Loader2 className="size-3.5 text-indigo-400 animate-spin shrink-0" />
        if (status === 'error') return <AlertCircle className="size-3.5 text-red-400 shrink-0" />
        return <Circle className="size-3.5 text-gray-600 shrink-0" />
    }

    const doneCount = Object.values(taskStatuses).filter(s => s === 'done').length
    const totalCount = tasks.length

    return (
        <div className="w-full rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-purple-500/10 transition-colors"
            >
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                    <ListChecks className="size-3.5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-300">Generation Tasks</p>
                    <p className="text-2.75 text-gray-400">{doneCount}/{totalCount} completed</p>
                </div>
                {/* Mini progress bar */}
                <div className="w-12 h-1.5 rounded-full bg-gray-700 overflow-hidden shrink-0">
                    <div
                        className="h-full bg-linear-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                        style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
                    />
                </div>
                <ChevronDown className={`size-3.5 text-gray-500 shrink-0 transition-transform ml-1 ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Task list */}
            {expanded && (
                <div className="px-3 pb-3 border-t border-purple-500/20 pt-2 space-y-1.5">
                    {tasks.map((task) => {
                        const status = taskStatuses[task.id]
                        const isRunning = status === 'running'
                        const isDone = status === 'done'
                        const isError = status === 'error'

                        return (
                            <div
                                key={task.id}
                                className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${isRunning ? 'bg-indigo-500/10 border border-indigo-500/20' :
                                        isDone ? 'bg-emerald-500/5' :
                                            isError ? 'bg-red-500/5' :
                                                'bg-transparent'
                                    }`}
                            >
                                {getIcon(task.id)}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-2.75 font-medium leading-tight ${isDone ? 'text-gray-300 line-through opacity-60' :
                                            isRunning ? 'text-white' :
                                                isError ? 'text-red-300' :
                                                    'text-gray-400'
                                        }`}>
                                        {task.id}. {task.title}
                                    </p>
                                    {task.files?.length > 0 && (
                                        <p className="text-2.5 text-gray-600 mt-0.5 truncate font-mono">
                                            {task.files.join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ── Validation Error Card ────────────────────────────────────────────
function ValidationErrorCard({ errors, onFix, isGenerating }) {
    const [expanded, setExpanded] = useState(true)
    return (
        <div className="w-full rounded-xl border border-red-500/40 bg-red-500/5 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-red-500/10 transition-colors"
            >
                <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="size-3.5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-300">Code Issues Detected</p>
                    <p className="text-2.75 text-gray-400">{errors.length} issue{errors.length !== 1 ? 's' : ''} found</p>
                </div>
                <ChevronDown className={`size-3.5 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {expanded && (
                <div className="px-3 pb-3 border-t border-red-500/20 pt-2.5 space-y-2">
                    {/* Error list */}
                    <div className="space-y-1.5">
                        {errors.map((err, i) => (
                            <div key={i} className="flex items-start gap-2 p-1.5 rounded-lg bg-red-500/8">
                                <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-px">
                                    <span className="text-2.25 font-bold text-red-400">{i + 1}</span>
                                </div>
                                <p className="text-2.75 text-red-200 leading-relaxed">{toDisplayText(err)}</p>
                            </div>
                        ))}
                    </div>
                    {/* Fix button */}
                    <button
                        onClick={() => {
                            const fixMsg = `Fix these code errors in the generated website:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
                            onFix(fixMsg)
                        }}
                        disabled={isGenerating}
                        className="w-full mt-1 py-2 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                        <Zap className="size-3" />
                        Fix this error
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Message Content Parser ───────────────────────────────────────────────────
/**
 * Parses special message formats sent by the generate route.
 * Returns { type, data } where type is one of:
 *   'prd' | 'tasks' | 'task_status' | 'validation_errors' | 'validating' | 'message'
 */
function parseMessage(content) {
    const normalizedContent = toDisplayText(content)
    if (!normalizedContent) return { type: 'message', text: normalizedContent }

    // PRD data embed
    if (normalizedContent.startsWith('📋 **PRD_DATA**\n')) {
        try {
            const jsonStr = normalizedContent.replace('📋 **PRD_DATA**\n', '')
            const prd = JSON.parse(jsonStr)
            return { type: 'prd', prd }
        } catch { /* fall through */ }
    }

    // Task list data embed
    if (normalizedContent.startsWith('📝 **TASKS_DATA**\n')) {
        try {
            const jsonStr = normalizedContent.replace('📝 **TASKS_DATA**\n', '').split('\n\n')[0]
            const tasks = JSON.parse(jsonStr)
            if (Array.isArray(tasks)) {
                return { type: 'tasks', tasks }
            }
        } catch { /* fall through */ }
    }

    // Validation running (show a small indicator instead of raw text)
    if (normalizedContent.startsWith('🔍 **VALIDATING**')) {
        return { type: 'validating' }
    }

    // Validation errors card
    if (normalizedContent.startsWith('🚨 **VALIDATION_ERRORS**')) {
        try {
            const lines = normalizedContent.split('\n')
            const errors = lines
                .filter(l => /^\d+\.\s/.test(l.trim()))
                .map(l => l.replace(/^\d+\.\s*/, '').trim())
                .filter(Boolean)
            if (errors.length > 0) {
                return { type: 'validation_errors', errors }
            }
        } catch { /* fall through */ }
    }

    // Structured build events
    if (normalizedContent.startsWith('📡 **BUILD_EVENT**\n')) {
        try {
            const payload = JSON.parse(normalizedContent.replace('📡 **BUILD_EVENT**\n', ''))
            return { type: 'build_event', payload }
        } catch { /* fall through */ }
    }

    // Task running status
    const runningMatch = normalizedContent.match(/^⚙️ \*\*TASK_RUNNING:(\d+)\*\*/)
    if (runningMatch) {
        return { type: 'task_status', taskId: parseInt(runningMatch[1]), status: 'running', text: normalizedContent.split('\n').slice(1).join('\n') }
    }

    // Task done status
    const doneMatch = normalizedContent.match(/^✅ \*\*TASK_DONE:(\d+)\*\*/)
    if (doneMatch) {
        return { type: 'task_status', taskId: parseInt(doneMatch[1]), status: 'done', text: normalizedContent.split('\n').slice(1).join('\n') }
    }

    // Task error status
    const errorMatch = normalizedContent.match(/^⚠️ \*\*TASK_ERROR:(\d+)\*\*/)
    if (errorMatch) {
        return { type: 'task_status', taskId: parseInt(errorMatch[1]), status: 'error', text: normalizedContent.split('\n').slice(1).join('\n') }
    }

    return { type: 'message', text: normalizedContent }
}

// ── Main BuilderSidebar ──────────────────────────────────────────────────────
export default function BuilderSidebar({ project, isGenerating, onRevision, userEmail, onProjectUpdate, detectedError, onClearError }) {
    const router = useRouter()
    const messageRef = useRef(null)
    const [input, setInput] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [expandedMessages, setExpandedMessages] = useState(new Map())
    const [optimisticMessages, setOptimisticMessages] = useState([])
    const [interactionMode, setInteractionMode] = useState('build') // 'build' | 'plan'

    const handleApprovePlan = async (prd) => {
        if (!prd || isGenerating || isSubmitting) return
        const promptText = `Please implement the approved PRD for ${prd.projectName || 'website'}: ${prd.description || ''}. Build all specified pages, components, and styles according to this plan.`
        await onRevision(promptText)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        let messageText = input.trim()
        if (interactionMode === 'plan') {
            messageText = `[PLAN_REQUEST] Please create a detailed Product Requirements Document (PRD) and staged tasks plan for: ${messageText}`
        }
        const tempId = `opt-${Date.now()}`

        setOptimisticMessages(prev => [...prev, {
            id: tempId,
            $id: tempId,
            role: 'user',
            content: messageText,
            type: 'message',
            created_at: new Date().toISOString()
        }])
        setInput('')

        setIsSubmitting(true)
        try {
            const result = await onRevision(messageText)
            if (result === false) {
                setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
                setInput(messageText)
            }
        } catch (error) {
            console.error('Error submitting revision:', error)
            toast.error('Failed to submit revision')
            setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
            setInput(messageText)
        } finally {
            setIsSubmitting(false)
        }
    }

    React.useEffect(() => {
        if (optimisticMessages.length === 0) return
        const conversations = project?.conversations || []
        const allConfirmed = optimisticMessages.every(optMsg =>
            conversations.some(c => c.role === 'user' && c.content === optMsg.content)
        )
        if (allConfirmed) setOptimisticMessages([])
    }, [project?.conversations])

    const handleRollback = async (versionId) => {
        try {
            const confirm = window.confirm('Are you sure you want to rollback to this version?')
            if (!confirm) return

            if (!userEmail) {
                toast.error('Please sign in to rollback versions')
                return
            }

            const response = await authFetch(`/api/website-builder/rollback/${project.id}/${versionId}?userEmail=${encodeURIComponent(userEmail)}`, {
                method: 'POST'
            })
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }
            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Failed to rollback')

            toast.success('Rolled back successfully!')
            if (onProjectUpdate) await onProjectUpdate({ suppressErrors: true })
            router.refresh()
        } catch (error) {
            toast.error(`Failed to rollback: ${error.message}`)
        }
    }

    const countLines = (text) => (text ? text.split('\n').length : 0)
    const getFirstLines = (text, n) => (text ? text.split('\n').slice(0, n).join('\n') : '')
    const toggleMessageExpansion = (id) => {
        setExpandedMessages(prev => { const m = new Map(prev); m.set(id, !m.get(id)); return m })
    }

    // ── Build timeline ────────────────────────────────────────────────────
    const timeline = [
        ...(project.conversations || []).map(c => ({ ...c, type: 'message' })),
        ...(project.versions || []).map(v => ({ ...v, type: 'version' }))
    ].sort((a, b) =>
        new Date(a.created_at || a.$createdAt || 0) - new Date(b.created_at || b.$createdAt || 0)
    )

    const pendingOptimistic = optimisticMessages.filter(optMsg =>
        !timeline.some(t => t.type === 'message' && t.role === 'user' && t.content === optMsg.content)
    )
    const fullTimeline = [...timeline, ...pendingOptimistic]

    // ── Build PRD & task state from timeline ──────────────────────────────
    let currentPRD = null
    let currentTasks = null
    const taskStatuses = {}

    for (const item of fullTimeline) {
        if (item.type !== 'message' || item.role !== 'assistant') continue
        const parsed = parseMessage(item.content)
        if (parsed.type === 'prd') currentPRD = parsed.prd
        if (parsed.type === 'tasks') {
            currentTasks = parsed.tasks
            // Pre-fill all tasks as pending
            parsed.tasks.forEach(t => { if (!taskStatuses[t.id]) taskStatuses[t.id] = 'pending' })
        }
        if (parsed.type === 'task_status') {
            taskStatuses[parsed.taskId] = parsed.status
        }
    }

    React.useEffect(() => {
        if (messageRef.current) {
            messageRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [fullTimeline.length, isGenerating])

    // ── Render timeline items ─────────────────────────────────────────────
    const renderTimelineItem = (item, index) => {
        if (item.type === 'version') {
            return (
                <div key={item.id || item.$id || index} className="w-4/5 mx-auto my-2 p-3 rounded-xl bg-card border border-border/60 text-card-foreground shadow-xs flex flex-col gap-2">
                    <div className="text-xs font-medium">
                        Code updated <br />
                        <span className="text-gray-500 text-xs font-normal">
                            {new Date(item.created_at || item.$createdAt).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        {project.current_version_id === (item.id || item.$id) ? (
                            <button className="px-3 py-1 rounded-md text-xs bg-muted text-muted-foreground border border-border/60 cursor-default">Current version</button>
                        ) : (
                            <button
                                onClick={() => handleRollback(item.id || item.$id)}
                                className="px-3 py-1 rounded-md cursor-pointer text-xs bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-medium shadow-xs"
                            >
                                Roll back to this version
                            </button>
                        )}
                        <button
                            onClick={() => window.open(`/website-builder/preview/${project.id}/${item.id || item.$id}`, '_blank')}
                            className="p-1.5 bg-muted hover:bg-accent text-foreground transition-colors rounded-lg border border-border/60 cursor-pointer"
                        >
                            <Eye className="size-4" />
                        </button>
                    </div>
                </div>
            )
        }

        // Message item
        const parsed = parseMessage(item.content)
        const isUser = item.role === 'user'
        const messageId = item.id || item.$id || index

        // PRD Card (special rendering)
        if (parsed.type === 'prd') {
            return (
                <div key={messageId} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="size-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <PRDCard prd={parsed.prd} onApprovePlan={handleApprovePlan} isGenerating={isGenerating} />
                    </div>
                </div>
            )
        }

        // Task list card (special rendering) — rendered from task_status messages too
        if (parsed.type === 'tasks') {
            return (
                <div key={messageId} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="size-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <TaskListCard tasks={parsed.tasks} taskStatuses={taskStatuses} />
                    </div>
                </div>
            )
        }

        // Task status updates — skip rendering, they update the task card instead
        if (parsed.type === 'task_status') {
            return null
        }

        // Validation running status — small inline indicator
        if (parsed.type === 'validating') {
            return (
                <div key={messageId} className="flex items-center gap-2 px-1 py-1">
                    <Loader2 className="size-3.5 text-indigo-400 animate-spin shrink-0" />
                    <span className="text-2.75 text-gray-400">Running final code checks...</span>
                </div>
            )
        }

        // Validation errors card — red collapsible card with Fix button
        if (parsed.type === 'validation_errors') {
            return (
                <div key={messageId} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="size-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <ValidationErrorCard
                            errors={parsed.errors}
                            onFix={onRevision}
                            isGenerating={isGenerating}
                        />
                    </div>
                </div>
            )
        }

        // Build events are processed in background and intentionally hidden from sidebar UI
        if (parsed.type === 'build_event') {
            return null
        }

        // Regular message
        const isExpanded = expandedMessages.get(messageId) || false
        const contentText = toDisplayText(item.content)
        const lineCount = countLines(contentText)
        const shouldTruncate = !isUser && lineCount > 3 && !isExpanded
        const displayContent = shouldTruncate ? getFirstLines(contentText, 3) + '...' : contentText

        return (
            <div key={messageId} className="flex flex-col gap-1">
                <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Bot className="size-5" />
                        </div>
                    )}
                    <div className={`max-w-[86%] sm:max-w-[80%] p-2 px-3 sm:px-4 rounded-2xl shadow-xs text-sm leading-relaxed wrap-break-word whitespace-pre-wrap ${isUser ? 'bg-primary text-primary-foreground rounded-tr-none' : 'rounded-tl-none bg-card border border-border/60 text-card-foreground'}`}>
                        {displayContent}
                    </div>
                    {isUser && (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                            <User className="size-5 text-gray-200" />
                        </div>
                    )}
                </div>
                {lineCount > 3 && !isUser && (
                    <div className="flex justify-start pl-11">
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
    }

    return (
        <div className="h-full w-full bg-card border-r border-border/60 transition-all overflow-hidden text-card-foreground">
            <div className="flex flex-col h-full">
                {/* Messages container */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-2.5 sm:px-3 flex flex-col gap-3 pt-4">
                    {fullTimeline.map((item, index) => renderTimelineItem(item, index))}

                    {/* Live task card during generation */}
                    {isGenerating && currentTasks && (
                        <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Bot className="size-4 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <TaskListCard tasks={currentTasks} taskStatuses={taskStatuses} />
                            </div>
                        </div>
                    )}

                    {/* Typing indicator */}
                    {isGenerating && (
                        <div className="flex items-start gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <Bot className="size-5 text-indigo-400" />
                            </div>
                            <div className="flex gap-1.5 h-full items-end py-3">
                                <span className="size-2 rounded-full animate-bounce bg-indigo-500" style={{ animationDelay: '0s' }} />
                                <span className="size-2 rounded-full animate-bounce bg-indigo-400" style={{ animationDelay: '0.2s' }} />
                                <span className="size-2 rounded-full animate-bounce bg-indigo-300" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messageRef} />
                </div>

                {/* Auto-fix Error Banner */}
                {detectedError && !isGenerating && (
                    <div className="mx-3 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="flex items-start gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0 animate-pulse" />
                            <div className="flex-1">
                                <p className="text-xs text-red-300 font-medium leading-relaxed">
                                    {toDisplayText(detectedError)}
                                </p>
                                {detectedError?.type && detectedError?.type !== 'UNKNOWN' && (
                                    <p className="text-2.5 text-red-400/70 mt-0.5">
                                        {detectedError.type.replace(/_/g, ' ')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    const errorMsg = toDisplayText(detectedError);
                                    const errorType = (detectedError?.type || 'RUNTIME_ERROR').replace(/_/g, ' ');
                                    const suggestion = detectedError?.suggestion || '';
                                    const fixMessage = `I detected a ${errorType} error. The error is: "${errorMsg}".${suggestion ? ` Suggestion: ${suggestion}.` : ''} Please regenerate the code to fix this issue.`;
                                    console.log('[Fix Button] Error details:', { errorType, errorMsg, suggestion });
                                    await onRevision(fixMessage);
                                }}
                                disabled={isGenerating || isSubmitting}
                                className="flex-1 py-1.5 px-3 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Fix this error
                            </button>
                            <button
                                onClick={onClearError}
                                className="py-1.5 px-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {/* Suggestion chips */}
                {!isGenerating && (!project?.conversations || project.conversations.length <= 2) && (
                    <div className="flex flex-wrap gap-2 px-3 mb-2">
                        {[
                            "A SaaS landing page",
                            "A portfolio website",
                            "An e-commerce store",
                            "A blog template",
                            "A restaurant menu"
                        ].map((suggestion, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setInput(suggestion)}
                                className="px-2.5 py-1 text-2.75 sm:text-xs bg-gray-800 text-gray-300 rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                {/* Mode Selector: Build vs Plan */}
                <div className="flex items-center justify-between px-3 pt-2">
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50">
                        <button
                            type="button"
                            onClick={() => setInteractionMode('build')}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                                interactionMode === 'build'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Build Mode
                        </button>
                        <button
                            type="button"
                            onClick={() => setInteractionMode('plan')}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 ${
                                interactionMode === 'plan'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <FileText className="size-3" />
                            Plan Mode
                        </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        {interactionMode === 'plan' ? 'Generates PRD plan first' : 'Generates code directly'}
                    </span>
                </div>

                {/* Input area */}
                <form onSubmit={handleSubmit} className="m-2.5 sm:m-3 relative">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                        <textarea
                            onChange={(e) => setInput(e.target.value)}
                            value={input}
                            rows={5}
                            placeholder={
                                interactionMode === 'plan'
                                    ? 'Describe the feature or project requirements you want to plan...'
                                    : 'Describe changes you want to make...'
                            }
                            className="flex-1 p-3 rounded-xl resize-none text-sm sm:text-base outline-none border border-border/60 focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-muted-foreground transition-all min-h-28 sm:min-h-24 sm:pr-12"
                            disabled={isGenerating || isSubmitting}
                        />
                        <button
                            type="submit"
                            disabled={isGenerating || isSubmitting || !input.trim()}
                            className="self-end sm:absolute sm:bottom-2.5 sm:right-2.5 rounded-full bg-primary text-primary-foreground transition-colors disabled:opacity-60"
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
