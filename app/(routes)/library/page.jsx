'use client'

import { supabase } from '@/services/supabase'
import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AuthGuard from '@/app/_components/AuthGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Trash2, Search, Atom, Calendar, ArrowRight, Filter, X, Sparkles, Image as ImageIcon, Code2, Eye, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function Library() {
    const { currentUser } = useAuth()
    const [libraryData, setLibraryData] = useState([])
    const [filteredData, setFilteredData] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleteLoading, setDeleteLoading] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedFilter, setSelectedFilter] = useState('all')
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
    const [dbError, setDbError] = useState(false)
    const router = useRouter()

    const filterOptions = [
        { value: 'all', label: 'All Time' },
        { value: '1', label: 'Last 1 Day' },
        { value: '7', label: 'Last 7 Days' },
        { value: '30', label: 'Last 30 Days' },
        { value: '90', label: 'Last 90 Days' },
        { value: 'custom', label: 'Custom Range' }
    ]

    useEffect(() => {
        if (currentUser?.email) {
            GetLibraryHistory()
        }
    }, [currentUser])

    // Filter and search effect
    useEffect(() => {
        let filtered = [...libraryData]

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(item => 
                (item.searchInput && item.searchInput.toLowerCase().includes(query)) ||
                (item.prompt && item.prompt.toLowerCase().includes(query)) ||
                (item.type && item.type.toLowerCase().includes(query)) ||
                (item.title && item.title.toLowerCase().includes(query))
            )
        }

        // Apply date filter
        if (selectedFilter !== 'all') {
            const now = new Date()
            let startDate = new Date()

            if (selectedFilter === 'custom') {
                if (customDateRange.start && customDateRange.end) {
                    startDate = new Date(customDateRange.start)
                    const endDate = new Date(customDateRange.end)
                    endDate.setHours(23, 59, 59, 999) // Include the entire end day
                    
                    filtered = filtered.filter(item => {
                        const itemDate = new Date(item.created_at)
                        return itemDate >= startDate && itemDate <= endDate
                    })
                }
            } else {
                const days = parseInt(selectedFilter)
                startDate.setDate(now.getDate() - days)
                
                filtered = filtered.filter(item => {
                    const itemDate = new Date(item.created_at)
                    return itemDate >= startDate
                })
            }
        }

        // Sort by relevance if searching, otherwise by date
        if (searchQuery.trim()) {
            filtered.sort((a, b) => {
                const queryLower = searchQuery.toLowerCase()
                const aTitle = (a.searchInput || a.prompt || a.title || '').toLowerCase()
                const bTitle = (b.searchInput || b.prompt || b.title || '').toLowerCase()
                
                // Exact matches first
                if (aTitle.includes(queryLower) && !bTitle.includes(queryLower)) return -1
                if (!aTitle.includes(queryLower) && bTitle.includes(queryLower)) return 1
                
                // Then by date (newest first)
                return new Date(b.created_at) - new Date(a.created_at)
            })
        } else {
            // Default sort by date (newest first)
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        }

        setFilteredData(filtered)
    }, [libraryData, searchQuery, selectedFilter, customDateRange])

    const GetLibraryHistory = async () => {
        try {
            setLoading(true)

            if (!currentUser?.email) {
                setLibraryData([])
                setFilteredData([])
                return
            }

            // Run all 3 queries in parallel — treat each error as non-fatal
            const [libraryResponse, imageGenResponse, websiteProjectsResponse] = await Promise.all([
                supabase
                    .from('Library')
                    .select(`*, Chats(*)`)
                    .eq('userEmail', currentUser.email)
                    .order('created_at', { ascending: false }),

                supabase
                    .from('ImageGeneration')
                    .select('*')
                    .eq('userEmail', currentUser.email)
                    .order('created_at', { ascending: false }),

                supabase
                    .from('website_projects')
                    .select('*')
                    .eq('user_email', currentUser.email)
                    .order('created_at', { ascending: false })
            ]);

            // Log non-timeout errors; treat timeout silently
            const logIfRealError = (label, error) => {
                if (!error) return;
                const isTimeout = error.code === 'TIMEOUT' || error.message?.includes('timeout') || error.message?.includes('fetch failed');
                if (!isTimeout) console.warn(`[Library] ${label}:`, error.message);
            };

            logIfRealError('Library query error', libraryResponse.error);
            logIfRealError('ImageGeneration query error', imageGenResponse.error);
            logIfRealError('WebsiteProjects query error', websiteProjectsResponse.error);

            const isAnyTimeout = (
                (libraryResponse.error?.code === 'TIMEOUT' || libraryResponse.error?.message?.includes('timeout')) ||
                (imageGenResponse.error?.code === 'TIMEOUT' || imageGenResponse.error?.message?.includes('timeout')) ||
                (websiteProjectsResponse.error?.code === 'TIMEOUT' || websiteProjectsResponse.error?.message?.includes('timeout'))
            );

            if (isAnyTimeout) {
                setDbError(true);
                console.warn('[Library] Supabase is unreachable — project may be paused. Visit https://supabase.com/dashboard to restore it.');
            } else {
                setDbError(false);
            }

            const libraryDataItems = libraryResponse.error ? [] : (libraryResponse.data || []);
            const imageGenDataItems = imageGenResponse.error ? [] : (imageGenResponse.data || []);
            const websiteProjectsDataItems = websiteProjectsResponse.error ? [] : (websiteProjectsResponse.data || []);

            const libraryItems = libraryDataItems.map(item => ({
                ...item,
                dataType: 'search',
                title: item.searchInput,
                subtitle: `${item.type === 'research' ? 'Research' : 'Search'} • ${formatDate(item.created_at)}`
            }));

            const imageGenItems = imageGenDataItems.map(item => ({
                ...item,
                dataType: 'image-generation',
                title: item.prompt,
                subtitle: `Image Generation • ${formatDate(item.created_at)}`,
                type: 'image-generation',
                searchInput: item.prompt
            }));

            const websiteProjectItems = websiteProjectsDataItems.map(item => ({
                ...item,
                dataType: 'website-builder',
                title: item.title || item.initial_prompt || 'Website Project',
                subtitle: `Website Builder • ${formatDate(item.created_at)}`,
                type: 'website-builder',
                searchInput: item.title || item.initial_prompt,
                libId: item.id
            }));

            let combinedData = [...libraryItems, ...imageGenItems, ...websiteProjectItems];

            // If Supabase returned nothing (DB down), fall back to localStorage searches
            // ChatBoxAiInput saves each search as `search_${libId}` in localStorage
            if (libraryItems.length === 0) {
                try {
                    const localItems = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('search_')) {
                            try {
                                const raw = localStorage.getItem(key);
                                const item = JSON.parse(raw);
                                // Only show searches belonging to the current user
                                if (item && (item.userEmail === currentUser.email || item.userEmail === 'anonymous')) {
                                    localItems.push({
                                        ...item,
                                        dataType: 'search',
                                        title: item.searchInput || '(untitled)',
                                        subtitle: `${item.type === 'research' ? 'Research' : 'Search'} • (offline)`,
                                        created_at: item.created_at || new Date().toISOString(),
                                        Chats: [],
                                        _fromLocalStorage: true,
                                    });
                                }
                            } catch (_) { /* skip malformed items */ }
                        }
                    }
                    if (localItems.length > 0) {
                        console.info(`[Library] Supabase unreachable — showing ${localItems.length} item(s) from localStorage`);
                        combinedData = [...localItems, ...imageGenItems, ...websiteProjectItems];
                    }
                } catch (lsErr) {
                    console.warn('[Library] localStorage fallback failed:', lsErr);
                }
            }

            // Sort by date (newest first)
            combinedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setLibraryData(combinedData)
            setFilteredData(combinedData)
        } catch (error) {
            console.error('[Library] Unexpected error in GetLibraryHistory:', error?.message || error)
            setLibraryData([])
            setFilteredData([])
        } finally {
            setLoading(false)
        }
    }


    const handleDelete = async (libId, dataType) => {
        try {
            setDeleteLoading(libId)
            
            // Validate required fields
            if (!libId) {
                console.error('Error: libId is missing for delete operation')
                return
            }
            
            if (!currentUser?.email) {
                console.error('Error: User email is missing for delete operation')
                return
            }
            
            if (dataType === 'image-generation') {
                // Delete image generation entry
                const { error } = await supabase
                    .from('ImageGeneration')
                    .delete()
                    .eq('libId', libId)
                    .eq('userEmail', currentUser.email)

                if (error) {
                    // Enhanced error logging
                    console.error('Error deleting image generation entry:', {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code,
                        fullError: JSON.stringify(error, null, 2),
                        libId: libId,
                        userEmail: currentUser.email
                    })
                    return
                }
            } else {
                // Delete search/research entry (original logic)
                // First delete related chats
                const { error: chatsError } = await supabase
                    .from('Chats')
                    .delete()
                    .eq('libId', libId)
                
                if (chatsError) {
                    console.error('Error deleting related chats:', {
                        message: chatsError.message,
                        details: chatsError.details,
                        hint: chatsError.hint,
                        code: chatsError.code,
                        fullError: JSON.stringify(chatsError, null, 2),
                        libId: libId
                    })
                    // Continue with library deletion even if chats deletion fails
                }
                
                // Then delete the library entry
                const { error } = await supabase
                    .from('Library')
                    .delete()
                    .eq('libId', libId)
                    .eq('userEmail', currentUser.email)

                if (error) {
                    // Enhanced error logging
                    console.error('Error deleting library entry:', {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code,
                        fullError: JSON.stringify(error, null, 2),
                        libId: libId,
                        userEmail: currentUser.email
                    })
                    return
                }
            }

            // Remove from local state only if deletion was successful
            setLibraryData(prev => prev.filter(item => item.libId !== libId))
            setFilteredData(prev => prev.filter(item => item.libId !== libId))
        } catch (error) {
            // Enhanced error logging for unexpected errors
            console.error('Error in handleDelete:', {
                message: error.message,
                stack: error.stack,
                libId: libId,
                dataType: dataType,
                userEmail: currentUser?.email
            })
        } finally {
            setDeleteLoading(null)
        }
    }

    const handleViewResult = (libId, dataType) => {
        if (dataType === 'image-generation') {
            router.push(`/image-gen/${libId}`)
        } else if (dataType === 'website-builder') {
            router.push(`/website-builder/${libId}`)
        } else {
            router.push(`/search/${libId}`)
        }
    }

    const clearFilters = () => {
        setSearchQuery('')
        setSelectedFilter('all')
        setCustomDateRange({ start: '', end: '' })
    }

    const getActiveFiltersCount = () => {
        let count = 0
        if (searchQuery.trim()) count++
        if (selectedFilter !== 'all') count++
        return count
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getSearchTypeIcon = (type) => {
        return type === 'research' ? <Atom className="w-4 h-4" /> : <Search className="w-4 h-4" />
    }

    const getSearchTypeBadge = (type) => {
        if (type === 'image-generation') {
            return (
                <Badge variant="outline" className="flex items-center gap-1 text-xs bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-600 dark:text-purple-300">
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Image Gen</span>
                    <span className="sm:hidden">Image</span>
                </Badge>
            )
        }
        if (type === 'website-builder') {
            return (
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Code2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Website</span>
                    <span className="sm:hidden">Site</span>
                </Badge>
            )
        }
        return type === 'research' ? 
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Atom className="w-3 h-3" />
                <span className="hidden sm:inline">Research</span>
                <span className="sm:hidden">Research</span>
            </Badge> : 
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Search className="w-3 h-3" />
                <span className="hidden sm:inline">Search</span>
                <span className="sm:hidden">Search</span>
            </Badge>
    }

    const truncateText = (text, maxLength = 100) => {
        if (!text) return ''
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }

    if (loading) {
        return (
            <AuthGuard>
                <div className='h-full flex flex-col px-4 md:px-8 lg:px-20 xl:px-32 py-6 md:py-10'>
                    <h2 className='text-2xl md:text-3xl font-bold mb-6 text-foreground dark:text-white shrink-0'>Library</h2>
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <Card key={i} className="animate-pulse bg-card dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600">
                                    <CardHeader className="pb-3">
                                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-muted rounded w-1/2"></div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="h-3 bg-muted rounded w-full mb-2"></div>
                                        <div className="h-3 bg-muted rounded w-2/3"></div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </AuthGuard>
        )
    }

    return (
        <AuthGuard>
            <div className='h-full flex flex-col px-4 md:px-8 lg:px-20 xl:px-32 py-6 md:py-10'>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2 shrink-0">
                    <h2 className='text-2xl md:text-3xl font-bold text-foreground dark:text-white'>Library</h2>
                    <p className="text-muted-foreground dark:text-gray-400 text-sm md:text-base">
                        {filteredData.length} of {libraryData.length} items
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                </div>

                {/* Database Error Banner */}
                {dbError && (
                    <div className="flex items-center gap-3 mb-4 p-4 rounded-lg border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 shrink-0">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">Database Temporarily Unavailable</p>
                            <p className="text-xs mt-0.5 opacity-80">
                                Cannot connect to Supabase. Your data still exists — the database may be paused.{' '}
                                <a
                                    href="https://supabase.com/dashboard"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline font-medium"
                                >
                                    Resume your project →
                                </a>
                            </p>
                        </div>
                    </div>
                )}

                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search your library..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10 bg-background dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted dark:hover:bg-gray-700"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        )}
                    </div>

                    {/* Filter Dropdown */}
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className="flex items-center gap-2 bg-background dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600 text-foreground dark:text-white hover:bg-muted dark:hover:bg-gray-700 relative"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">Filter</span>
                                    {getActiveFiltersCount() > 0 && (
                                        <div className="absolute -top-1 -right-1 text-xs bg-primary text-primary-foreground rounded-full px-1 min-w-4 h-4 flex items-center justify-center" style={{ fontSize: '8px' }}>
                                            {getActiveFiltersCount()}
                                        </div>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-background dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600">
                                <DropdownMenuLabel className="text-foreground dark:text-white">Filter by Date</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border dark:bg-gray-600" />
                                {filterOptions.map((option) => (
                                    <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => setSelectedFilter(option.value)}
                                        className={`cursor-pointer text-foreground dark:text-white hover:bg-muted dark:hover:bg-gray-700 ${
                                            selectedFilter === option.value ? 'bg-muted dark:bg-gray-700 font-medium' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span>{option.label}</span>
                                            {selectedFilter === option.value && (
                                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            )}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Clear Filters Button */}
                        {getActiveFiltersCount() > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Custom Date Range Inputs */}
                {selectedFilter === 'custom' && (
                    <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-muted/50 dark:bg-gray-800/50 rounded-lg border border-border dark:border-gray-600 shrink-0">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-foreground dark:text-white mb-2">Start Date</label>
                            <Input
                                type="date"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-background dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600 text-foreground dark:text-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-foreground dark:text-white mb-2">End Date</label>
                            <Input
                                type="date"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bg-background dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600 text-foreground dark:text-white"
                            />
                        </div>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {filteredData.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            {libraryData.length === 0 ? (
                                <>
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <Search className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground dark:text-gray-400" />
                                        <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground dark:text-gray-400" />
                                    </div>
                                    <h3 className="text-lg md:text-xl font-semibold text-foreground dark:text-white mb-2">No content yet</h3>
                                    <p className="text-muted-foreground dark:text-gray-400 mb-6 text-sm md:text-base max-w-sm mx-auto">
                                        Start searching or generating images to build your library!
                                    </p>
                                    <Button onClick={() => router.push('/app')} className="flex items-center gap-2 w-full sm:w-auto">
                                        Start Creating
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Search className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground dark:text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg md:text-xl font-semibold text-foreground dark:text-white mb-2">No results found</h3>
                                    <p className="text-muted-foreground dark:text-gray-400 mb-6 text-sm md:text-base max-w-sm mx-auto">
                                        No items match your current filters. Try adjusting your search terms or date range.
                                    </p>
                                    <Button onClick={clearFilters} variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                                        Clear All Filters
                                        <X className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 md:space-y-4 pb-8">
                        {filteredData.map((item) => (
                            <Card key={item.libId} className="hover:shadow-md transition-shadow bg-card dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600">
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                        <div className="flex gap-3 flex-1 min-w-0">
                                            {/* Thumbnail for completed image generations */}
                                            {item.dataType === 'image-generation' && item.status === 'completed' && item.generatedImageUrl && (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                                                    <img 
                                                        src={item.generatedImageUrl} 
                                                        alt="Generated" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base md:text-lg mb-2 line-clamp-2 leading-tight text-foreground dark:text-white">
                                                    {item.title || item.searchInput || item.prompt}
                                                </CardTitle>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs md:text-sm text-muted-foreground dark:text-gray-400">
                                                    {getSearchTypeBadge(item.type)}
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        <span className="truncate">{formatDate(item.created_at)}</span>
                                                    </div>
                                                    {item.dataType === 'image-generation' && item.status && (
                                                        <div className="flex items-center gap-1">
                                                            <div className={`w-2 h-2 rounded-full ${
                                                                item.status === 'completed' ? 'bg-green-500' : 
                                                                item.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                                                            }`}></div>
                                                            <span className="capitalize text-xs">{item.status}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 sm:ml-4 shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleViewResult(item.libId, item.dataType)
                                                }}
                                                className="flex items-center gap-1 cursor-pointer text-xs md:text-sm px-3 py-2 min-h-8 md:min-h-9"
                                            >
                                                <span className="hidden sm:inline">View</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </Button>
                                            
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer px-3 py-2 min-h-8 md:min-h-9"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="w-[95vw] max-w-md mx-auto rounded-3xl bg-card dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-left dark:text-white">
                                                            Delete {item.dataType === 'image-generation' ? 'Image Generation' : 'Search'}
                                                        </DialogTitle>
                                                        <DialogDescription className="text-left dark:text-gray-400">
                                                            Are you sure you want to delete this {item.dataType === 'image-generation' ? 'image generation' : 'search'}? This action cannot be undone.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-3">
                                                        <div className="text-sm bg-muted dark:bg-gray-700 p-3 rounded border-l-4 border-muted-foreground/20 dark:border-gray-500">
                                                            <span className="font-medium dark:text-white">
                                                                {item.dataType === 'image-generation' ? 'Prompt:' : 'Search query:'}
                                                            </span>
                                                            <p className="mt-1 break-all dark:text-gray-300">
                                                                "{truncateText(item.searchInput || item.prompt, 120)}"
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 rounded-3xl">
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className="w-full sm:w-auto"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </DialogTrigger>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={() => handleDelete(item.libId, item.dataType)}
                                                            disabled={deleteLoading === item.libId}
                                                            className="w-full sm:w-auto"
                                                        >
                                                            {deleteLoading === item.libId ? 'Deleting...' : 'Delete'}
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                
                            </Card>
                        ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthGuard>
    )
}

export default Library
