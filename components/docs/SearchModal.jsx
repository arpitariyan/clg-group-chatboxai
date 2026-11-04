"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Let the parent component handle opening, but we can't do that from here easily if it's mounted inside Navigation.
          // Wait, this component is mounted and controlled by Navigation. Navigation will handle the Cmd+K to open it.
        }
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          router.push(results[selectedIndex].slug);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, router]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/docs-search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--docs-text-muted)' }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-modal-input"
          />
          <button className="search-modal-close" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="search-modal-body scrollbar-hide">
          {query.trim().length > 0 && query.trim().length < 2 && (
            <div className="search-modal-empty">Type at least 2 characters to search...</div>
          )}
          
          {isSearching && results.length === 0 && (
            <div className="search-modal-empty">Searching...</div>
          )}

          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <div className="search-modal-empty">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="search-modal-results">
              <div className="search-modal-section-title">Documentation</div>
              {results.map((result, index) => (
                <Link
                  key={result.slug}
                  href={result.slug}
                  className={`search-modal-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={onClose}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="search-item-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div className="search-item-content">
                    <div className="search-item-title">{result.title}</div>
                    {result.snippet && (
                      <div className="search-item-snippet">
                        {/* Simple highlight logic for the snippet */}
                        {result.snippet.split(new RegExp(`(${query})`, 'gi')).map((part, i) => 
                          part.toLowerCase() === query.toLowerCase() 
                            ? <mark key={i} className="search-highlight">{part}</mark> 
                            : <span key={i}>{part}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="search-item-enter">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 10 4 15 9 20"></polyline>
                      <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .search-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 12vh;
        }
        .search-modal-container {
          width: 100%;
          max-width: 640px;
          background: var(--docs-surface);
          border: 1px solid var(--docs-border);
          border-radius: 12px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 70vh;
        }
        .search-modal-header {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--docs-border);
          gap: 12px;
        }
        .search-modal-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--docs-text);
          font-size: 16px;
          outline: none;
          font-family: var(--docs-font);
        }
        .search-modal-input::placeholder {
          color: var(--docs-text-muted);
        }
        .search-modal-close {
          background: var(--docs-surface-2);
          border: 1px solid var(--docs-border);
          color: var(--docs-text-faint);
          font-size: 10px;
          padding: 3px 6px;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--docs-mono);
        }
        .search-modal-body {
          overflow-y: auto;
          padding: 12px;
          background: var(--docs-bg);
        }
        .search-modal-empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--docs-text-muted);
          font-size: 14px;
        }
        .search-modal-section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--docs-text-faint);
          padding: 8px 12px;
        }
        .search-modal-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          text-decoration: none;
          cursor: pointer;
        }
        .search-modal-item.selected {
          background: var(--docs-accent-glow);
        }
        .search-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--docs-surface);
          border: 1px solid var(--docs-border);
          border-radius: 6px;
          color: var(--docs-text-muted);
          flex-shrink: 0;
        }
        .search-modal-item.selected .search-item-icon {
          color: var(--primary);
          border-color: var(--docs-accent-border);
        }
        .search-item-content {
          flex: 1;
          overflow: hidden;
        }
        .search-item-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--docs-text);
          margin-bottom: 3px;
        }
        .search-modal-item.selected .search-item-title {
          color: var(--primary);
        }
        .search-item-snippet {
          font-size: 12px;
          color: var(--docs-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .search-highlight {
          background: transparent;
          color: var(--primary);
          font-weight: 600;
          text-decoration: underline;
          text-decoration-color: var(--docs-accent-border);
        }
        .search-item-enter {
          opacity: 0;
          color: var(--primary);
        }
        .search-modal-item.selected .search-item-enter {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
