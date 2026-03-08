"use client"
import React, { useState, useEffect, useMemo } from 'react'
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
import {
    Search,
    GalleryHorizontalEnd,
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
} from 'lucide-react'
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
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeContext'
import { toast } from '@/lib/alert'
import Link from 'next/link'
import LogoutConfirmation from './LogoutConfirmation'
import PackagesModal from './modals/PackagesModal'
import SettingsModal from './modals/SettingsModal'
import AvatarPickerModal from './modals/AvatarPickerModal'


const navItems = [
    { title: 'Home', icon: Search, path: '/app' },
    { title: 'Snapshot', icon: Sparkles, path: '/snapshot' },
    { title: 'Library', icon: GalleryHorizontalEnd, path: '/library' },
]

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
    return `${item.libId}-${item.dataType}`
}

const AppSidebar = () => {
    const path = usePathname()
    const router = useRouter()
    const { currentUser, logout } = useAuth()
    const { userData, plan = 'free', isPro = false } = useUser() || {}
    const { isDarkMode } = useTheme()
    const { isMobile } = useSidebar()

    const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
    const [showPackagesModal, setShowPackagesModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [showAvatarModal, setShowAvatarModal] = useState(false)
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
                const res = await fetch(
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
    }, [currentUser?.email])

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
            const response = await fetch('/api/library/update', {
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
            const response = await fetch('/api/library/delete', {
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
    const hasActivePro = plan === 'pro' || isPro

    return (
        <>
            <Sidebar collapsible="icon">
                <SidebarHeader className="bg-accent dark:bg-[oklch(0.209_0_0)]">
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
                            width={200}
                            height={100}
                            className="pointer-events-none"
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

                <SidebarContent className="dark:bg-[oklch(0.209_0_0)]">
                    {/* Main navigation */}
                    <SidebarGroup>
                        <SidebarMenu>
                            {navItems.map(item => {
                                const isActive = item.path === '/app'
                                    ? path === '/app'
                                    : path?.startsWith(item.path)
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={item.title}
                                            className="p-5 py-5 dark:text-white dark:hover:text-white"
                                        >
                                            <a href={item.path}>
                                                <item.icon className="w-5 h-5" />
                                                <span className="text-lg">{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroup>

                    {/* History section — only for logged-in users, hidden when collapsed */}
                    {currentUser && (
                        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                            <SidebarGroupLabel>History</SidebarGroupLabel>
                            <SidebarMenu>
                                {sortedHistoryItems.map(item => {
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
                                                    <a href={meta.url} title={item.title}>
                                                        <Icon className="w-4 h-4 shrink-0" />
                                                        <span className="truncate text-sm">{truncateTitle(item.title)}</span>
                                                    </a>
                                                )}
                                            </SidebarMenuButton>

                                            {!isEditing && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <SidebarMenuAction
                                                            showOnHover
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                            }}
                                                        >
                                                            <MoreHorizontal />
                                                            <span className="sr-only">Open chat menu</span>
                                                        </SidebarMenuAction>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent side="right" align="start" sideOffset={8}>
                                                        <DropdownMenuItem
                                                            disabled={isDeleting || isRenaming}
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                startRename(item)
                                                            }}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                            <span>Rename</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600 dark:text-red-400"
                                                            disabled={isDeleting || isRenaming}
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setDeleteTarget(item)
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            <span>Delete Chat</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </SidebarMenuItem>
                                    )
                                })}
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() => router.push('/library')}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                        <span>More</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    )}
                </SidebarContent>

                <SidebarFooter className="bg-accent dark:bg-[oklch(0.209_0_0)]">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {currentUser ? (
                                /* Logged-in: dropdown trigger with initials + name + email */
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            size="lg"
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
                                            <ChevronsUpDown className="ml-auto size-4" />
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="w-56 min-w-56 rounded-lg"
                                        side={isMobile ? 'bottom' : 'right'}
                                        align="end"
                                        sideOffset={4}
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
                                                <div className="grid flex-1 text-left text-sm leading-tight">
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
                                        {/* Upgrade to Pro — hidden for special/pro accounts */}
                                        {!isSpecial && !hasActivePro && (
                                            <>
                                                <DropdownMenuGroup>
                                                    <DropdownMenuItem onClick={() => setShowPackagesModal(true)}>
                                                        <Crown className="text-amber-500" />
                                                        <span>Upgrade to Pro</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem onClick={() => setShowAvatarModal(true)}>
                                                <Smile />
                                                Change Avatar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setShowSettingsModal(true)}>
                                                <BadgeCheck />
                                                Account
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setShowPackagesModal(true)}>
                                                <CreditCard />
                                                Billing
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setShowSettingsModal(true)}>
                                                <Shield />
                                                Security
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem onClick={() => router.push('/help-center')}>
                                                <HelpCircle />
                                                Help
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={handleLogoutClick}
                                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                        >
                                            <LogOut />
                                            Log out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                /* Logged-out: sign-in/up buttons (expanded) or person icon (collapsed) */
                                <>
                                    <div className="group-data-[collapsible=icon]:hidden space-y-2 p-1">
                                        <Link href="/sign-in">
                                            <Button
                                                variant="outline"
                                                className="w-full rounded-full font-bold cursor-pointer p-6 border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary bg-white dark:bg-[oklch(0.2478_0_0)] text-gray-900 dark:text-white"
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
                                            <a href="/sign-in">
                                                <User className="w-5 h-5" />
                                            </a>
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
            <PackagesModal
                isOpen={showPackagesModal}
                onClose={() => setShowPackagesModal(false)}
            />
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
            />
            <AvatarPickerModal
                isOpen={showAvatarModal}
                onClose={() => setShowAvatarModal(false)}
                currentAvatar={selectedAvatar}
                onSelect={handleAvatarSelect}
            />

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
                        <DialogTitle>Delete chat?</DialogTitle>
                        <DialogDescription>
                            This will permanently remove this chat from your history. This action cannot be undone.
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
                            {deleteLoadingKey ? 'Deleting...' : 'Delete Chat'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default AppSidebar
