'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { removeBackground } from '@imgly/background-removal'

export default function BackgroundRemovalModal({ imageUrl, onSave, onClose }) {
    const [processing, setProcessing] = useState(false)
    const [processedUrl, setProcessedUrl] = useState(null)
    const [error, setError] = useState(null)

    const handleRemoveBackground = async () => {
        try {
            setProcessing(true)
            setError(null)

            // Remove background using @imgly/background-removal
            const blob = await removeBackground(imageUrl)
            
            // Create object URL for preview
            const url = URL.createObjectURL(blob)
            setProcessedUrl(url)
            
        } catch (error) {
            console.error('Error removing background:', error)
            setError('Failed to remove background. Please try again.')
        } finally {
            setProcessing(false)
        }
    }

    const handleSave = async () => {
        if (!processedUrl) return

        try {
            setProcessing(true)
            
            // Fetch the blob from object URL
            const response = await fetch(processedUrl)
            const blob = await response.blob()
            
            // Create file from blob
            const file = new File([blob], 'background-removed.png', { type: 'image/png' })
            
            await onSave(file)
        } catch (error) {
            console.error('Error saving image:', error)
            setError('Failed to save image. Please try again.')
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Remove Background</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={processing}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-6">
                    {!processedUrl ? (
                        <div className="text-center space-y-4">
                            <img
                                src={imageUrl}
                                alt="Original"
                                className="max-w-full max-h-96 object-contain mx-auto"
                            />
                            {!processing && (
                                <button
                                    onClick={handleRemoveBackground}
                                    className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                                >
                                    Remove Background
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-6 w-full">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-300 text-center">Original</p>
                                <div className="bg-white/10 rounded-lg p-4 flex items-center justify-center min-h-75">
                                    <img
                                        src={imageUrl}
                                        alt="Original"
                                        className="max-w-full max-h-80 object-contain"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-300 text-center">Background Removed</p>
                                <div className="bg-white/10 rounded-lg p-4 flex items-center justify-center min-h-75 bg-[linear-gradient(45deg,#808080_25%,transparent_25%,transparent_75%,#808080_75%,#808080),linear-gradient(45deg,#808080_25%,transparent_25%,transparent_75%,#808080_75%,#808080)] bg-size-[20px_20px] bg-position-[0_0,10px_10px]">
                                    <img
                                        src={processedUrl}
                                        alt="Processed"
                                        className="max-w-full max-h-80 object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {processing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                <p className="text-sm font-medium text-gray-700">
                                    {processedUrl ? 'Saving...' : 'Removing background...'}
                                </p>
                                <p className="text-xs text-gray-500">This may take a few moments</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    {processedUrl && (
                        <button
                            onClick={handleSave}
                            disabled={processing}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Saving...' : 'Use This Image'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
