'use client'

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Clock, Link, Send } from 'lucide-react';
import moment from 'moment';
import { useState, useEffect } from 'react';

export default function LayoutContent({ children }) {
  const pathname = usePathname();
  const [searchInputRecord, setSearchInputRecord] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

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
          console.log('Link copied to clipboard (fallback)');
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

  // Check if current page is an auth page
  const isAuthPage = pathname?.includes('/sign-in') ||
    pathname?.includes('/sign-up') ||
    pathname?.includes('/forgot-password');

  // Check if current page is a website-builder page
  const isWebsiteBuilderPage = pathname?.includes('/website-builder');

  // Check if current page is the landing page
  const isLandingPage = pathname === '/';

  // Check if current page is a public legal page
  const isPublicPage = pathname?.includes('/help-center') ||
    pathname?.includes('/privacy-policy') ||
    pathname?.includes('/terms-conditions');

  // Check if current page is a search results page (DisplayResult.jsx)
  const isSearchResultsPage = pathname?.includes('/search/');

  if (isAuthPage) {
    return (
      <AuthProvider>
        <div className="h-screen w-full overflow-hidden bg-background dark:bg-[oklch(0.2478_0_0)]">
          {children}
        </div>
      </AuthProvider>
    );
  }

  // Landing page and public pages - no sidebar, no header, just content
  if (isLandingPage || isPublicPage) {
    return (
      <AuthProvider>
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
          {children}
        </div>
      </AuthProvider>
    );
  }

  // Full-screen layout for website-builder (no sidebar, no header)
  if (isWebsiteBuilderPage) {
    return (
      <AuthProvider>
        <div className="h-screen w-full overflow-hidden bg-gray-900">
          {children}
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="h-screen w-full flex overflow-hidden bg-background dark:bg-[oklch(0.2478_0_0)]">
          <AppSidebar />
          <main className="flex-1 flex flex-col h-screen w-full overflow-hidden min-w-0 bg-background dark:bg-[oklch(0.2478_0_0)]">
            {/* Header with Project Name - Responsive */}
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 dark:bg-[oklch(0.2478_0_0)]/95 backdrop-blur supports-backdrop-filter:bg-background/60 dark:supports-backdrop-filter:bg-[oklch(0.2478_0_0)]/60 shrink-0 dark:border-gray-700">
              <div className="flex h-14 md:h-16 items-center px-3 md:px-6">
                <SidebarTrigger className="mr-2 md:mr-4 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md p-2 transition-colors shrink-0" />
                
                <div className='flex-1 flex items-center justify-between gap-2 md:gap-4 min-w-0'>
                  {searchInputRecord ? (
                    <div className='flex flex-col md:flex-row md:items-center gap-1 md:gap-4 min-w-0 flex-1 mr-2'>
                      <div className='flex items-center gap-2 text-muted-foreground dark:text-gray-400 shrink-0'>
                        <Clock className='w-3 h-3 md:w-4 md:h-4' />
                        <span className='text-xs md:text-sm whitespace-nowrap'>{moment(searchInputRecord?.created_at).fromNow()}</span>
                      </div>
                      <div className='min-w-0 flex-1'>
                        <span className='block text-xs md:text-sm text-muted-foreground dark:text-gray-400 truncate'>
                          {truncateText(searchInputRecord?.searchInput, 6)}
                        </span>
                      </div>
                    </div>
                  ) : <div className='flex-1' />}
                  {/* Only show Link and Share buttons on search results page */}
                  {isSearchResultsPage && (
                    <div className='flex items-center gap-1 md:gap-2 shrink-0'>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className={`cursor-pointer h-8 w-8 md:h-9 md:w-9 p-0 shrink-0 ${copied ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : ''}`}
                        onClick={handleCopyLink}
                        title="Copy link"
                      >
                        <Link className={`w-3 h-3 md:w-4 md:h-4 ${copied ? 'text-green-600 dark:text-green-400' : ''}`} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className='cursor-pointer h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm shrink-0'
                        onClick={openShareModal}
                        title="Share this page"
                      >
                        <Send className='w-3 h-3 md:w-4 md:h-4 mr-1' />
                        <span className='hidden sm:inline'>Share</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
          </header>

            {/* Main Content - Responsive */}
            <div className="flex-1 overflow-y-auto w-full bg-background dark:bg-[oklch(0.2478_0_0)]">
              <div className="min-h-full p-3 md:p-6">
                {children}
              </div>
            </div>
          </main>
          <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Share this page</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="flex-1" 
                  onClick={(e) => e.target.select()} // Select all text when clicked
                />
                <Button 
                  onClick={handleCopyLink} 
                  variant="default" 
                  className={`shrink-0 cursor-pointer ${copied ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <DialogFooter>
                <Button className='cursor-pointer' variant="outline" onClick={() => setIsShareOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}