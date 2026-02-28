'use client'

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Loader2 } from 'lucide-react'
import LoaderSteps from './LoaderSteps'
import EditorPanel from './EditorPanel'
import { iframeScript } from './iframeScript'

const BuilderPreview = forwardRef(({ project, isGenerating, device = 'desktop', onChangeDetected }, ref) => {
    const iframeRef = useRef(null)
    const [previewError, setPreviewError] = useState(null)
    const [selectedElement, setSelectedElement] = useState(null)

    useImperativeHandle(ref, () => ({
        getCode: () => {
            // Extract the current HTML from the iframe DOM (includes all EditorPanel changes)
            try {
                if (iframeRef.current?.contentDocument) {
                    const iframeDoc = iframeRef.current.contentDocument
                    let html = iframeDoc.documentElement.outerHTML
                    
                    // Add DOCTYPE if not present
                    if (!html.startsWith('<!DOCTYPE')) {
                        html = '<!DOCTYPE html>\n' + html
                    }
                    
                    // Remove injected preview script and style
                    html = html.replace(/<style id="ai-preview-style">[\s\S]*?<\/style>/g, '')
                    html = html.replace(/<script id="ai-preview-script">[\s\S]*?<\/script>/g, '')
                    
                    return html
                }
            } catch (error) {
                console.error('Error extracting code from iframe:', error)
            }
            
            // Fallback to original code if extraction fails
            let code = project?.current_code || ''
            code = code.replace(/<style id="ai-preview-style">[\s\S]*?<\/style>/g, '')
            code = code.replace(/<script id="ai-preview-script">[\s\S]*?<\/script>/g, '')
            return code
        },
        refresh: () => {
            if (iframeRef.current) {
                // Force iframe reload
                iframeRef.current.src = iframeRef.current.src
            }
        }
    }))

    // Handle messages from iframe for element selection
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data.type === 'ELEMENT_SELECTED') {
                setSelectedElement(event.data.payload)
            } else if (event.data.type === 'CLEAR_SELECTION') {
                setSelectedElement(null)
            } else if (event.data.type === 'LOAD_GOOGLE_FONT') {
                // Forward Google Font loading request to iframe
                if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({
                        type: 'LOAD_GOOGLE_FONT',
                        payload: event.data.payload
                    }, '*')
                }
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    // Function to inject preview script into HTML
    const injectPreview = (html) => {
        if (!html) return ''
        
        // Insert script before closing body tag, or at end if no body tag
        if (html.includes('</body>')) {
            return html.replace('</body>', `${iframeScript}</body>`)
        } else {
            return html + iframeScript
        }
    }

    // Handle element updates from EditorPanel
    const handleUpdate = (updates) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'UPDATE_ELEMENT',
                payload: updates
            }, '*')
            // Notify parent that changes were made
            if (onChangeDetected) {
                onChangeDetected()
            }
        }
    }

    useEffect(() => {
        if (project?.current_code && iframeRef.current) {
            try {
                const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
                if (iframeDoc) {
                    iframeDoc.open()
                    iframeDoc.write(injectPreview(project.current_code))
                    iframeDoc.close()
                    setPreviewError(null)
                }
            } catch (error) {
                console.error('Error rendering preview:', error)
                setPreviewError('Failed to render preview')
            }
        }
    }, [project?.current_code])

    const getDeviceDimensions = () => {
        switch (device) {
            case 'phone':
                return 'max-w-[375px] h-[667px]'
            case 'tablet':
                return 'max-w-[768px] h-[1024px]'
            case 'desktop':
            default:
                return 'w-full h-full'
        }
    }

    if (isGenerating && !project?.current_code) {
        return (
            <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden">
                <LoaderSteps />
            </div>
        )
    }

    if (previewError) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl">
                <div className="text-center text-red-400">
                    <p>{previewError}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden p-4 dark:bg-[oklch(0.3092_0_0)] relative">
            <div className={`bg-white rounded-lg shadow-2xl overflow-hidden transition-all ${getDeviceDimensions()}`}>
                <iframe
                    ref={iframeRef}
                    title="Website Preview"
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                />
            </div>
            
            {selectedElement && (
                <EditorPanel
                    selectedElement={selectedElement}
                    onUpdate={handleUpdate}
                    onClose={() => {
                        setSelectedElement(null)
                        if (iframeRef.current?.contentWindow) {
                            iframeRef.current.contentWindow.postMessage({ type: 'CLEAR_SELECTION_REQUEST' }, '*')
                        }
                    }}
                />
            )}
        </div>
    )
})

BuilderPreview.displayName = 'BuilderPreview'

export default BuilderPreview
