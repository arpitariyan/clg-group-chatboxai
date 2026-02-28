"use client"
import React, { useState } from 'react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import Image from 'next/image'
import { Compass, GalleryHorizontalEnd, Ghost, LogIn, Globe, Search, LogOut, User, Moon, Sun, Crown, Settings, Zap, Sparkles } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FiArrowUpRight } from "react-icons/fi";
import { TiWorld } from "react-icons/ti";
import { FaInstagram } from "react-icons/fa";
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'
import LogoutConfirmation from './LogoutConfirmation'
import PackagesModal from './modals/PackagesModal'
import SettingsModal from './modals/SettingsModal'


const MenuOptions = [
    {
        title: 'Home',
        icons: Search,
        path: '/app',
    },
    {
        title: 'Snapshot',
        icons: Sparkles,
        path: '/snapshot',
    },
    {
        title: 'Library',
        icons: GalleryHorizontalEnd,
        path: '/library',
    },
]

const AppSidebar = () => {
    const path = usePathname();
    const router = useRouter();
    const { currentUser, logout } = useAuth();
    const { plan = 'free', credits = 0, isPro = false, isSpecialAccount = false, loading = true } = useUser() || {};
    const { isDarkMode, toggleTheme } = useTheme();
    const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
    const [showPackagesModal, setShowPackagesModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const handleLogoutClick = () => {
        setShowLogoutConfirmation(true);
    };

    const handleLogoutConfirm = async () => {
        try {
            await logout();
            setShowLogoutConfirmation(false);
            router.push('/sign-in');
        } catch (error) {
            console.error('Logout error:', error);
            setShowLogoutConfirmation(false);
        }
    };

    const handleLogoutCancel = () => {
        setShowLogoutConfirmation(false);
    };

    // Get user's initials for profile icon
    const getUserInitials = (user) => {
        if (user?.displayName) {
            return user.displayName.split(' ').map(name => name[0]).join('').toUpperCase();
        }
        if (user?.email) {
            return user.email[0].toUpperCase();
        }
        return 'U';
    };

    // Extract and format user's name from email
    const getUserNameFromEmail = (user) => {
        if (user?.displayName) {
            const name = user.displayName;
            return name.length > 5 ? name.substring(0, 5) + '…' : name;
        }

        if (user?.email) {
            // Extract name from email (part before @)
            const emailName = user.email.split('@')[0];
            // Remove numbers, dots, underscores, and hyphens, then capitalize
            const cleanName = emailName.replace(/[0-9._-]/g, '');
            const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

            // Truncate if longer than 5 characters
            return formattedName.length > 5 ? formattedName.substring(0, 5) + '…' : formattedName;
        }

        return 'User';
    };

    return (
        <>
            <Sidebar>
                <SidebarHeader className="bg-accent dark:bg-[oklch(0.209_0_0)] flex items-center p-5">
                    <div
                        className="relative select-none"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                            WebkitUserDrag: 'none',
                            KhtmlUserSelect: 'none'
                        }}
                    >
                        <Image
                            src={isDarkMode ? "/Chatboxai_logo_main_2.png" : "/Chatboxai_logo_main.png"}
                            alt='logo'
                            width={200}
                            height={100}
                            className="pointer-events-none"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                            onDragStart={(e) => e.preventDefault()}
                            style={{
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                MozUserSelect: 'none',
                                msUserSelect: 'none',
                                WebkitTouchCallout: 'none',
                                WebkitUserDrag: 'none',
                                KhtmlUserSelect: 'none'
                            }}
                        />
                    </div>
                </SidebarHeader>
                <SidebarContent className="bg-accent dark:bg-[oklch(0.209_0_0)]">
                    <SidebarGroup >
                        <SidebarContent>
                            <SidebarMenu>
                                {MenuOptions.map((menu, index) => {
                                    // Better path matching logic
                                    const isActive = menu.path === '/'
                                        ? path === '/'
                                        : path?.startsWith(menu.path);

                                    return (
                                        <SidebarMenuItem key={index}>
                                            <SidebarMenuButton asChild
                                                className={`p-5 py-5 hover:bg-transparent hover:font-bold dark:text-white dark:hover:text-white ${isActive ? 'font-bold' : ''}`}>
                                                <a href={menu.path} className=''>
                                                    <menu.icons className='w-5 h-5' />
                                                    <span className='text-lg'>{menu.title}</span>
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>

                            {/* Authentication Section */}
                            {currentUser ? (
                                // User Profile Section
                                <div className="mx-5 mt-4 space-y-3">
                                    {/* User Info */}
                                    <div
                                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[oklch(0.2478_0_0)] rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[oklch(0.25_0_0)] transition-colors"
                                        onClick={() => setShowSettingsModal(true)}
                                    >
                                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                                            {getUserInitials(currentUser)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {getUserNameFromEmail(currentUser)}
                                                </p>
                                                {isPro && (
                                                    <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                                                        {isSpecialAccount ? (
                                                            <>
                                                                <Crown className="w-3 h-3 mr-1" />
                                                                Pro
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Crown className="w-3 h-3 mr-1" />
                                                                Pro
                                                            </>
                                                        )}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-gray-500 dark:text-gray-300 truncate">
                                                    {currentUser.email}
                                                </p>
                                                <Settings className="w-3 h-3 text-gray-400" />
                                            </div>
                                            {!loading && (
                                                <p className="text-xs text-gray-400 dark:text-gray-400">
                                                    {(credits || 0).toLocaleString()} credits
                                                </p>
                                            )}
                                        </div>
                                    </div>


                                    {/* Plan Action Button */}
                                    {(() => {
                                        // Direct email check - special account should NEVER see Try Pro button
                                        if (currentUser?.email === 'arpitariyanm@gmail.com') {
                                            return (
                                                <div className="flex items-center justify-center p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                                    <div className="flex items-center gap-2">
                                                        <Crown className="w-4 h-4 text-amber-600" />
                                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                                            Pro User
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // For other users, check if they have Pro plan
                                        const hasActivePro = plan === 'pro' || isPro;

                                        return !hasActivePro ? (
                                            <Button
                                                onClick={() => setShowPackagesModal(true)}
                                                className="w-full rounded-full font-bold cursor-pointer p-6 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
                                            >
                                                <Crown className="w-4 h-4 mr-2" />
                                                Try Pro
                                            </Button>
                                        ) : (
                                            <div className="flex items-center justify-center p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                                <div className="flex items-center gap-2">
                                                    <Crown className="w-4 h-4 text-amber-600" />
                                                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                                        Pro User
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}


                                    {/* Logout Button */}
                                    <Button
                                        onClick={handleLogoutClick}
                                        variant="outline"
                                        className="w-full rounded-full font-bold cursor-pointer p-6 border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-[oklch(0.2478_0_0)] text-gray-900 dark:text-white"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Sign Out
                                    </Button>
                                </div>
                            ) : (
                                // Sign In/Sign Up Buttons
                                <div className="mx-5 mt-4 space-y-3">
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
                            )}

                        </SidebarContent>
                    </SidebarGroup>
                    <SidebarGroup />
                </SidebarContent>
                <SidebarFooter className='bg-accent dark:bg-[oklch(0.209_0_0)]'>

                    {/* Theme Toggle Button */}
                    {/* <div className='p-5 pb-3'>
                    <Button 
                        onClick={toggleTheme}
                        variant="outline" 
                        className="w-full rounded-full font-bold cursor-pointer p-6 border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary bg-white dark:bg-[oklch(0.2478_0_0)] text-gray-900 dark:text-white"
                    >
                        {isDarkMode ? (
                            <>
                                <Sun className="w-4 h-4 mr-2" />
                                Light Mode
                            </>
                        ) : (
                            <>
                                <Moon className="w-4 h-4 mr-2" />
                                Dark Mode
                            </>
                        )}
                    </Button>
                </div> */}

                    <div className='p-5 pt-0'>
                        {(() => {
                            // Direct email check - special account should NEVER see Try Pro section
                            if (currentUser?.email === 'arpitariyanm@gmail.com') {
                                return null; // Hide the entire section for special account
                            }

                            // For other users, check if they have Pro plan
                            const hasActivePro = plan === 'pro' || isPro;

                            return !hasActivePro ? (
                                <>
                                    <h3 className='text-gray-500 dark:text-white font-bold mb-2'>Try Pro</h3>
                                    <p className='text-gray-400 dark:text-gray-300 mb-3'>
                                        {currentUser ?
                                            'Upgrade for more credits, advanced models and premium features.' :
                                            'Upgrade for image upload, smarter AI and more copilot.'}
                                    </p>
                                    <Button
                                        onClick={() => setShowPackagesModal(true)}
                                        className='cursor-pointer text-primary-foreground bg-primary hover:bg-primary/90'
                                    >
                                        <FiArrowUpRight /> Try Now
                                    </Button>
                                </>
                            ) : null;
                        })()}
                    </div>

                    <div className='flex items-space-between justify-between p-5'>
                        <h2 className='text-gray-500 dark:text-white font-bold'>Contact</h2>
                        <div className='flex items-center gap-2 text-gray-500 dark:text-gray-300'>

                            <a href="https://technon.co.in/" className="hover:text-primary dark:hover:text-primary transition-colors"><TiWorld className='w-6 h-6' /></a>
                            <a href="https://www.instagram.com/chatboxai_uiux/?igsh=amxzamd0OWxpaWhi#" className="hover:text-primary dark:hover:text-primary transition-colors"><FaInstagram className='w-5 h-5' /></a>
                        </div>
                    </div>

                </SidebarFooter>
            </Sidebar>

            {/* Logout Confirmation Dialog */}
            <LogoutConfirmation
                isOpen={showLogoutConfirmation}
                onClose={handleLogoutCancel}
                onConfirm={handleLogoutConfirm}
            />

            {/* Packages Modal */}
            <PackagesModal
                isOpen={showPackagesModal}
                onClose={() => setShowPackagesModal(false)}
            />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
            />
        </>
    );
};

export default AppSidebar;
