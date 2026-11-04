"use client"
import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import Image from 'next/image'
import { authFetch } from '@/lib/auth-fetch'
import {
    Search,
    GalleryHorizontalEnd,
    Plus,
    LogIn,
    Globe,
    LogOut,
    Crown,
    ChevronsUpDown,
    BadgeCheck,
    CreditCard,
    MoreHorizontal,
    ImageIcon,
    FlaskConical,
    User,
    Sparkles,
    Shield,
    HelpCircle,
    Smile,
    Pencil,
    Trash2,
    Check,
    X,
    Puzzle,
} from '@/components/ui/animated-icon'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2Icon } from '@/components/ui/animated-icon'
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useAppConnections } from '@/contexts/AppConnectionContext'
import { useSubscription } from '@/hooks/useSubscription'
import { toast } from '@/lib/alert'
import Link from 'next/link'
import { getPlanPaidCredits, getPlanDailyCredits, normalizePlan } from '@/lib/subscriptionPlans'
import LogoutConfirmation from './LogoutConfirmation'
// Removed SettingsModal import
import AvatarPickerModal from './modals/AvatarPickerModal'
import SearchChatModal from './modals/SearchChatModal'
import AppConnectionPanel from './AppConnectionPanel'


import { FolderOpenIcon } from '@/components/ui/folder-open-icon'
import { SearchIcon } from '@/components/ui/search-icon'
import { SquarePenIcon } from '@/components/ui/square-pen-icon'


const navItems = [
    { title: 'New Chat', icon: SquarePenIcon, path: '/app' },
    { title: 'Search Chat', icon: SearchIcon, action: 'openSearch' },
    { title: 'Gallery', icon: FolderOpenIcon, path: '/snapshot' },
]

