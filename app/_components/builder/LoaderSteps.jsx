'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, FileCode2, Layers, Palette, Zap, Code, Globe } from '@/components/ui/animated-icon'

const DEFAULT_CREATE_STEPS = [
    { icon: Layers, label: 'Analyzing your requirements…', sub: 'Creating Product Requirements Document' },
    { icon: FileCode2, label: 'Planning the project…', sub: 'Generating task list from PRD' },
    { icon: Code, label: 'Writing code…', sub: 'Executing tasks sequentially' },
    { icon: Palette, label: 'Applying design…', sub: 'Tailwind CSS, animations, and polish' },
    { icon: Globe, label: 'Finalizing website…', sub: 'Connecting all pages and components' },
]

const DEFAULT_UPDATE_STEPS = [
    { icon: FileCode2, label: 'Reading your changes…', sub: 'Analyzing revision request' },
    { icon: Code, label: 'Applying modifications…', sub: 'Updating relevant components' },
    { icon: Zap, label: 'Rebuilding components…', sub: 'Ensuring consistency across files' },
    { icon: Globe, label: 'Finalizing updates…', sub: 'Preview will refresh shortly' },
]

// STEP_DURATION controls how long each default step stays visible
// when no real task names are provided
const STEP_DURATION = 30000 // 30s per default step

const LoaderSteps = ({ mode = 'create', taskNames = null, currentTaskIndex = -1 }) => {
    const hasRealTasks = Array.isArray(taskNames) && taskNames.length > 0
    const steps = hasRealTasks
        ? taskNames.map((name, i) => ({ icon: Code, label: name, sub: `Task ${i + 1} of ${taskNames.length}` }))
        : (mode === 'update' ? DEFAULT_UPDATE_STEPS : DEFAULT_CREATE_STEPS)

    const [current, setCurrent] = useState(0)

    // If we have real task progress, follow it; otherwise auto-cycle
    useEffect(() => {
        if (hasRealTasks && currentTaskIndex >= 0) {
            setCurrent(Math.min(currentTaskIndex, steps.length - 1))
        }
    }, [currentTaskIndex, hasRealTasks, steps.length])

    // Reset on mode change
    useEffect(() => {
        setCurrent(0)
    }, [mode])

    // Auto-cycle only when no external task progress provided
    useEffect(() => {
        if (hasRealTasks) return
        const interval = setInterval(() => {
            setCurrent(s => (s + 1) % steps.length)
        }, STEP_DURATION)
        return () => clearInterval(interval)
    }, [steps.length, hasRealTasks])

    const Icon = steps[current]?.icon || Code

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 relative overflow-hidden text-white select-none">
            {/* Background glow */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 via-purple-500/10 to-fuchsia-500/10 blur-3xl animate-pulse" />

            {/* Orb */}
            <div className="relative z-10 w-28 h-28 flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border border-indigo-400/40 animate-ping opacity-30" />
                <div className="absolute inset-3 rounded-full border border-purple-400/20 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-indigo-600/30 to-purple-600/30 backdrop-blur-sm border border-indigo-500/30 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-indigo-300 animate-bounce" />
                </div>
            </div>

            {/* Current step label */}
            <p key={current} className="text-base font-medium text-white/90 tracking-wide transition-all duration-500 text-center px-6 max-w-xs">
                {steps[current]?.label}
            </p>
            <p className="text-xs text-gray-500 mt-1.5 transition-opacity duration-500 text-center px-8 max-w-xs">
                {steps[current]?.sub}
            </p>

            {/* Step progress dots */}
            {steps.length > 1 && (
                <div className="flex items-center gap-1.5 mt-6">
                    {steps.map((_, i) => {
                        const isDone = hasRealTasks ? i < currentTaskIndex : i < current
                        const isActive = i === current
                        return (
                            <div
                                key={i}
                                className={`rounded-full transition-all duration-300 ${
                                    isDone
                                        ? 'w-2 h-2 bg-emerald-500'
                                        : isActive
                                        ? 'w-5 h-2 bg-indigo-500'
                                        : 'w-2 h-2 bg-gray-700'
                                }`}
                            />
                        )
                    })}
                </div>
            )}

            {/* Mode-specific hint */}
            <p className="text-2.75 text-gray-600 mt-5 transition-opacity duration-700">
                {mode === 'update' ? 'Applying your changes…' : 'Building with PRD → Tasks → Code…'}
            </p>

            {/* Task count if we have real tasks */}
            {hasRealTasks && currentTaskIndex >= 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-2.75 text-gray-500">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Task {Math.min(currentTaskIndex + 1, taskNames.length)} of {taskNames.length}</span>
                </div>
            )}
        </div>
    )
}

export default LoaderSteps
