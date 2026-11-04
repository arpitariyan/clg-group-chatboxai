"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Sparkles, ImageIcon, Code2, MoreHorizontal, Trash2, Filter, X } from '@/components/ui/animated-icon'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from '@/lib/alert'

const SearchChatModal = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [libraryData, setLibraryData] = useState([])
    const [query, setQuery] = useState('')
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleteLoadingKey, setDeleteLoadingKey] = useState(null)
    const [selectedFilter, setSelectedFilter] = useState('all')
    const [selectedType, setSelectedType] = useState('all')
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })

    useEffect(() => {
        if (isOpen && currentUser?.email) {
            fetchData()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentUser?.email])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await authFetch(`/api/library/history?email=${encodeURIComponent(currentUser.email)}`, { cache: 'no-store' })
            if (!res.ok) {
                setLibraryData([])
                return
            }
            const payload = await res.json()
            const { libraryDocs = [], imageGenDocs = [], websiteProjectsDocs = [] } = payload

            const libraryItems = libraryDocs.map(item => ({
                libId: item.libId,
                dataType: 'search',
                title: item.searchInput || 'Untitled',
                created_at: item.created_at || item.$createdAt,
                type: item.type
            }))

            const imageItems = imageGenDocs.map(item => ({
                libId: item.libId || item.$id,
                dataType: 'image-generation',
                title: item.prompt || 'Image Generation',
                created_at: item.created_at || item.$createdAt,
            }))

            const websiteItems = websiteProjectsDocs.map(item => ({
                libId: item.$id,
                dataType: 'website-builder',
                title: item.title || item.initial_prompt || 'Website Project',
                created_at: item.created_at || item.$createdAt,
            }))

            const combined = [...libraryItems, ...imageItems, ...websiteItems]
            combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            setLibraryData(combined)
        } catch (err) {
            console.error('[SearchChatModal] fetch error', err)
            setLibraryData([])
        } finally {
            setLoading(false)
        }
    }

    const filtered = useMemo(() => {
        let result = [...libraryData]

        // Apply type filter
        if (selectedType !== 'all') {
            result = result.filter(item => item.dataType === selectedType)
        }

        // Apply date filter
        if (selectedFilter !== 'all') {
            const now = new Date()
            let startDate = new Date()

            if (selectedFilter === 'custom') {
                if (customDateRange.start && customDateRange.end) {
                    startDate = new Date(customDateRange.start)
                    const endDate = new Date(customDateRange.end)
                    endDate.setHours(23, 59, 59, 999)
                    result = result.filter(item => {
                        const itemDate = new Date(item.created_at)
                        return itemDate >= startDate && itemDate <= endDate
                    })
                }
            } else {
                const days = parseInt(selectedFilter)
                startDate.setDate(now.getDate() - days)
                result = result.filter(item => {
                    const itemDate = new Date(item.created_at)
                    return itemDate >= startDate
                })
            }
        }

        // Apply search filter
        if (query.trim()) {
            const q = query.toLowerCase()
            result = result.filter(item => (item.title || '').toLowerCase().includes(q) || (item.type || '').toLowerCase().includes(q))
        }

        // Sort by date (newest first)
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return result
    }, [libraryData, query, selectedFilter, selectedType, customDateRange])

    const handleOpenItem = (item) => {
        if (item.dataType === 'image-generation') {
            router.push(`/image-gen/${item.libId}`)
        } else if (item.dataType === 'website-builder') {
            router.push(`/website-builder/${item.libId}`)
        } else {
            router.push(`/search/${item.libId}`)
        }
        onClose && onClose()
    }

    const getIcon = (item) => {
        if (item.dataType === 'image-generation') return <ImageIcon className="w-4 h-4" />
        if (item.dataType === 'website-builder') return <Code2 className="w-4 h-4" />
        return <Search className="w-4 h-4" />
    }

    const confirmDelete = async () => {
        if (!deleteTarget || !currentUser?.email) {
            toast.error('Unable to delete this item right now.')
            return
        }

        const itemLibId = deleteTarget.libId
        setDeleteLoadingKey(itemLibId)

        try {
            const response = await authFetch('/api/library/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    libId: deleteTarget.libId,
                    dataType: deleteTarget.dataType,
                    userEmail: currentUser.email,
                }),
            })

            const result = await response.json()
            if (!response.ok || !result?.success) {
                throw new Error(result?.error || result?.details || 'Delete failed')
            }

            setLibraryData(prev => prev.filter(item => item.libId !== itemLibId))
            setDeleteTarget(null)
            toast.success('Item deleted.')
        } catch (error) {
            toast.error(error?.message || 'Failed to delete item.')
        } finally {
            setDeleteLoadingKey(null)
        }
    }

    const clearFilters = () => {
        setQuery('')
        setSelectedFilter('all')
        setSelectedType('all')
        setCustomDateRange({ start: '', end: '' })
    }

    const getActiveFiltersCount = () => {
        let count = 0
        if (query.trim()) count++
        if (selectedFilter !== 'all') count++
        if (selectedType !== 'all') count++
        return count
    }

    return (
        <Dialog open={!!isOpen} onOpenChange={(v) => { if (!v) onClose && onClose() }}>
            <DialogContent className="sm:max-w-3xl w-full max-w-[95vw] overflow-hidden bg-card border border-border/60 text-foreground p-0 rounded-2xl shadow-2xl">
                <div className="w-full overflow-hidden p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Search Chat</DialogTitle>
                    </DialogHeader>

                    <div className="pt-2 w-full overflow-hidden">
                        <Input
                            placeholder="Search your chats, images, and sites"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="mb-4 w-full"
                        />

                        {/* Filter controls */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-xs h-8">
                                        Type
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => setSelectedType('all')}>
                                        {selectedType === 'all' && '✓ '} All
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSelectedType('search')}>
                                        {selectedType === 'search' && '✓ '} Search
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSelectedType('image-generation')}>
                                        {selectedType === 'image-generation' && '✓ '} Images
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSelectedType('website-builder')}>
                                        {selectedType === 'website-builder' && '✓ '} Websites
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-xs h-8">
                                        Date
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => { setSelectedFilter('all'); setCustomDateRange({ start: '', end: '' }); }}>
                                        {selectedFilter === 'all' && '✓ '} All Time
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedFilter('1'); setCustomDateRange({ start: '', end: '' }); }}>
                                        {selectedFilter === '1' && '✓ '} Last 1 Day
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedFilter('7'); setCustomDateRange({ start: '', end: '' }); }}>
                                        {selectedFilter === '7' && '✓ '} Last 7 Days
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedFilter('30'); setCustomDateRange({ start: '', end: '' }); }}>
                                        {selectedFilter === '30' && '✓ '} Last 30 Days
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedFilter('90'); setCustomDateRange({ start: '', end: '' }); }}>
                                        {selectedFilter === '90' && '✓ '} Last 90 Days
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {getActiveFiltersCount() > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-8"
                                    onClick={clearFilters}
                                >
                                    Clear Filters
                                    <X className="w-3 h-3 ml-1" />
                                </Button>
                            )}
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1">
                            {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
                            {!loading && filtered.length === 0 && (
                                <div className="text-sm text-muted-foreground">No items found.</div>
                            )}

                            {filtered.map(item => (
                                <div
                                    key={item.libId}
                                    className="cursor-pointer rounded-xl border border-border/60 hover:bg-muted/60 bg-card/60 backdrop-blur-xs w-full overflow-hidden group transition-colors"
                                >
                                    <div className="flex items-center gap-3 px-3 py-2">
                                        <span
                                            className="shrink-0 text-muted-foreground cursor-pointer"
                                            onClick={() => handleOpenItem(item)}
                                        >
                                            {getIcon(item)}
                                        </span>
                                        <span
                                            className="text-sm font-medium truncate min-w-0 flex-1 cursor-pointer"
                                            onClick={() => handleOpenItem(item)}
                                        >
                                            {item.title || 'Untitled'}
                                        </span>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                            {item.dataType}
                                        </Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600 dark:text-red-400 cursor-pointer"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setDeleteTarget(item)
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="text-xs text-muted-foreground px-3 pb-2">{new Date(item.created_at).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>

            <Dialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open && !deleteLoadingKey) {
                        setDeleteTarget(null)
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete item?</DialogTitle>
                        <DialogDescription>
                            This will permanently remove this item from your history. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={!!deleteLoadingKey}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmDelete}
                            disabled={!!deleteLoadingKey}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteLoadingKey ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}

export default SearchChatModal