function SidebarNavItem({ item, isActive, onOpenSearch }) {
    const iconRef = useRef(null)
    const IconComponent = item.icon
    const { isMobile, setOpenMobile } = useSidebar()

    const handleMouseEnter = () => {
        iconRef.current?.startAnimation?.()
    }

    const handleMouseLeave = () => {
        iconRef.current?.stopAnimation?.()
    }

    const handleNavigate = () => {
        if (isMobile) setOpenMobile(false)
    }

    return (
        <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className="h-9 px-3 text-sm rounded-lg font-medium transition-colors dark:text-white dark:hover:text-white"
            >
                {item.action === 'openSearch' ? (
                    <button
                        onClick={() => {
                            onOpenSearch()
                            handleNavigate()
                        }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        className="flex items-center gap-2.5 w-full text-left"
                    >
                        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                            <IconComponent ref={iconRef} size={18} className="w-full h-full" />
                        </div>
                        <span className="truncate">{item.title}</span>
                    </button>
                ) : (
                    <Link
                        href={item.path || '/'}
                        prefetch
                        onClick={handleNavigate}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        className="flex items-center gap-2.5 w-full text-left"
                    >
                        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                            <IconComponent ref={iconRef} size={18} className="w-full h-full" />
                        </div>
                        <span className="truncate">{item.title}</span>
                    </Link>
                )}
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}

function getLibraryItemMeta(item) {
    if (item.dataType === 'image-generation') {
        return { icon: ImageIcon, url: `/image-gen/${item.libId}` }
    }
    if (item.dataType === 'website-builder') {
        return { icon: Globe, url: `/website-builder/${item.libId}` }
    }
    if (item.type === 'research') {
        return { icon: FlaskConical, url: `/search/${item.libId}` }
    }
    return { icon: Search, url: `/search/${item.libId}` }
}

function truncateTitle(str, max = 26) {
    if (!str) return 'Untitled'
    return str.length > max ? str.substring(0, max) + '…' : str
}

function getHistoryItemKey(item) {
    if (!item) return ''
    return `${item.libId}-${item.dataType}`
}

function AnimatedDropdownItem({ icon: Icon, children, onClick, className, iconClassName, iconSize = 16, ...props }) {
    const iconRef = useRef(null)

    const handleMouseEnter = () => {
        iconRef.current?.startAnimation?.()
    }

    const handleMouseLeave = () => {
        iconRef.current?.stopAnimation?.()
    }

    return (
        <DropdownMenuItem
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`cursor-pointer ${className || ''}`}
            {...props}
        >
            {Icon && (
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    <Icon ref={iconRef} size={iconSize} className={iconClassName || "w-full h-full"} />
                </div>
            )}
            {children}
        </DropdownMenuItem>
    )
}

function HistorySidebarItem({
    item,
    editingItemKey,
    editingTitle,
    setEditingTitle,
    submitRename,
    cancelRename,
    renameLoadingKey,
    deleteLoadingKey,
    startRename,
    setDeleteTarget,
}) {
    const iconRef = useRef(null)
    const actionIconRef = useRef(null)
    const meta = getLibraryItemMeta(item)
    const Icon = meta.icon
    const itemKey = getHistoryItemKey(item)
    const isEditing = editingItemKey === itemKey
    const isRenaming = renameLoadingKey === itemKey
    const isDeleting = deleteLoadingKey === itemKey

    return (
        <SidebarMenuItem key={itemKey}>
            <SidebarMenuButton
                asChild
                className="pr-8 dark:text-gray-300 dark:hover:text-white"
            >
                {isEditing ? (
                    <div className="flex w-full items-center gap-1" title={item.title}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    submitRename(item)
                                } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    cancelRename()
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isRenaming}
                            maxLength={140}
                            autoFocus
                            className="h-7 text-sm"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isRenaming}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                submitRename(item)
                            }}
                        >
                            <Check className="w-4 h-4" />
                            <span className="sr-only">Save rename</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isRenaming}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                cancelRename()
                            }}
                        >
                            <X className="w-4 h-4" />
                            <span className="sr-only">Cancel rename</span>
                        </Button>
                    </div>
                ) : (
                    <Link
                        href={meta.url}
                        prefetch
                        title={item.title}
                        onMouseEnter={() => iconRef.current?.startAnimation?.()}
                        onMouseLeave={() => iconRef.current?.stopAnimation?.()}
                        className="flex items-center gap-2.5 w-full text-left min-w-0"
                    >
                        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                            <Icon ref={iconRef} size={16} className="w-4 h-4 shrink-0 text-muted-foreground group-hover/menu-item:text-foreground transition-colors" />
                        </div>
                        <span className="truncate text-sm">{truncateTitle(item.title)}</span>
                    </Link>
                )}
            </SidebarMenuButton>

            {!isEditing && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                            showOnHover
                            onMouseEnter={(e) => {
                                e.stopPropagation()
                                actionIconRef.current?.startAnimation?.()
                            }}
                            onMouseLeave={(e) => {
                                e.stopPropagation()
                                actionIconRef.current?.stopAnimation?.()
                            }}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                            className="top-1.5 right-1 h-6 w-6 rounded-md flex items-center justify-center transition-all duration-200"
                        >
                            <MoreHorizontal ref={actionIconRef} size={14} className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                            <span className="sr-only">Open chat menu</span>
                        </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" sideOffset={8}>
                        <AnimatedDropdownItem
                            icon={Pencil}
                            disabled={isDeleting || isRenaming}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                startRename(item)
                            }}
                        >
                            <span>Rename</span>
                        </AnimatedDropdownItem>
                        <AnimatedDropdownItem
                            icon={Trash2}
                            className="text-red-600 focus:text-red-600 dark:text-red-400"
                            disabled={isDeleting || isRenaming}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDeleteTarget(item)
                            }}
                        >
                            <span>Delete Chat</span>
                        </AnimatedDropdownItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </SidebarMenuItem>
    )
}

