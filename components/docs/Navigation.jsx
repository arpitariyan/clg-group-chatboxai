'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import SearchModal from './SearchModal';

export function Navigation() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { href: '/docs', label: 'Docs' },
    { href: '/docs/quickstart', label: 'API Reference' },
    { href: '/docs/changelog', label: 'Changelog' },
    { href: '/', label: 'Platform ↗' },
  ];

  return (
    <>
      <header className="docs-navigation">
      <Link href="/docs" className="docs-nav-logo">
        <Image
          src="/Chatboxai_logo_main_2.png"
          alt="ChatboxAI"
          width={140}
          height={36}
          style={{ height: '30px', width: 'auto' }}
          priority
        />
      </Link>

      <div className="docs-nav-divider" />

      <nav className="docs-nav-links">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`docs-nav-link${pathname === link.href ? ' active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button className="docs-nav-search" type="button" aria-label="Search docs" onClick={() => setIsSearchOpen(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--docs-text-faint)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <span className="docs-nav-search-text">Search docs...</span>
        <span className="docs-nav-search-kbd">⌘K</span>
      </button>

      <Link href="/settings?tab=api-keys" className="docs-nav-cta">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
        Get API Key
      </Link>
    </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

export default Navigation;
