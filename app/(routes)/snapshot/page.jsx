'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Loader2Icon, SearchIcon, CalendarIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export default function SnapshotPage() {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [dateOpen, setDateOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState(undefined)
    const [month, setMonth] = useState(undefined)
    const [dateValue, setDateValue] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState(null)

    // Helper functions for date formatting
    const formatDate = (date) => {
        if (!date) return ''
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        })
    }

    const formatDateForAPI = (date) => {
        if (!date) return ''
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const isValidDate = (date) => {
        if (!date) return false
        return !isNaN(date.getTime())
    }

    const fetchPublishedProjects = async () => {
        try {
            const dateString = selectedDate ? formatDateForAPI(selectedDate) : ''
            const response = await fetch(`/api/website-builder/published?page=${page}&search=${encodeURIComponent(search)}&date=${encodeURIComponent(dateString)}`)
            const data = await response.json()

            if (!response.ok) {
                // API error (e.g. real DB failure) — show empty state without crashing
                console.warn('Failed to fetch published projects:', data?.error || response.status)
                setProjects([])
                setPagination(null)
                setLoading(false)
                return
            }

            setProjects(data.projects || [])
            setPagination(data.pagination || null)
            setLoading(false)
        } catch (error) {
            console.warn('Error fetching projects (network/parse):', error?.message || error)
            setProjects([])
            setPagination(null)
            setLoading(false)
        }
    }


    useEffect(() => {
        fetchPublishedProjects()
    }, [page, search, selectedDate])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background dark:bg-[oklch(0.2478_0_0)]">
                <Loader2Icon className="size-10 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background dark:bg-[oklch(0.2478_0_0)] px-4 py-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-foreground dark:text-white mb-2">Snapshot</h1>
                    <p className="text-muted-foreground dark:text-gray-300">
                        Explore websites created by our community with AI
                    </p>
                </div>

                {/* Search and Filter */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-xl">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setPage(1)
                                }}
                                placeholder="Search projects..."
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-border dark:border-gray-600 bg-card dark:bg-[oklch(0.3092_0_0)] text-foreground dark:text-white placeholder-muted-foreground dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-gray-400" size={20} />
                        </div>

                        {/* Date Filter */}
                        {/* <div className="flex gap-3 items-center w-full md:w-auto">
                            <div className="relative flex-1 md:flex-initial">
                                <Input
                                    id="date"
                                    value={dateValue}
                                    placeholder="Select date..."
                                    className="w-full md:w-auto pr-10 py-3 rounded-lg border border-border dark:border-gray-600 bg-card dark:bg-[oklch(0.3092_0_0)] text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all min-w-[200px]"
                                    onChange={(e) => {
                                        const date = new Date(e.target.value)
                                        setDateValue(e.target.value)
                                        if (isValidDate(date)) {
                                            setSelectedDate(date)
                                            setMonth(date)
                                            setPage(1)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault()
                                            setDateOpen(true)
                                        }
                                    }}
                                />
                                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date-picker"
                                            variant="ghost"
                                            className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-transparent"
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground dark:text-gray-400" />
                                            <span className="sr-only">Select date</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto overflow-hidden p-0 bg-card dark:bg-[oklch(0.3092_0_0)] border-border dark:border-gray-600"
                                        align="end"
                                        alignOffset={-8}
                                        sideOffset={10}
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            captionLayout="dropdown"
                                            month={month}
                                            onMonthChange={setMonth}
                                            onSelect={(date) => {
                                                setSelectedDate(date)
                                                setMonth(date)
                                                setDateValue(formatDate(date))
                                                setDateOpen(false)
                                                setPage(1)
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {selectedDate && (
                                <button
                                    onClick={() => {
                                        setSelectedDate(undefined)
                                        setMonth(undefined)
                                        setDateValue('')
                                        setPage(1)
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border dark:border-gray-600 bg-card dark:bg-[oklch(0.3092_0_0)] text-foreground dark:text-white hover:bg-destructive/10 hover:border-destructive dark:hover:border-destructive hover:text-destructive dark:hover:text-destructive transition-all whitespace-nowrap"
                                    title="Clear date filter"
                                    aria-label="Clear date filter"
                                >
                                    <XIcon size={18} />
                                    <span className="text-sm font-medium">Clear</span>
                                </button>
                            )}
                        </div> */}
                    </div>
                    
                    {/* Active Filters Display */}
                    {(search || selectedDate) && (
                        <div className="mt-3 flex flex-wrap gap-2 items-center text-sm text-muted-foreground dark:text-gray-400">
                            <span>Filters:</span>
                            {search && (
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary dark:text-primary border border-primary/20">
                                    Search: "{search}"
                                </span>
                            )}
                            {selectedDate && (
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary dark:text-primary border border-primary/20">
                                    Date: {formatDate(selectedDate)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Projects Grid */}
                {projects.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-xl text-muted-foreground dark:text-gray-400">
                            No published websites yet. Be the first to create one!
                        </p>
                        <Link
                            href="/"
                            className="inline-block mt-4 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                        >
                            Create Website
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/website-builder/preview/${project.id}`}
                                    className="group block bg-card dark:bg-[oklch(0.3092_0_0)] rounded-xl overflow-hidden border border-border dark:border-gray-600 hover:border-primary dark:hover:border-primary transition-all hover:shadow-lg"
                                >
                                    {/* Preview Thumbnail */}
                                    <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                        {project.current_code ? (
                                            <iframe
                                                srcDoc={project.current_code}
                                                title={`Preview of ${project.project_name}`}
                                                className="w-full border-none pointer-events-none"
                                                style={{
                                                    width: '1920px',
                                                    height: '1080px',
                                                    transform: 'scale(0.24)',
                                                    transformOrigin: 'top left',
                                                    border: 'none',
                                                }}
                                                sandbox="allow-scripts allow-same-origin"
                                            />
                                        ) : (
                                            <div className="relative h-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                                <div className="text-white text-6xl font-bold opacity-20">
                                                    {project.project_name?.[0]?.toUpperCase() || 'W'}
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-10 transition-all pointer-events-none" />
                                    </div>

                                    {/* Project Info */}
                                    <div className="p-4">
                                        <h3 className="text-lg font-semibold text-foreground dark:text-white mb-1 truncate">
                                            {project.project_name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2 truncate">
                                            by {project.user_email?.split('@')?.[0] || 'Anonymous'}
                                        </p>
                                        <p className="text-xs text-muted-foreground dark:text-gray-500">
                                            {new Date(project.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-8">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-card dark:bg-[oklch(0.3092_0_0)] border border-border dark:border-gray-600 rounded-lg text-foreground dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary dark:hover:border-primary transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-foreground dark:text-white">
                                    Page {page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page === pagination.totalPages}
                                    className="px-4 py-2 bg-card dark:bg-[oklch(0.3092_0_0)] border border-border dark:border-gray-600 rounded-lg text-foreground dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary dark:hover:border-primary transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
