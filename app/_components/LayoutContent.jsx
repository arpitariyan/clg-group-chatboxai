'use client'

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Clock, Send, Download, MoreHorizontal, Settings, Trash2, EyeOff, MessageCircleDashed, Share2, Check, Copy, Twitter, Facebook, Linkedin, Mail, Link, QrCode } from '@/components/ui/animated-icon';
import { FaWhatsapp, FaTelegram } from 'react-icons/fa';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NextLink from 'next/link';
import moment from 'moment';
import { useState, useEffect, useRef, Suspense } from 'react';

function AnimatedDropdownMenuItem({ icon: Icon, children, onClick, className, iconSize = 16, ...props }) {
    const iconRef = useRef(null)
    const handleMouseEnter = () => iconRef.current?.startAnimation?.()
    const handleMouseLeave = () => iconRef.current?.stopAnimation?.()

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
                    <Icon ref={iconRef} size={iconSize} className="w-full h-full text-muted-foreground" />
                </div>
            )}
            {children}
        </DropdownMenuItem>
    )
}

function AppHeaderControls({
  isImageGenPage,
  isSnapshotPage,
  isSettingsPage,
  isAppConnectionsPage,
  isSearchResultsPage,
  handleDownload,
  openShareModal,
  sendIconRef,
  pathname,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isIncognito = searchParams?.get('incognito') === 'true';

  const toggleIncognito = () => {
    const newParams = new URLSearchParams(searchParams);
    if (isIncognito) {
      newParams.delete('incognito');
    } else {
      newParams.set('incognito', 'true');
    }
    router.push(`${pathname}?${newParams.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {!isImageGenPage && !isSnapshotPage && !isSettingsPage && !isAppConnectionsPage && (!isSearchResultsPage || isIncognito) && (
        <button
          onClick={toggleIncognito}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 shadow-sm ${
            isIncognito 
              ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-purple-500/10' 
              : 'bg-muted/40 text-muted-foreground border border-border/30 hover:bg-muted/60 hover:text-foreground cursor-pointer'
          }`}
          title={isIncognito ? 'Disable Incognito Mode' : 'Enable Incognito Mode'}
        >
          <MessageCircleDashed className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:block">Incognito</span>
        </button>
      )}

      {isSearchResultsPage && (
        <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 p-1.5 rounded-full border border-border/30 backdrop-blur-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer h-8 w-8 p-0 shrink-0 rounded-full transition-all duration-300 text-muted-foreground hover:text-foreground hover:bg-background"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/40">
              <DropdownMenuItem className="cursor-pointer gap-2 py-2" onClick={handleDownload}>
                <Download className="w-4 h-4 text-muted-foreground" />
                <span>Save as PDF</span>
              </DropdownMenuItem>
              
              <NextLink href="/settings" className="w-full">
                <DropdownMenuItem className="cursor-pointer gap-2 py-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </NextLink>

              {!isIncognito && (
                <>
                  <DropdownMenuSeparator className="bg-border/40" />
                  <DropdownMenuItem className="cursor-pointer gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Chat</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {!isIncognito && (
            <>
              <div className="w-px h-4 bg-border/60 mx-0.5" />

              <Button
                size="sm"
                onMouseEnter={() => sendIconRef.current?.startAnimation?.()}
                onMouseLeave={() => sendIconRef.current?.stopAnimation?.()}
                className="cursor-pointer h-8.5 px-4 ml-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-primary/25 flex items-center gap-1.5 group/share"
                onClick={openShareModal}
              >
                <Send ref={sendIconRef} size={14} className="w-3.5 h-3.5 transition-transform duration-200 group-hover/share:-translate-y-0.5 group-hover/share:translate-x-0.5 hidden sm:block" />
                <span>Share</span>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function LayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchInputRecord, setSearchInputRecord] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { currentUser } = useAuth();
  const sendIconRef = useRef(null);
  const shareIconRef = useRef(null);
  const copyIconRef = useRef(null);
  const linkIconRef = useRef(null);

  const handleDownload = () => {
    window.print();
  };

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Listen for search data updates
  useEffect(() => {
    const handleSearchDataUpdate = (event) => {
      setSearchInputRecord(event.detail);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('searchDataUpdated', handleSearchDataUpdate);
      
      // Check if there's already data available
      if (window.searchInputRecord) {
        setSearchInputRecord(window.searchInputRecord);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('searchDataUpdated', handleSearchDataUpdate);
      }
    };
  }, []);

  // Clear search data when navigating away from search pages
  useEffect(() => {
    if (!pathname?.includes('/search/')) {
      setSearchInputRecord(null);
      if (typeof window !== 'undefined') {
        window.searchInputRecord = null;
      }
    }
  }, [pathname]);

  // Function to truncate text based on screen size
  const truncateText = (text, wordLimit = 5) => {
    if (!text) return '';
    const words = text.split(' ');
    
    // More aggressive truncation on mobile to ensure buttons fit
    const limit = isMobile ? Math.min(wordLimit, 2) : wordLimit;
    
    if (words.length > limit) {
      return words.slice(0, limit).join(' ') + '...';
    }
    return text;
  };

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return pathname || '';
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      
      // Optional: Show a visual feedback for copy action
      // You could add a toast notification here if you have a toast system
      // console.log('Link copied to clipboard');
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          // console.log('Link copied to clipboard (fallback)');
        } else {
          console.error('Failed to copy link');
        }
      } catch (fallbackErr) {
        console.error('Failed to copy link:', fallbackErr);
      }
    }
  };

  const openShareModal = () => {
    const url = getShareUrl();
    setShareUrl(url);
    setIsShareOpen(true);
    // Reset copied state when opening modal
    setCopied(false);
  };

  const handleSocialShare = (platform) => {
    const url = encodeURIComponent(getShareUrl());
    const title = encodeURIComponent("Check out this AI conversation!");
    
    let shareLink = '';
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;
        break;
      case 'whatsapp':
        shareLink = `https://api.whatsapp.com/send?text=${title} ${url}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${url}&text=${title}`;
        break;
      case 'email':
        shareLink = `mailto:?subject=${title}&body=${url}`;
        break;
      default:
        return;
    }
    window.open(shareLink, '_blank', 'noopener,noreferrer');
  };

  // Check if current page is an auth page
  const isAuthPage = pathname?.includes('/sign-in') ||
    pathname?.includes('/sign-up') ||
    pathname?.includes('/forgot-password');

  // Check if current page is a website-builder page
  const isWebsiteBuilderPage = pathname?.includes('/website-builder');

  // Check if current page is an editorial landing subpage
  const isLandingSubPage = [
    '/ai-models',
    '/deep-research',
    '/security',
    '/developers',
    '/researchers',
    '/creators',
    '/mobile-app',
  ].some((route) => pathname === route || pathname?.startsWith(route + '/'));

  // Check if current page is the landing page or an editorial landing subpage
  const isLandingPage = pathname === '/' || isLandingSubPage;

  // Pricing page is a dedicated full-screen route
  const isPricingPage = pathname?.startsWith('/pricing');

  // Check if current page is a public legal page
  const isPublicPage = pathname?.includes('/help-center') ||
    pathname?.includes('/privacy-policy') ||
    pathname?.includes('/terms-conditions');

  // Check if current page is a docs page — render without app sidebar
  const isDocsPage = pathname?.startsWith('/docs');

  const isSearchResultsPage = pathname?.includes('/search/');
  const isImageGenPage = pathname?.includes('/image-gen/');
  const isSnapshotPage = pathname?.includes('/snapshot');
  const isSettingsPage = pathname?.includes('/settings');
  const isAppConnectionsPage = pathname?.includes('/connections');
  const isSupportPage = pathname?.startsWith('/support');
  const isAppPage = pathname === '/app';
  const isFigmaPage = pathname?.startsWith('/figma');
  const isFullscreenRoute = isAppPage || isSearchResultsPage || isImageGenPage || isSupportPage || isFigmaPage;

  if (isAuthPage) {
    return (
      <AuthProvider renderWhileLoading>
        <div className="h-screen w-full overflow-hidden bg-background">
          {children}
        </div>
      </AuthProvider>
    );
  }

  // Landing page - pure dark canvas #0f0f11, no sidebar, no header
  if (isLandingPage) {
    return (
      <AuthProvider renderWhileLoading>
        <div className="min-h-screen w-full bg-[#0f0f11] text-[#f2f2f4]">
          {children}
        </div>
      </AuthProvider>
    );
  }

  // Public pages and pricing - no sidebar, no header, just content
  if (isPublicPage || isPricingPage) {
    return (
      <AuthProvider renderWhileLoading>
        <div className="min-h-screen w-full bg-background">
          {children}
        </div>
      </AuthProvider>
    );
  }

  // Docs pages — full screen, no app sidebar, no app header
  if (isDocsPage) {
    return (
      <AuthProvider renderWhileLoading>
        <div className="min-h-screen w-full bg-background">
          {children}
        </div>
      </AuthProvider>
    );
  }

  // Full-screen layout for website-builder (no sidebar, no header)
  if (isWebsiteBuilderPage) {
    return (
      <AuthProvider renderWhileLoading>
        <div className="h-screen w-full overflow-hidden bg-background">
          {children}
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <UserProvider>
        <SidebarProvider>
          <div className="h-screen w-full flex overflow-hidden bg-background text-foreground transition-colors duration-300">
          <AppSidebar />
          <main className="flex-1 flex flex-col h-screen w-full overflow-hidden min-w-0 bg-background">
            {/* Header - always visible for SidebarTrigger access, no divider line */}
            <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60 shrink-0 transition-colors duration-200">
              <div className="flex h-14 md:h-16 items-center px-4 md:px-6 gap-3">
                <SidebarTrigger className="h-9 w-9 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-lg p-2 transition-all duration-200 shrink-0 shadow-xs border border-transparent hover:border-border/50" />

                <div className="flex-1 flex items-center justify-between gap-3 md:gap-5 min-w-0">
                  {searchInputRecord ? (
                    <div className="flex items-center gap-3 min-w-0 flex-1 px-2">
                      <div className="flex items-center gap-2 text-muted-foreground shrink-0 bg-muted/50 px-2.5 py-1 rounded-full border border-border/40">
                        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary/70" />
                        <span className="text-[11px] md:text-[13px] font-medium tracking-tight whitespace-nowrap">{moment(searchInputRecord?.created_at).fromNow()}</span>
                      </div>
                      <div className="hidden sm:block h-4 w-px bg-border/80" />
                      <span className="text-sm md:text-[15px] text-foreground/90 font-medium truncate">
                        {truncateText(searchInputRecord?.searchInput, 8)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}

                  <Suspense fallback={<div className="h-8 w-20" />}>
                    <AppHeaderControls
                      isImageGenPage={isImageGenPage}
                      isSnapshotPage={isSnapshotPage}
                      isSettingsPage={isSettingsPage}
                      isAppConnectionsPage={isAppConnectionsPage}
                      isSearchResultsPage={isSearchResultsPage}
                      handleDownload={handleDownload}
                      openShareModal={openShareModal}
                      sendIconRef={sendIconRef}
                      pathname={pathname}
                    />
                  </Suspense>
                </div>
              </div>
            </header>

            {/* Main Content - Responsive */}
            <div className={`flex-1 flex flex-col w-full min-h-0 bg-background transition-colors duration-300 ${!isSupportPage && !isFigmaPage ? 'overflow-y-auto' : 'overflow-hidden'}`}>
              <div className={`flex-1 flex flex-col w-full ${isFullscreenRoute ? 'h-full min-h-0' : 'min-h-full p-4 md:p-8 max-w-7xl mx-auto'}`}>
                {children}
              </div>
            </div>
          </main>
          <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl p-0 overflow-hidden rounded-2xl">
              <div className="px-6 pt-6 pb-4">
                <DialogHeader className="mb-5">
                  <DialogTitle
                    className="text-xl font-semibold flex items-center gap-2.5 text-foreground cursor-pointer group/title"
                    onMouseEnter={() => shareIconRef.current?.startAnimation?.()}
                    onMouseLeave={() => shareIconRef.current?.stopAnimation?.()}
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <Share2 ref={shareIconRef} size={18} className="w-4.5 h-4.5" />
                    </div>
                    <span>Share this conversation</span>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Anyone with this link will be able to view this conversation.
                  </p>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Link Input Section — Premium Styling & Clean Input */}
                  <div
                    className="flex items-center gap-2.5 bg-muted/40 hover:bg-muted/60 p-2 rounded-2xl border border-border/50 transition-colors group/link"
                    onMouseEnter={() => linkIconRef.current?.startAnimation?.()}
                    onMouseLeave={() => linkIconRef.current?.stopAnimation?.()}
                  >
                    <div className="bg-background rounded-xl p-2 shrink-0 border border-border/40 shadow-xs text-muted-foreground group-hover/link:text-foreground transition-colors">
                      <Link ref={linkIconRef} size={16} className="w-4 h-4" />
                    </div>
                    <Input 
                      value={shareUrl} 
                      readOnly 
                      className="flex-1 bg-transparent border-0 shadow-none h-9 focus-visible:ring-0 px-1 text-xs font-mono text-foreground/90 select-all cursor-pointer font-medium" 
                      onClick={(e) => e.target.select()}
                    />
                    <Button 
                      onClick={handleCopyLink} 
                      onMouseEnter={() => copyIconRef.current?.startAnimation?.()}
                      onMouseLeave={() => copyIconRef.current?.stopAnimation?.()}
                      variant={copied ? "default" : "secondary"}
                      size="sm"
                      className={`shrink-0 rounded-xl h-9 px-4 text-xs font-semibold transition-all duration-300 active:scale-95 shadow-sm ${
                        copied 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20' 
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {copied ? (
                        <span className="flex items-center gap-1.5"><Check ref={copyIconRef} size={14} className="w-3.5 h-3.5" /> Copied</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Copy ref={copyIconRef} size={14} className="w-3.5 h-3.5" /> Copy</span>
                      )}
                    </Button>
                  </div>

                  <div className="h-px w-full bg-border/40" />

                  {/* Share Options Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    <button onClick={() => handleSocialShare('whatsapp')} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-11 h-11 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-center group-hover:bg-[#25D366]/15 group-hover:border-[#25D366]/30 group-hover:scale-110 active:scale-95 transition-all duration-200">
                        <FaWhatsapp className="w-5 h-5 text-muted-foreground group-hover:text-[#25D366] transition-colors" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">WhatsApp</span>
                    </button>
                    <button onClick={() => handleSocialShare('twitter')} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-11 h-11 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-center group-hover:bg-[#1DA1F2]/15 group-hover:border-[#1DA1F2]/30 group-hover:scale-110 active:scale-95 transition-all duration-200">
                        <Twitter className="w-5 h-5 text-muted-foreground group-hover:text-[#1DA1F2] transition-colors" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">X</span>
                    </button>
                    <button onClick={() => handleSocialShare('linkedin')} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-11 h-11 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-center group-hover:bg-[#0A66C2]/15 group-hover:border-[#0A66C2]/30 group-hover:scale-110 active:scale-95 transition-all duration-200">
                        <Linkedin className="w-5 h-5 text-muted-foreground group-hover:text-[#0A66C2] transition-colors" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">LinkedIn</span>
                    </button>
                    <button onClick={() => handleSocialShare('facebook')} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-11 h-11 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-center group-hover:bg-[#1877F2]/15 group-hover:border-[#1877F2]/30 group-hover:scale-110 active:scale-95 transition-all duration-200">
                        <Facebook className="w-5 h-5 text-muted-foreground group-hover:text-[#1877F2] transition-colors" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Facebook</span>
                    </button>
                    <button onClick={() => handleSocialShare('telegram')} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-11 h-11 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-center group-hover:bg-[#0088cc]/15 group-hover:border-[#0088cc]/30 group-hover:scale-110 active:scale-95 transition-all duration-200">
                        <FaTelegram className="w-5 h-5 text-muted-foreground group-hover:text-[#0088cc] transition-colors" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Telegram</span>
                    </button>
                    <button onClick={() => handleSocialShare('email')} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-11 h-11 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-center group-hover:bg-primary/15 group-hover:border-primary/30 group-hover:scale-110 active:scale-95 transition-all duration-200">
                        <Mail className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Email</span>
                    </button>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex flex-col items-center justify-center pt-2">
                    <div className="p-3 bg-white rounded-2xl border border-border/20 shadow-md inline-block hover:scale-[1.02] transition-transform duration-200">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}&margin=0`}
                            alt="QR Code"
                            className="w-28 h-28 object-contain"
                        />
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 font-medium">
                        <QrCode className="w-3.5 h-3.5 text-primary" /> Scan to open on mobile
                    </div>
                  </div>

                </div>
              </div>
              <DialogFooter className="px-6 py-3.5 bg-muted/20 border-t border-border/40 sm:justify-between flex-row items-center">
                <Button className='cursor-pointer w-full rounded-xl h-10 font-semibold border-border/50 hover:bg-muted/80 active:scale-[0.99] transition-all' variant="outline" onClick={() => setIsShareOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarProvider>
    </UserProvider>
    </AuthProvider>
  );
}