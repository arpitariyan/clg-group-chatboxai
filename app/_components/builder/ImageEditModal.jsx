'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export default function ImageEditModal({ imageUrl, onSave, onClose }) {
    const [brightness, setBrightness] = useState(100)
    const [contrast, setContrast] = useState(100)
    const [saturation, setSaturation] = useState(100)
    const [blur, setBlur] = useState(0)
    const [saving, setSaving] = useState(false)

    const filterStyle = {
        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`
    }

    const applyFiltersToImage = async () => {
        try {
            // Create a canvas to apply filters
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
                img.src = imageUrl
            })

            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            
            const ctx = canvas.getContext('2d')
            
            // Apply CSS filters to canvas context
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`
            ctx.drawImage(img, 0, 0)

            // Convert canvas to blob
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create image blob'))
                        return
                    }
                    resolve(blob)
                }, 'image/png')
            })
        } catch (error) {
            console.error('Error applying filters:', error)
            throw error
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const editedBlob = await applyFiltersToImage()
            const editedFile = new File([editedBlob], 'edited-image.png', { type: 'image/png' })
            await onSave(editedFile)
        } catch (error) {
            console.error('Error saving edited image:', error)
            alert('Failed to edit image. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleReset = () => {
        setBrightness(100)
        setContrast(100)
        setSaturation(100)
        setBlur(0)
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Edit Image</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-6">
                    <img
                        src={imageUrl}
                        alt="Preview"
                        style={filterStyle}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>

                {/* Controls */}
                <div className="p-6 border-t border-gray-200 space-y-4">
                    {/* Brightness */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Brightness</label>
                            <span className="text-sm text-gray-600">{brightness}%</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={200}
                            step={1}
                            value={brightness}
                            onChange={(e) => setBrightness(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Contrast</label>
                            <span className="text-sm text-gray-600">{contrast}%</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={200}
                            step={1}
                            value={contrast}
                            onChange={(e) => setContrast(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Saturation</label>
                            <span className="text-sm text-gray-600">{saturation}%</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={200}
                            step={1}
                            value={saturation}
                            onChange={(e) => setSaturation(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Blur */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Blur</label>
                            <span className="text-sm text-gray-600">{blur}px</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={10}
                            step={0.5}
                            value={blur}
                            onChange={(e) => setBlur(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            Reset
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Apply Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
