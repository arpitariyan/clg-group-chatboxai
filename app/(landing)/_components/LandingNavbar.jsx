'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { currentUser } = useAuth();

  // Detect scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center transition-all duration-300 ${
          scrolled ? 'h-16' : 'h-20'
        }`}>
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/Chatboxai_logo_main_2.png"
              alt="ChatBox AI"
              width={150}
              height={40}
              className={`transition-all duration-300 ${
                scrolled ? 'h-6 sm:h-7 w-auto' : 'h-7 sm:h-8 w-auto'
              }`}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap"
            >
              Pricing
            </Link>
            <Link
              href="/help-center"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap"
            >
              Help
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            {currentUser ? (
              <Link href="/app">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white focus-minimal text-sm px-4 lg:px-6 whitespace-nowrap">
                  Go to App
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" className="text-gray-700 cursor-pointer dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus-minimal text-sm px-3 lg:px-4 whitespace-nowrap">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-violet-600 cursor-pointer hover:bg-violet-700 text-white focus-minimal text-sm px-4 lg:px-6 whitespace-nowrap">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu with Slide Animation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              <Link
                href="#features"
                className="block px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="block px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/help-center"
                className="block px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Help
              </Link>
              
              <div className="pt-3 space-y-2 border-t border-gray-200 dark:border-gray-800">
                {currentUser ? (
                  <Link href="/app" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                      Go to App
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

