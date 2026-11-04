'use client'
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronRight, Copy, Download, FileCode, Folder, Pencil, Save, X } from '@/components/ui/animated-icon'
import { GitCompare } from 'lucide-react'
import { toast } from '@/lib/alert'

function lang(f) {
    if (f.endsWith('.jsx') || f.endsWith('.js')) return 'javascript'
    if (f.endsWith('.tsx') || f.endsWith('.ts')) return 'typescript'
    if (f.endsWith('.css')) return 'css'
    if (f.endsWith('.json')) return 'json'
    if (f.endsWith('.html')) return 'html'
    return 'plaintext'
}

function buildTree(files) {
    const t = {}
    Object.keys(files).sort().forEach(path => {
        const parts = path.split('/')
        let n = t
        parts.forEach((p, i) => {
            if (i === parts.length - 1) {
                n[p] = { type: 'file', path }
            } else {
                if (!n[p]) n[p] = { type: 'dir', children: {} }
                n = n[p].children
            }
        })
    })
    return t
}

function Node({ name, node, active, onSelect, depth = 0, diffStatus = null }) {
    const [open, setOpen] = useState(depth < 2)
    const pl = `${(depth + 1) * 12}px`
    if (node.type === 'file') {
        const status = diffStatus?.[node.path]
        return (
            <button
                onClick={() => onSelect(node.path)}
                style={{ paddingLeft: pl }}
                className={`w-full text-left flex items-center justify-between gap-1.5 py-1 px-2 text-xs rounded truncate transition-colors ${active === node.path
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
            >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <FileCode className="w-3 h-3 shrink-0 opacity-60" />
                    <span className="truncate">{name}</span>
                </div>
                {status === 'added' && (
                    <span className="text-2 bg-emerald-500/20 text-emerald-300 font-mono font-bold px-1 rounded shrink-0" title="Added in this version">+</span>
                )}
                {status === 'modified' && (
                    <span className="text-2 bg-amber-500/20 text-amber-300 font-mono font-bold px-1 rounded shrink-0" title="Modified in this version">Δ</span>
                )}
            </button>
        )
    }
    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                style={{ paddingLeft: pl }}
                className="w-full text-left flex items-center gap-1 py-1 px-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
                <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
                <Folder className="w-3 h-3 opacity-60 mr-0.5" />
                {name}
            </button>
            {open && Object.entries(node.children).map(([n, nd]) => (
                <Node key={n} name={n} node={nd} active={active} onSelect={onSelect} depth={depth + 1} diffStatus={diffStatus} />
            ))}
        </div>
    )
}

// Lazy Monaco editor loader
function MonacoEditor({ value, language, onChange, readOnly = false }) {
    const containerRef = useRef(null)
    const editorRef = useRef(null)
    const [monacoLoaded, setMonacoLoaded] = useState(false)
    const [loadError, setLoadError] = useState(false)

    useEffect(() => {
        let destroyed = false

        async function loadMonaco() {
            try {
                const monaco = await import('monaco-editor')
                if (destroyed || !containerRef.current) return

                // Dispose previous instance
                if (editorRef.current) {
                    editorRef.current.dispose()
                }

                editorRef.current = monaco.editor.create(containerRef.current, {
                    value: value || '',
                    language: language || 'javascript',
                    theme: 'vs-dark',
                    readOnly,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    padding: { top: 16 },
                    lineNumbers: 'on',
                    scrollbar: { verticalScrollbarSize: 4 },
                    smoothScrolling: true,
                    tabSize: 2,
                    automaticLayout: true,
                })

                editorRef.current.onDidChangeModelContent(() => {
                    if (!readOnly && onChange) onChange(editorRef.current.getValue())
                })

                setMonacoLoaded(true)
            } catch (e) {
                console.warn('Monaco failed to load:', e)
                setLoadError(true)
            }
        }

        loadMonaco()

        return () => {
            destroyed = true
            if (editorRef.current) {
                editorRef.current.dispose()
                editorRef.current = null
            }
        }
    }, [language, readOnly])

    // Sync value changes without re-creating editor
    useEffect(() => {
        if (editorRef.current && monacoLoaded) {
            const current = editorRef.current.getValue()
            if (current !== value) {
                editorRef.current.setValue(value || '')
            }
        }
    }, [value, monacoLoaded])

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({ readOnly })
        }
    }, [readOnly])

    if (loadError) {
        return (
            <textarea
                value={value || ''}
                onChange={e => !readOnly && onChange && onChange(e.target.value)}
                className="w-full h-full bg-gray-950 text-gray-300 font-mono text-xs p-4 resize-none outline-none border-0"
                spellCheck={false}
                readOnly={readOnly}
            />
        )
    }

    return (
        <div className="relative w-full h-full">
            {!monacoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            <div ref={containerRef} className="w-full h-full" />
        </div>
    )
}

// Side-by-side Monaco Diff Editor loader
function MonacoDiffEditor({ originalValue, modifiedValue, language }) {
    const containerRef = useRef(null)
    const diffEditorRef = useRef(null)
    const [monacoLoaded, setMonacoLoaded] = useState(false)
    const [loadError, setLoadError] = useState(false)

    useEffect(() => {
        let destroyed = false

        async function loadMonaco() {
            try {
                const monaco = await import('monaco-editor')
                if (destroyed || !containerRef.current) return

                if (diffEditorRef.current) {
                    diffEditorRef.current.dispose()
                }

                const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
                    theme: 'vs-dark',
                    readOnly: true,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: false },
                    renderSideBySide: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on'
                })

                const originalModel = monaco.editor.createModel(originalValue || '', language || 'javascript')
                const modifiedModel = monaco.editor.createModel(modifiedValue || '', language || 'javascript')
                diffEditor.setModel({
                    original: originalModel,
                    modified: modifiedModel,
                })

                diffEditorRef.current = diffEditor
                setMonacoLoaded(true)
            } catch (e) {
                console.warn('Monaco Diff Editor failed to load:', e)
                setLoadError(true)
            }
        }

        loadMonaco()

        return () => {
            destroyed = true
            if (diffEditorRef.current) {
                diffEditorRef.current.dispose()
                diffEditorRef.current = null
            }
        }
    }, [language])

    useEffect(() => {
        if (diffEditorRef.current && monacoLoaded) {
            const model = diffEditorRef.current.getModel()
            if (model?.original && model.original.getValue() !== originalValue) {
                model.original.setValue(originalValue || '')
            }
            if (model?.modified && model.modified.getValue() !== modifiedValue) {
                model.modified.setValue(modifiedValue || '')
            }
        }
    }, [originalValue, modifiedValue, monacoLoaded])

    if (loadError) {
        return (
            <div className="w-full h-full grid grid-cols-2 gap-2 bg-gray-950 p-3 font-mono text-xs overflow-auto">
                <div className="border border-red-500/30 rounded-lg p-2.5 bg-red-950/20 text-gray-300">
                    <p className="text-red-400 font-semibold mb-2">Previous Version</p>
                    <pre className="whitespace-pre-wrap">{originalValue || '(empty / newly added)'}</pre>
                </div>
                <div className="border border-emerald-500/30 rounded-lg p-2.5 bg-emerald-950/20 text-gray-300">
                    <p className="text-emerald-400 font-semibold mb-2">Current Version</p>
                    <pre className="whitespace-pre-wrap">{modifiedValue || '(empty)'}</pre>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full h-full">
            {!monacoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            <div ref={containerRef} className="w-full h-full" />
        </div>
    )
}

export default function CodePanel({
    files,
    previousFiles = null,
    onChange,
    onSaveCode,
    isSavingCode = false,
    hasUnsavedChanges = false
}) {
    const parsed = (() => {
        try {
            return typeof files === 'string' ? JSON.parse(files) : (files || {})
        } catch {
            return {}
        }
    })()

    const previousParsed = (() => {
        if (!previousFiles) return null
        try {
            return typeof previousFiles === 'string' ? JSON.parse(previousFiles) : previousFiles
        } catch {
            return null
        }
    })()

    const keys = Object.keys(parsed)
    const defaultFile = parsed['src/App.jsx'] !== undefined ? 'src/App.jsx' : (keys[0] || '')
    const [active, setActive] = useState(defaultFile)
    const [editableFile, setEditableFile] = useState('')
    const [showDiff, setShowDiff] = useState(false)

    // Compute diff statuses for file tree
    const diffStatus = (() => {
        if (!previousParsed) return null
        const statusMap = {}
        for (const path of keys) {
            if (previousParsed[path] === undefined) {
                statusMap[path] = 'added'
            } else if (previousParsed[path] !== parsed[path]) {
                statusMap[path] = 'modified'
            } else {
                statusMap[path] = 'unchanged'
            }
        }
        return statusMap
    })()

    // Update active file if it no longer exists in new files
    const currentFile = parsed[active] !== undefined ? active : (keys[0] || '')
    const isEditable = editableFile === currentFile

    const handleToggleEdit = () => {
        if (!currentFile) return
        if (isEditable) {
            setEditableFile('')
            toast.info('Edit mode disabled')
            return
        }
        setEditableFile(currentFile)
        setShowDiff(false)
        toast.info(`Edit mode enabled for ${currentFile}`)
    }

    const handleCopyFile = async () => {
        const content = parsed[currentFile]
        if (content === undefined) {
            toast.error('No file content to copy')
            return
        }

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(content)
            } else {
                const textarea = document.createElement('textarea')
                textarea.value = content
                textarea.setAttribute('readonly', '')
                textarea.style.position = 'fixed'
                textarea.style.opacity = '0'
                document.body.appendChild(textarea)
                textarea.select()
                const copied = document.execCommand('copy')
                document.body.removeChild(textarea)

                if (!copied) {
                    throw new Error('Copy command failed')
                }
            }

            toast.success(`Copied ${currentFile}`)
        } catch (error) {
            console.error('Copy failed:', error)
            toast.error('Failed to copy file code')
        }
    }

    const handleDownloadFile = () => {
        const content = parsed[currentFile]
        if (content === undefined) {
            toast.error('No file content to download')
            return
        }

        try {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const fileName = currentFile.split('/').pop() || 'code.txt'
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            toast.success(`Downloaded ${fileName}`)
        } catch (error) {
            console.error('Download failed:', error)
            toast.error('Failed to download selected file')
        }
    }

    const handleSaveCode = async () => {
        if (!onSaveCode) {
            toast.error('Save is not available right now')
            return
        }
        await onSaveCode({ successMessage: `Saved changes for ${currentFile}` })
    }

    if (!keys.length) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-950 text-gray-600 text-sm">
                No files yet
            </div>
        )
    }

    return (
        <div className="w-full h-full flex bg-gray-950 overflow-hidden">
            {/* File tree */}
            <div className="w-52 shrink-0 border-r border-gray-800 overflow-y-auto py-2">
                <div className="flex items-center justify-between px-3 py-1">
                    <p className="text-2.5 text-gray-600 uppercase tracking-wider font-semibold">Files</p>
                    {previousParsed && (
                        <span className="text-2 text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                            v-diff active
                        </span>
                    )}
                </div>
                {Object.entries(buildTree(parsed)).map(([n, nd]) => (
                    <Node
                        key={n}
                        name={n}
                        node={nd}
                        active={currentFile}
                        onSelect={setActive}
                        diffStatus={diffStatus}
                    />
                ))}
            </div>
            {/* Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-800 bg-gray-950 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileCode className="w-3 h-3 text-indigo-400" />
                        <span className="text-xs text-gray-300 font-mono truncate">{currentFile}</span>
                        {showDiff && (
                            <span className="text-2 font-medium px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Comparing with previous version
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {previousParsed && (
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDiff(v => !v)
                                    if (isEditable) setEditableFile('')
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors text-2.75 cursor-pointer ${
                                    showDiff
                                        ? 'border-indigo-500 text-indigo-300 bg-indigo-500/20'
                                        : 'border-gray-700 text-gray-200 hover:bg-gray-800'
                                }`}
                                title={showDiff ? 'Exit Diff View' : 'Compare with previous version'}
                            >
                                <GitCompare className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{showDiff ? 'Exit Diff' : 'Diff'}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCopyFile}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-700 text-gray-200 hover:bg-gray-800 transition-colors text-2.75 cursor-pointer"
                            title="Copy selected file code"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadFile}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-700 text-gray-200 hover:bg-gray-800 transition-colors text-2.75 cursor-pointer"
                            title="Download selected file code"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Download</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleEdit}
                            disabled={showDiff}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors text-2.75 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isEditable
                                ? 'border-green-500/60 text-green-300 hover:bg-green-500/15'
                                : 'border-gray-700 text-gray-200 hover:bg-gray-800'
                                }`}
                            title={isEditable ? 'Disable editing for this file' : 'Enable editing for this file'}
                        >
                            {isEditable ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{isEditable ? 'Done' : 'Edit'}</span>
                            {isEditable && <Check className="w-3.5 h-3.5 text-green-300" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveCode}
                            disabled={!hasUnsavedChanges || isSavingCode}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-700 text-gray-200 hover:bg-gray-800 transition-colors text-2.75 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title={!hasUnsavedChanges ? 'No changes to save' : 'Save code changes to database'}
                        >
                            {isSavingCode ? (
                                <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">Save</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    {showDiff && previousParsed ? (
                        <MonacoDiffEditor
                            key={`diff-${currentFile}`}
                            originalValue={previousParsed[currentFile] || ''}
                            modifiedValue={parsed[currentFile] || ''}
                            language={lang(currentFile)}
                        />
                    ) : (
                        <MonacoEditor
                            key={currentFile}
                            value={parsed[currentFile] || ''}
                            language={lang(currentFile)}
                            readOnly={!isEditable}
                            onChange={v => {
                                if (!isEditable) return
                                if (onChange) onChange({ ...parsed, [currentFile]: v || '' })
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
