'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { toast } from 'react-toastify'

export default function PreviewPage({ params: paramsPromise }) {
    const [params, setParams] = useState(null)
    const [projectId, setProjectId] = useState(null)
    const [versionId, setVersionId] = useState(null)
    const iframeRef = useRef(null)
    const [loading, setLoading] = useState(true)
    const [code, setCode] = useState(null)
    const [error, setError] = useState(null)

    // Unwrap params Promise
    useEffect(() => {
        paramsPromise.then((p) => {
            setParams(p)
            setProjectId(p.projectId)
            setVersionId(p.versionId)
        })
    }, [paramsPromise])

    useEffect(() => {
        if (!projectId) return

        const fetchCode = async () => {
            try {
                const response = await fetch(`/api/website-builder/project/${projectId}`)
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch project')
                }

                // If versionId is specified, find that version's code
                if (versionId && data.versions) {
                    const version = data.versions.find(v => v.id === versionId)
                    if (version) {
                        setCode(version.code)
                    } else {
                        throw new Error('Version not found')
                    }
                } else {
                    // Use current code
                    setCode(data.project.current_code)
                }

                setLoading(false)
            } catch (err) {
                console.error('Error fetching code:', err)
                setError(err.message)
                setLoading(false)
            }
        }

        fetchCode()
    }, [projectId, versionId])

    useEffect(() => {
        if (code && iframeRef.current) {
            try {
                const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
                if (iframeDoc) {
                    iframeDoc.open()
                    iframeDoc.write(code)
                    iframeDoc.close()
                }
            } catch (err) {
                console.error('Error rendering preview:', err)
                toast.error('Failed to render preview')
            }
        }
    }, [code])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <Loader2 className="size-10 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center">
                    <X className="size-16 text-red-500 mx-auto mb-4" />
                    <p className="text-xl text-red-400">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-screen bg-gray-900">
            <iframe
                ref={iframeRef}
                title="Website Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
        </div>
    )
}
