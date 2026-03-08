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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_0_0_rgba(255,255,255,0.04)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center transition-all duration-300 ${scrolled ? 'h-16' : 'h-20'}`}>
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/Chatboxai_logo_main_2.png"
              alt="ChatBox AI"
              width={150}
              height={40}
              className={`transition-all duration-300 brightness-200 ${scrolled ? 'h-6 sm:h-7 w-auto' : 'h-7 sm:h-8 w-auto'}`}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {['#features', '#pricing', '/help-center'].map((href, i) => {
              const labels = ['Features', 'Pricing', 'Help'];
              return (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200 whitespace-nowrap"
                >
                  {labels[i]}
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <Link href="/app">
                <Button className="bg-violet-600 hover:bg-violet-500 text-white focus-minimal text-sm px-5 h-9 rounded-lg transition-all duration-200 shadow-lg shadow-violet-900/30">
                  Go to App
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button
                    variant="ghost"
                    className="text-gray-400 hover:text-white hover:bg-white/[0.06] focus-minimal text-sm px-4 h-9 rounded-lg transition-all duration-200"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-violet-600 hover:bg-violet-500 text-white focus-minimal text-sm px-5 h-9 rounded-lg transition-all duration-200 shadow-lg shadow-violet-900/30">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-gray-400" />
            ) : (
              <Menu className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {[['#features', 'Features'], ['#pricing', 'Pricing'], ['/help-center', 'Help']].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="block px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors font-medium text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="pt-3 space-y-2 border-t border-white/[0.06]">
                {currentUser ? (
                  <Link href="/app" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white">Go to App</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-white/10 text-gray-300 hover:bg-white/[0.06] bg-transparent">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white">Get Started</Button>
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
