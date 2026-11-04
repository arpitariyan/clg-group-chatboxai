'use client'

import React, { useState } from 'react'
import { XIcon, SendIcon, SparklesIcon } from '@/components/ui/animated-icon'
import { toast } from '@/lib/alert'

/**
 * DesignUploadModal - Design description input for design-aware code generation
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: () => void
 *   - onUpload: (designDescription) => void | Promise<void>
 *   - isLoading?: boolean
 */
export default function DesignUploadModal({
  isOpen = false,
  onClose = () => {},
  onUpload = async () => {},
  isLoading = false
}) {
  const [designDescription, setDesignDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!designDescription.trim()) {
      toast.error('Please describe your design')
      return
    }

    if (designDescription.trim().length < 20) {
      toast.error('Please provide a more detailed design description (at least 20 characters)')
      return
    }

    setIsSubmitting(true)
    try {
      await onUpload(designDescription)
      // Reset form on success
      setDesignDescription('')
      onClose()
    } catch (error) {
      console.error('Design submission error:', error)
      toast.error(`Failed: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setDesignDescription('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-secondary rounded-lg border border-dark-secondary/50 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-secondary/50 sticky top-0 bg-dark-secondary">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Describe Your Design</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Design Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Design Description
            </label>
            <textarea
              value={designDescription}
              onChange={(e) => setDesignDescription(e.target.value)}
              disabled={isSubmitting || isLoading}
              placeholder="Describe your design intent. Include:
- Colors and theme (dark/light, specific colors like cyan, blue)
- Layout style (modern, minimalist, glassmorphism, neumorphism)
- Typography preferences
- Key components (buttons, cards, headers)
- Pages/sections you need
- Any animations or special effects

Example: 'Dark glassmorphism design with cyan and blue accents. Modern layout with comfortable spacing. Use Inter font for typography. Include buttons, cards, and a hero section.'"
              className="w-full px-4 py-3 bg-dark-bg border border-dark-secondary/30 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none disabled:opacity-50"
              rows="10"
            />
            <p className="text-xs text-gray-500 mt-2">
              Be specific about colors, fonts, spacing, and components. The more detailed, the better!
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded p-3">
            <p className="text-xs text-purple-300">
              ✨ Groq AI will analyze your design description and extract colors, layout, typography, 
              and components. The generated code will match your design specifications.
            </p>
          </div>

          {/* Character Count */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{designDescription.length} characters</span>
            <span className={designDescription.trim().length < 20 ? 'text-amber-400' : 'text-green-400'}>
              {designDescription.trim().length < 20 ? 'Min 20 characters required' : 'Good to go!'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-dark-bg border border-dark-secondary/30 rounded text-sm font-medium text-gray-300 hover:text-white hover:border-dark-secondary/50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={designDescription.trim().length < 20 || isSubmitting || isLoading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 rounded text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <SendIcon className="w-4 h-4" />
                  Generate with Design
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
