'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Cpu, Network, Shield, CreditCard, Code, PenTool, GraduationCap, Users, Link as LinkIcon, Book, HelpCircle } from '@/components/ui/animated-icon';
import { Smartphone as SmartphoneIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  {
    label: 'Product',
    items: [
      { href: '/#models', label: 'AI Models', icon: Cpu, desc: '56+ frontier models in one place' },
      { href: '/#deep-research', label: 'Deep Research', icon: Network, desc: 'Autonomous multi-step research' },
      { href: '/#security', label: 'Security', icon: Shield, desc: 'Enterprise-grade data protection' },
      { href: '/#pricing', label: 'Pricing', icon: CreditCard, desc: 'Flexible plans for everyone' },
    ]
  },
  {
    label: 'Solutions',
    items: [
      { href: '/#use-cases', label: 'For Developers', icon: Code, desc: 'Code generation & debugging' },
      { href: '/#use-cases', label: 'For Creators', icon: PenTool, desc: 'Content & design generation' },
      { href: '/#use-cases', label: 'For Students', icon: GraduationCap, desc: 'Interactive study guides' },
      { href: '/#use-cases', label: 'For Teams', icon: Users, desc: 'Shared workspace & memory' },
    ]
  },
  {
    label: 'Ecosystem',
    items: [
      { href: '/#integrations', label: 'Integrations', icon: LinkIcon, desc: 'Connect with your favorite tools' },
      { href: '/mobile-app', label: 'Android App', icon: SmartphoneIcon, desc: 'Download the native APK' },
      { href: '/docs', label: 'API Documentation', icon: Book, desc: 'Build on top of ChatBoxAI' },
    ]
  },
  {
    label: 'Resources',
    items: [
      { href: '/help-center', label: 'Help Center', icon: HelpCircle, desc: 'Guides, FAQs, and support' },
    ]
  }
];

export default function GlobalNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const lastScrollY = useRef(0);
  const { currentUser } = useAuth();
  
  // Close dropdowns when clicking outside
  const navRef = useRef(null);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;

    // Top state vs scrolled state
    if (currentScrollY > 20) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }

    // Hide/show on scroll direction
    if (currentScrollY > 300 && currentScrollY > lastScrollY.current && !activeDropdown && !isMobileMenuOpen) {
      setIsHidden(true);
    } else {
      setIsHidden(false);
    }

    lastScrollY.current = currentScrollY;
  }, [activeDropdown, isMobileMenuOpen]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Handle outside click for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle body scroll locking for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  return (
    <motion.header
      ref={navRef}
      initial={{ y: 0 }}
      animate={{ y: isHidden ? '-100%' : '0%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ease-in-out ${
        isScrolled || activeDropdown || isMobileMenuOpen
          ? 'bg-[#0c0a09]/95 backdrop-blur-2xl border-b border-white/5'
          : 'bg-[#0c0a09] border-b border-white/5 lg:bg-transparent lg:border-transparent'
      }`}
      role="navigation"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" onClick={() => { setIsMobileMenuOpen(false); setActiveDropdown(null); }}>
            <div className={`relative transition-all duration-300 ease-in-out ${isScrolled ? 'w-32 h-8' : 'w-40 h-10'}`}>
              <Image
                src="/Chatboxai_logo_main_2.png"
                alt="ChatBox AI"
                fill
                className="object-contain brightness-200"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation (Mega Menu) */}
          <nav className="hidden lg:flex items-center h-full">
            {NAV_ITEMS.map((section, idx) => (
              <div 
                key={idx} 
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveDropdown(idx)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  onClick={() => setActiveDropdown(activeDropdown === idx ? null : idx)}
                  className={`flex items-center gap-1.5 px-4 h-full text-sm font-medium transition-colors ${
                    activeDropdown === idx ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {section.label}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeDropdown === idx ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Panel */}
                <AnimatePresence>
                  {activeDropdown === idx && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute top-full left-1/2 -translate-x-1/2 w-[480px] p-2 bg-[#0e0c0b] border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
                    >
                      <div className="grid grid-cols-2 gap-1 bg-white/[0.02] rounded-xl p-2">
                        {section.items.map((item, itemIdx) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={itemIdx}
                              href={item.href}
                              onClick={() => setActiveDropdown(null)}
                              className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                            >
                              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#5a4a7a]/20 group-hover:border-[#5a4a7a]/30 transition-colors">
                                <Icon className="w-4 h-4 text-neutral-400 group-hover:text-[#a855f7] transition-colors" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-white mb-0.5 group-hover:text-[#c084fc] transition-colors">{item.label}</h4>
                                <p className="text-[11px] text-neutral-500 leading-snug">{item.desc}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {currentUser ? (
              <Button asChild className="bg-white text-black hover:bg-neutral-200 rounded-md h-9 px-5 text-sm font-medium transition-all">
                <Link href="/app">Go to App</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-neutral-400 hover:text-white hover:bg-white/5 h-9 rounded-md px-4 text-sm font-medium transition-colors">
                  <Link href="/sign-in">Log in</Link>
                </Button>
                <Button asChild className="bg-white text-black hover:bg-neutral-200 rounded-md h-9 px-5 text-sm font-medium transition-all shadow-sm">
                  <Link href="/sign-up">Start Free</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100vh' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden fixed inset-x-0 top-16 md:top-20 bg-[#0c0a09] border-t border-white/5 flex flex-col overflow-y-auto"
          >
            <div className="flex flex-col p-4 gap-6 pb-24">
              {NAV_ITEMS.map((section, idx) => (
                <div key={idx} className="flex flex-col">
                  <h3 className="text-[11px] font-mono text-[#8a7aaa] uppercase tracking-widest mb-3 px-2">{section.label}</h3>
                  <div className="flex flex-col gap-1">
                    {section.items.map((item, i) => (
                      <Link
                        key={i}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <item.icon className="w-5 h-5 text-neutral-400" />
                        <span className="text-sm font-medium text-white">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t border-white/10 pt-6 mt-2 flex flex-col gap-3 px-2">
                {currentUser ? (
                  <Button asChild size="lg" className="w-full bg-white text-black hover:bg-neutral-200 rounded-lg h-11 text-sm font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                    <Link href="/app">Go to App</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" size="lg" className="w-full border-white/10 text-white hover:bg-white/5 rounded-lg h-11 text-sm font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                      <Link href="/sign-in">Log in</Link>
                    </Button>
                    <Button asChild size="lg" className="w-full bg-white text-black hover:bg-neutral-200 rounded-lg h-11 text-sm font-medium shadow-sm" onClick={() => setIsMobileMenuOpen(false)}>
                      <Link href="/sign-up">Start for Free</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
