'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle2Icon, AlertCircleIcon, Loader2Icon, XCircleIcon } from '@/components/ui/animated-icon'

/**
 * GenerationProgress - Real-time progress display for async website generation
 * 
 * Props:
 *   - status: 'queued' | 'generating' | 'success' | 'error' 
 *   - generation_step: string (e.g., "Building: Header Component")
 *   - progress: number (0-100)
 *   - error_message?: string
 *   - elapsed_time?: number (seconds)
 *   - onDismiss?: () => void
 */
export default function GenerationProgress({
  status = 'queued',
  generation_step = '',
  progress = 0,
  error_message = null,
  elapsed_time = 0,
  onDismiss = null
}) {
  const [showProgress, setShowProgress] = useState(true)
  const [displayTime, setDisplayTime] = useState(elapsed_time)

  // Format elapsed time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Auto-dismiss on success after 2 seconds
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        setShowProgress(false)
        onDismiss?.()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status, onDismiss])

  // Update elapsed time
  useEffect(() => {
    if (status === 'generating' && elapsed_time === 0) {
      const interval = setInterval(() => {
        setDisplayTime((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status, elapsed_time])

  if (!showProgress) return null

  const getStepIcon = () => {
    if (status === 'success') {
      return <CheckCircle2Icon className="w-5 h-5 text-green-500 animate-pulse" />
    }
    if (status === 'error') {
      return <XCircleIcon className="w-5 h-5 text-red-500" />
    }
    if (status === 'generating') {
      return <Loader2Icon className="w-5 h-5 text-blue-500 animate-spin" />
    }
    return <Loader2Icon className="w-5 h-5 text-gray-400 animate-spin" />
  }

  const getStatusText = () => {
    if (status === 'success') return 'Generation Complete'
    if (status === 'error') return 'Generation Failed'
    if (status === 'generating') return 'Generating...'
    return 'Queued'
  }

  const getProgressColor = () => {
    if (status === 'error') return 'bg-red-500'
    if (status === 'success') return 'bg-green-500'
    if (progress >= 70) return 'bg-green-500'
    if (progress >= 40) return 'bg-blue-500'
    return 'bg-amber-500'
  }

  const stepMessages = {
    'Queued': '⏳ Waiting to start...',
    'Detecting': '🔍 Analyzing website type...',
    'Enhancing': '✨ Refining your requirements...',
    'Extracting': '🎨 Analyzing design screenshot...',
    'PRD': '📋 Creating product requirements...',
    'Tasks': '📝 Generating development tasks...',
    'Building': '⚙️ Building components...',
    'Validating': '✅ Validating code...',
    'Saving': '💾 Saving version...',
    'Deploying': '🚀 Deploying to sandbox...',
    'Success': '🎉 Website ready!',
    'Error': '❌ Generation failed'
  }

  // Extract first word from generation_step to find appropriate message
  const stepKey = Object.keys(stepMessages).find(
    (key) => generation_step.toLowerCase().includes(key.toLowerCase())
  ) || 'Generating'

  const displayMessage = stepMessages[stepKey] || stepMessages[status] || generation_step || getStatusText()

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-dark-secondary rounded-lg border border-dark-secondary/50 shadow-2xl overflow-hidden z-40 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-secondary/50">
        {getStepIcon()}
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{getStatusText()}</p>
          <p className="text-xs text-gray-400">{displayMessage}</p>
        </div>
        {status !== 'error' && (
          <button
            onClick={() => setShowProgress(false)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Minimize"
          >
            <span className="text-lg">−</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {status === 'generating' && (
        <div className="px-4 py-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Progress</span>
            <span className="text-xs font-mono text-gray-300">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-dark-bg rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Elapsed: {formatTime(displayTime)}</span>
            <span>Est. 5-10 min total</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {status === 'error' && error_message && (
        <div className="px-4 py-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 flex gap-2">
            <AlertCircleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error_message}</p>
          </div>
          <button
            onClick={() => setShowProgress(false)}
            className="mt-3 w-full px-3 py-2 text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Message */}
      {status === 'success' && (
        <div className="px-4 py-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
            <p className="text-xs text-green-300 text-center">Your website is ready to preview!</p>
          </div>
        </div>
      )}
    </div>
  )
}
