'use client'

import { useState, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import Cropper from 'react-easy-crop'

export default function ImageCropModal({ imageUrl, onSave, onClose }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [saving, setSaving] = useState(false)

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const createCroppedImage = async () => {
        try {
            setSaving(true)
            
            const image = await createImageElement(imageUrl)
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            // Set canvas size to cropped area
            canvas.width = croppedAreaPixels.width
            canvas.height = croppedAreaPixels.height

            // Draw the cropped image
            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            )

            // Convert canvas to blob
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas is empty'))
                        return
                    }
                    resolve(blob)
                }, 'image/png')
            })
        } catch (error) {
            console.error('Error cropping image:', error)
            throw error
        }
    }

    const createImageElement = (url) => {
        return new Promise((resolve, reject) => {
            const image = new Image()
            image.crossOrigin = 'anonymous'
            image.addEventListener('load', () => resolve(image))
            image.addEventListener('error', (error) => reject(error))
            image.src = url
        })
    }

    const handleSave = async () => {
        try {
            const croppedBlob = await createCroppedImage()
            const croppedFile = new File([croppedBlob], 'cropped-image.png', { type: 'image/png' })
            await onSave(croppedFile)
        } catch (error) {
            console.error('Error saving cropped image:', error)
            alert('Failed to crop image. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Crop Image</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative flex-1 bg-gray-900" style={{ minHeight: '400px' }}>
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={16 / 9}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                    />
                </div>

                {/* Controls */}
                <div className="p-4 border-t border-gray-200 space-y-4">
                    {/* Zoom Control */}
                    <div className="flex items-center gap-4">
                        <ZoomOut className="w-5 h-5 text-gray-600" />
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <ZoomIn className="w-5 h-5 text-gray-600" />
                    </div>

                    {/* Rotation Control */}
                    <div className="flex items-center gap-4">
                        <RotateCw className="w-5 h-5 text-gray-600" />
                        <input
                            type="range"
                            min={0}
                            max={360}
                            step={1}
                            value={rotation}
                            onChange={(e) => setRotation(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm text-gray-600 w-12 text-right">{rotation}°</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
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
                            {saving ? 'Saving...' : 'Apply Crop'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