const AppSidebar = () => {
    const userChevronsRef = useRef(null)
    const path = usePathname()
    const router = useRouter()
    const { currentUser, logout } = useAuth()
    const {
        userData,
        plan = 'free',
        credits = 0,
        paidCredits = 0,
        isPro = false,
        isSpecialAccount = false,
        loading: userLoading = false,
        refreshCredits,
    } = useUser() || {}
    const { isDarkMode } = useTheme()
    const { isMobile } = useSidebar()

    const subscription = useSubscription(
        currentUser?.email,
        `${userData?.plan || ''}|${userData?.subscription_start_date || ''}|${userData?.subscription_end_date || ''}|${userData?.credits || ''}|${userData?.paid_credits || ''}`
    )

    const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
    // Removed showSettingsModal state
    const [showAvatarModal, setShowAvatarModal] = useState(false)
    const [showSearchModal, setShowSearchModal] = useState(false)
    const [showAppConnectionPanel, setShowAppConnectionPanel] = useState(false)
    const [historyItems, setHistoryItems] = useState([])
    const [editingItemKey, setEditingItemKey] = useState(null)
    const [editingTitle, setEditingTitle] = useState('')
    const [renameLoadingKey, setRenameLoadingKey] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleteLoadingKey, setDeleteLoadingKey] = useState(null)

    const DEFAULT_AVATAR = '/avatar/Men-5.png'

    const getAvatarStorageKey = (email) => `chatbox_avatar_${email}`

    const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR)

    // Load saved avatar from localStorage when user signs in
    useEffect(() => {
        if (currentUser?.email) {
            const saved = localStorage.getItem(getAvatarStorageKey(currentUser.email))
            setSelectedAvatar(saved || DEFAULT_AVATAR)
        } else {
            setSelectedAvatar(DEFAULT_AVATAR)
        }
    }, [currentUser?.email])

    const handleAvatarSelect = (avatarSrc) => {
        setSelectedAvatar(avatarSrc)
        if (currentUser?.email) {
            localStorage.setItem(getAvatarStorageKey(currentUser.email), avatarSrc)
        }
    }

    const handleLogoutClick = () => setShowLogoutConfirmation(true)
    const handleLogoutCancel = () => setShowLogoutConfirmation(false)
    const handleLogoutConfirm = async () => {
        try {
            await logout()
            setShowLogoutConfirmation(false)
            router.push('/sign-in')
        } catch (error) {
            console.error('Logout error:', error)
            setShowLogoutConfirmation(false)
        }
    }

    const getUserInitials = (name, email) => {
        if (name) {
            return String(name).split(' ').map(n => n[0]).join('').toUpperCase()
        }
        if (email) return email[0].toUpperCase()
        return 'U'
    }

    const getUserDisplayName = (name, email) => {
        if (name) return name
        if (email) {
            const emailName = email.split('@')[0]
            const clean = emailName.replace(/[0-9._-]/g, '')
            return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
        }
        return 'User'
    }

    const resolvedDisplayName = getUserDisplayName(
        (userData?.name || currentUser?.displayName || '').trim(),
        currentUser?.email
    )

    useEffect(() => {
        if (!currentUser?.email) {
            setHistoryItems([])
            return
        }
        const fetchHistory = async () => {
            try {
                const res = await authFetch(
                    `/api/library/history?email=${encodeURIComponent(currentUser.email)}`,
                    { cache: 'no-store' }
                )
                if (!res.ok) return
                const payload = await res.json()
                const { libraryDocs = [], imageGenDocs = [], websiteProjectsDocs = [] } = payload

                const searchItems = libraryDocs.map(doc => ({
                    libId: doc.libId,
                    dataType: 'search',
                    type: doc.type,
                    title: doc.searchInput || 'Untitled',
                    created_at: doc.created_at || doc.$createdAt,
                }))
                const imageItems = imageGenDocs.map(doc => ({
                    libId: doc.libId || doc.$id,
                    dataType: 'image-generation',
                    type: 'image-generation',
                    title: doc.prompt || 'Image Generation',
                    created_at: doc.created_at || doc.$createdAt,
                }))
                const websiteItems = websiteProjectsDocs.map(doc => ({
                    libId: doc.$id,
                    dataType: 'website-builder',
                    type: 'website-builder',
                    title: doc.title || doc.project_name || doc.name || doc.initial_prompt || 'Website Project',
                    created_at: doc.created_at || doc.$createdAt,
                }))

                const combined = [...searchItems, ...imageItems, ...websiteItems].filter(item => item.libId)

                setHistoryItems(combined)
            } catch (err) {
                console.error('[AppSidebar] History fetch error:', err)
            }
        }
        fetchHistory()

        // Listen for real-time history updates when new conversations are created
        const handleHistoryUpdated = (event) => {
            // If the event includes the new item data, optimistically add it immediately
            if (event.detail) {
                setHistoryItems(prev => {
                    const exists = prev.some(item => item.libId === event.detail.libId)
                    if (exists) return prev
                    return [event.detail, ...prev]
                })
            }
            // Also re-fetch from server to ensure consistency
            fetchHistory()
        }

        window.addEventListener('historyUpdated', handleHistoryUpdated)
        return () => {
            window.removeEventListener('historyUpdated', handleHistoryUpdated)
        }
    }, [currentUser?.email])

    // Listen for credit updates dispatched after every AI request — refresh credit
    // balances immediately so the sidebar shows accurate numbers without a page reload.
    // Debounced to 2.5 seconds to prevent rapid API calls.
    useEffect(() => {
        let debounceTimer = null;
        const handleCreditsUpdated = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (refreshCredits) refreshCredits();
            }, 2500); // 2.5-second debounce
        }
        window.addEventListener('creditsUpdated', handleCreditsUpdated)
        return () => {
            window.removeEventListener('creditsUpdated', handleCreditsUpdated)
            if (debounceTimer) clearTimeout(debounceTimer);
        }
    }, [refreshCredits])

    const sortedHistoryItems = useMemo(() => {
        return [...historyItems]
            .filter(item => item?.libId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10)
    }, [historyItems])

    const startRename = (item) => {
        setEditingItemKey(getHistoryItemKey(item))
        setEditingTitle(item.title || 'Untitled')
    }

    const cancelRename = () => {
        if (renameLoadingKey) return
        setEditingItemKey(null)
        setEditingTitle('')
    }

    const submitRename = async (item) => {
        const itemKey = getHistoryItemKey(item)
        const trimmedTitle = editingTitle.trim()

        if (!trimmedTitle) {
            toast.error('Title cannot be empty.')
            return
        }

        if (trimmedTitle === (item.title || '').trim()) {
            setEditingItemKey(null)
            setEditingTitle('')
            return
        }

        if (!currentUser?.email) {
            toast.error('Please sign in to rename chats.')
            return
        }

        const previousTitle = item.title
        setRenameLoadingKey(itemKey)
        setHistoryItems(prev => prev.map(historyItem => {
            if (getHistoryItemKey(historyItem) !== itemKey) return historyItem
            return { ...historyItem, title: trimmedTitle }
        }))

        try {
            const response = await authFetch('/api/library/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    libId: item.libId,
                    dataType: item.dataType,
                    userEmail: currentUser.email,
                    title: trimmedTitle,
                }),
            })

            const result = await response.json()
            if (!response.ok || !result?.success) {
                throw new Error(result?.error || result?.details || 'Rename failed')
            }

            toast.success('Chat renamed.')
            setEditingItemKey(null)
            setEditingTitle('')
        } catch (error) {
            setHistoryItems(prev => prev.map(historyItem => {
                if (getHistoryItemKey(historyItem) !== itemKey) return historyItem
                return { ...historyItem, title: previousTitle }
            }))
            toast.error(error?.message || 'Failed to rename chat.')
        } finally {
            setRenameLoadingKey(null)
        }
    }

    const confirmDelete = async () => {
        if (!deleteTarget || !currentUser?.email) {
            toast.error('Unable to delete this chat right now.')
            return
        }

        const itemKey = getHistoryItemKey(deleteTarget)
        setDeleteLoadingKey(itemKey)

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

            setHistoryItems(prev => prev.filter(item => getHistoryItemKey(item) !== itemKey))
            if (editingItemKey === itemKey) {
                setEditingItemKey(null)
                setEditingTitle('')
            }
            setDeleteTarget(null)
            toast.success('Chat deleted.')
        } catch (error) {
            toast.error(error?.message || 'Failed to delete chat.')
        } finally {
            setDeleteLoadingKey(null)
        }
    }

    const isSpecial = currentUser?.email === 'arpitariyanm@gmail.com'
    const normalizedPlan = subscription.loading
        ? normalizePlan(userData?.plan || plan)
        : normalizePlan(subscription.effectivePlan || userData?.plan || plan)
    const hasActivePro = normalizedPlan === 'pro' || normalizedPlan === 'max' || isPro
    const isPaidPlan = normalizedPlan === 'pro' || normalizedPlan === 'max'

    // Credit wallet values
    const dailyFreeCredits   = userData?.credits   ?? credits  ?? 0
    const monthlyPaidCredits = userData?.paid_credits ?? paidCredits ?? 0
    const paidCreditsCap     = getPlanPaidCredits(normalizedPlan)   // 0 for free, 30k pro, 150k max
    const freeCreditsCap     = getPlanDailyCredits(normalizedPlan)  // always 5000
    const paidUsed           = Math.max(0, paidCreditsCap - monthlyPaidCredits)
    const freeUsed           = Math.max(0, freeCreditsCap - dailyFreeCredits)
    const paidPct            = paidCreditsCap > 0 ? Math.min(100, (monthlyPaidCredits / paidCreditsCap) * 100) : 0
    const freePct            = freeCreditsCap > 0 ? Math.min(100, (dailyFreeCredits   / freeCreditsCap)   * 100) : 0

    const planLabel = normalizedPlan === 'max' ? 'Max' : normalizedPlan === 'pro' ? 'Pro' : 'Free'
    const planAccent = normalizedPlan === 'max'
        ? { 
            bg: 'bg-background/50 dark:bg-black/20',
            bar: 'bg-foreground dark:bg-white',
            badge: 'bg-foreground/10 text-foreground dark:bg-white/10 dark:text-white',
            icon: '✦',
            glow: 'hidden'
          }
        : normalizedPlan === 'pro'
        ? { 
            bg: 'bg-background/50 dark:bg-black/20',
            bar: 'bg-foreground dark:bg-white',
            badge: 'bg-foreground/10 text-foreground dark:bg-white/10 dark:text-white',
            icon: '★',
            glow: 'hidden'
          }
        : { 
            bg: 'bg-background/50 dark:bg-black/20',
            bar: 'bg-muted-foreground/70 dark:bg-zinc-400',
            badge: 'bg-foreground/5 text-muted-foreground dark:bg-white/5 dark:text-zinc-300',
            icon: '◆',
            glow: 'hidden'
          }

    return (
        <>
            <Sidebar collapsible="icon">
                <SidebarHeader className="min-w-0">
                    {/* Full logo — hidden when sidebar is collapsed to icon strip */}
                    <div
                        className="group-data-[collapsible=icon]:hidden p-2 select-none"
                        onContextMenu={e => e.preventDefault()}
                        onDragStart={e => e.preventDefault()}
                        style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                            WebkitUserDrag: 'none',
                            KhtmlUserSelect: 'none',
                        }}
                    >
                        <Image
                            src={isDarkMode ? "/Chatboxai_logo_main_2.png" : "/Chatboxai_logo_main.png"}
                            alt="logo"
                            width={150}
                            height={40}
                            className="h-8 w-auto object-contain pointer-events-none"
                            draggable={false}
                            onContextMenu={e => e.preventDefault()}
                            onDragStart={e => e.preventDefault()}
                            style={{
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                MozUserSelect: 'none',
                                msUserSelect: 'none',
                                WebkitTouchCallout: 'none',
                                WebkitUserDrag: 'none',
                                KhtmlUserSelect: 'none',
                            }}
                        />
                    </div>
                    {/* Icon-only mark shown when collapsed */}
                    <div
                        className="hidden group-data-[collapsible=icon]:flex items-center justify-center py-2 select-none"
                        onContextMenu={e => e.preventDefault()}
                        onDragStart={e => e.preventDefault()}
                        style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitUserDrag: 'none' }}
                    >
                        <Image
                            src="/favicon.png"
                            alt="logo"
                            width={32}
                            height={32}
                            className="pointer-events-none"
                            draggable={false}
                            onContextMenu={e => e.preventDefault()}
                            onDragStart={e => e.preventDefault()}
                        />
                    </div>
                </SidebarHeader>

                <SidebarContent className="min-w-0">
                    {/* Main navigation */}
                    <SidebarGroup>
                        <SidebarMenu>
                            {navItems.map(item => {
                                const isActive = item.path === '/app'
                                    ? path === '/app'
                                    : item.path ? path?.startsWith(item.path) : false
                                return (
                                    <SidebarNavItem
                                        key={item.title}
                                        item={item}
                                        isActive={isActive}
                                        onOpenSearch={() => setShowSearchModal(true)}
                                    />
                                )
                            })}
                            {/* App Connections Button */}
                            {/* <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    tooltip="App Connections"
                                    className="px-3 py-2 text-sm rounded-md dark:text-white dark:hover:text-white"
                                >
                                    <button onClick={() => setShowAppConnectionPanel(true)} className="flex items-center gap-3">
                                        <Puzzle className="w-5 h-5" />
                                        <span className="text-sm">Apps</span>
                                    </button>
                                </SidebarMenuButton>
                            </SidebarMenuItem> */}
                        </SidebarMenu>
                    </SidebarGroup>

                    {/* History section — only for logged-in users, hidden when collapsed */}
                    {currentUser && (
                        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                            <SidebarGroupLabel>History</SidebarGroupLabel>
                            <SidebarMenu>
                                {sortedHistoryItems.map(item => (
                                    <HistorySidebarItem
                                        key={getHistoryItemKey(item)}
                                        item={item}
                                        editingItemKey={editingItemKey}
                                        editingTitle={editingTitle}
                                        setEditingTitle={setEditingTitle}
                                        submitRename={submitRename}
                                        cancelRename={cancelRename}
                                        renameLoadingKey={renameLoadingKey}
                                        deleteLoadingKey={deleteLoadingKey}
                                        startRename={startRename}
                                        setDeleteTarget={setDeleteTarget}
                                    />
                                ))}
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() => setShowSearchModal(true)}
                                        className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group/search"
                                    >
                                        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                                            <MoreHorizontal className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/search:scale-110" />
                                        </div>
                                        <span>Search all chats...</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    )}
                </SidebarContent>

                <SidebarFooter className="min-w-0">
                    {/* ── Credit Widget ───────────────────────────────────────────────────────
                         Visible only in expanded mode, only for logged-in users. */}
                    {currentUser && !userLoading && (
                        <div className={`group-data-[collapsible=icon]:hidden mx-2 mb-2 rounded-2xl ${planAccent.bg} overflow-hidden backdrop-blur-sm relative transition-all duration-300`}>
                            {/* Decorative background glow */}
                            <div className={`absolute -top-10 -right-10 w-24 h-24 ${planAccent.glow} opacity-[0.04] dark:opacity-[0.06] blur-2xl rounded-full pointer-events-none`} />
                            
                            {/* Header row */}
                            <div className="flex min-w-0 items-center justify-between gap-2 px-3.5 pt-3.5 pb-2 relative z-10">
                                <span className="text-xs font-bold tracking-wide text-foreground uppercase">Usage</span>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${planAccent.badge} flex items-center gap-1 uppercase tracking-wider`}>
                                    {planAccent.icon} {planLabel}
                                </span>
                            </div>

                            <div className="min-w-0 px-3.5 pb-3.5 space-y-3.5 relative z-10">
                                {/* ── Monthly Paid Credits (Pro / Max or expired with remaining credits) ── */}
                                {(isPaidPlan || monthlyPaidCredits > 0) && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">Premium Models</span>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <span className={`text-xs font-bold tabular-nums ${monthlyPaidCredits === 0 ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}>
                                                    {monthlyPaidCredits.toLocaleString()}
                                                </span>
                                                {paidCreditsCap > 0 ? (
                                                    <span className="text-[10px] font-medium text-muted-foreground">/ {paidCreditsCap.toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-muted-foreground">credits</span>
                                                )}
                                            </div>
                                        </div>
                                        {monthlyPaidCredits === 0 && (
                                            <p className="text-[10px] text-red-500 dark:text-red-400 font-medium">
                                                Paid credits exhausted — free models only
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* ── Daily Free Credits (all plans) ── */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">Standard Models</span>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <span className="text-xs font-bold text-foreground tabular-nums">
                                                {dailyFreeCredits.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-medium text-muted-foreground">/ {freeCreditsCap.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Upgrade nudge for free users */}
                                {!isPaidPlan && !isSpecial && (
                                    <button
                                        onClick={() => router.push('/pricing')}
                                        className="w-full mt-1 text-[11px] font-bold py-2 rounded-xl bg-foreground text-background dark:bg-white dark:text-black hover:opacity-90 shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98]"
                                    >
                                        Upgrade to Pro
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <SidebarMenu>
                        <SidebarMenuItem>
                            {currentUser ? (
                                /* Logged-in: dropdown trigger with initials + name + email */
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            size="lg"
                                            onMouseEnter={() => userChevronsRef.current?.startAnimation?.()}
                                            onMouseLeave={() => userChevronsRef.current?.stopAnimation?.()}
                                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground dark:text-white cursor-pointer"
                                        >
                                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                                <Image
                                                    src={selectedAvatar}
                                                    alt="Avatar"
                                                    width={32}
                                                    height={32}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-medium">
                                                    {resolvedDisplayName}
                                                </span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    {currentUser.email}
                                                </span>
                                            </div>
                                            <ChevronsUpDown ref={userChevronsRef} className="ml-auto size-4" />
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="w-56 min-w-56 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-xl p-1"
                                        side={isMobile ? 'bottom' : 'right'}
                                        align="end"
                                        sideOffset={8}
                                    >
                                        {/* User info header */}
                                        <DropdownMenuLabel className="p-0 font-normal">
                                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                                    <Image
                                                        src={selectedAvatar}
                                                        alt="Avatar"
                                                        width={32}
                                                        height={32}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                                                    <span className="truncate font-medium">
                                                        {resolvedDisplayName}
                                                    </span>
                                                    <span className="truncate text-xs text-muted-foreground">
                                                        {currentUser.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {/* Upgrade to Pro — hidden for special/pro accounts and while loading */}
                                        {!isSpecial && !hasActivePro && !userLoading && (
                                            <>
                                                <DropdownMenuGroup>
                                                    <AnimatedDropdownItem
                                                        icon={Crown}
                                                        iconClassName="text-amber-500 w-full h-full"
                                                        onClick={() => router.push('/pricing')}
                                                    >
                                                        <span>Upgrade plan</span>
                                                    </AnimatedDropdownItem>
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        <DropdownMenuGroup>
                                            <AnimatedDropdownItem icon={Smile} onClick={() => setShowAvatarModal(true)}>
                                                <span>Change Avatar</span>
                                            </AnimatedDropdownItem>
                                            <AnimatedDropdownItem icon={BadgeCheck} onClick={() => router.push('/settings?tab=account')}>
                                                <span>Account</span>
                                            </AnimatedDropdownItem>
                                            <AnimatedDropdownItem icon={CreditCard} onClick={() => router.push('/pricing')}>
                                                <span>Billing</span>
                                            </AnimatedDropdownItem>
                                            <AnimatedDropdownItem icon={Shield} onClick={() => router.push('/settings?tab=security')}>
                                                <span>Security</span>
                                            </AnimatedDropdownItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            <AnimatedDropdownItem icon={HelpCircle} onClick={() => router.push('/settings?tab=help')}>
                                                <span>Help</span>
                                            </AnimatedDropdownItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <AnimatedDropdownItem
                                            icon={LogOut}
                                            onClick={handleLogoutClick}
                                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                        >
                                            <span>Log out</span>
                                        </AnimatedDropdownItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                /* Logged-out: sign-in/up buttons (expanded) or person icon (collapsed) */
                                <>
                                    <div className="group-data-[collapsible=icon]:hidden space-y-2 p-1">
                                        <Link href="/sign-in">
                                            <Button
                                                variant="outline"
                                                className="w-full rounded-full font-semibold cursor-pointer h-11 border-border/60 hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <LogIn className="w-4 h-4 mr-2" />
                                                Sign In
                                            </Button>
                                        </Link>
                                        <Link href="/sign-up">
                                            <Button className="w-full rounded-full font-bold cursor-pointer p-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                                                Sign Up
                                            </Button>
                                        </Link>
                                    </div>
                                    <div className="hidden group-data-[collapsible=icon]:flex justify-center p-1">
                                        <SidebarMenuButton asChild tooltip="Sign In" className="w-8 h-8 justify-center">
                                            <Link href="/sign-in" prefetch>
                                                <User className="w-5 h-5" />
                                            </Link>
                                        </SidebarMenuButton>
                                    </div>
                                </>
                            )}
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>

                <SidebarRail />
            </Sidebar>

            <LogoutConfirmation
                isOpen={showLogoutConfirmation}
                onClose={handleLogoutCancel}
                onConfirm={handleLogoutConfirm}
            />
            {/* SettingsModal has been removed, using /settings route instead */}
            <AvatarPickerModal
                isOpen={showAvatarModal}
                onClose={() => setShowAvatarModal(false)}
                currentAvatar={selectedAvatar}
                onSelect={handleAvatarSelect}
            />

            <SearchChatModal
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
            />

            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open && !deleteLoadingKey) {
                        setDeleteTarget(null)
                    }
                }}
            >
                <AlertDialogContent className="max-w-[400px] rounded-2xl border-border/60 bg-card/95 text-card-foreground p-6 shadow-2xl backdrop-blur-md">
                    <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
                        <AlertDialogMedia className="w-12 h-12 rounded-xl flex items-center justify-center bg-destructive/10 text-destructive">
                            <Trash2Icon className="w-6 h-6" />
                        </AlertDialogMedia>
                        <div className="space-y-2">
                            <AlertDialogTitle className="text-xl font-semibold text-foreground">Delete chat?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                                This will permanently delete this chat conversation. View{" "}
                                <a href="/settings" className="underline text-foreground hover:text-primary">Settings</a> delete any memories saved during this chat.
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-row w-full gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={!!deleteLoadingKey}
                            className="flex-1 rounded-xl h-10 border border-border/60 bg-secondary/80 text-secondary-foreground hover:bg-secondary cursor-pointer"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={(e) => {
                                e.preventDefault()
                                confirmDelete()
                            }}
                            disabled={!!deleteLoadingKey}
                            className="flex-1 rounded-xl h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AppConnectionPanel
                isOpen={showAppConnectionPanel}
                onClose={() => setShowAppConnectionPanel(false)}
            />
        </>
    )
}

export default AppSidebar
