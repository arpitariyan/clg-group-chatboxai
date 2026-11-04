'use client';

import { useState, useMemo } from 'react';
import { Check, Search, Plus, Puzzle } from '@/components/ui/animated-icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppConnections } from '@/contexts/AppConnectionContext';
import { useRouter } from 'next/navigation';
import { FOCUS_RING, TOOLBAR_PILL } from '@/components/surface';

/**
 * AppSelectorPopover - Compact searchable dropdown for selecting connected apps
 * Designed to never overflow the layout regardless of how many apps are connected.
 * Works like a combobox: search → select → badge appears.
 *
 * Colour note: the selected state is emerald, matching CONNECTED_BADGE in
 * components/surface.js, because both report the same thing — a live connection.
 * It was `green-500` foreground on a `green-500/10` fill, which does not reach
 * 4.5:1 in light mode; the 600/400 pair does.
 *
 * `onOpenChange` exists for the two fixed composers, which collapse their
 * secondary row on blur. Radix portals this content outside the card, so the
 * blur that happens when the popover opens looks exactly like "focus left the
 * composer" — the composer has to be told the menu is what took focus.
 */
export default function AppSelectorPopover({
  selectedApp,
  onSelectApp,
  onOpenChange,
}) {
  const { connectedApps } = useAppConnections();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const changeOpen = (next) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const activeApps = useMemo(() => {
    return (connectedApps || []).filter(c => c.status === 'active');
  }, [connectedApps]);

  const filteredApps = useMemo(() => {
    if (!search.trim()) return activeApps;
    const q = search.toLowerCase();
    return activeApps.filter(app =>
      (app.appName || '').toLowerCase().includes(q)
    );
  }, [activeApps, search]);

  const handleSelect = (app) => {
    if (selectedApp?.appId === app.appId) {
      onSelectApp(null); // Deselect
    } else {
      onSelectApp(app);
    }
    changeOpen(false);
    setSearch('');
  };

  // Don't render if no connected apps and no manage option needed
  // Actually always render so user can access "Connect Apps"
  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={selectedApp ? `Connected app: ${selectedApp.appName}. Change or disconnect` : 'Select a connected app'}
          className={[
            TOOLBAR_PILL,
            selectedApp &&
            'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400',
          ].filter(Boolean).join(' ')}
        >
          {selectedApp ? (
            <>
              {selectedApp.appIcon && (
                <img src={selectedApp.appIcon} alt="" className="w-4 h-4 object-contain rounded-sm" />
              )}
              <span className="hidden sm:inline max-w-20 truncate">{selectedApp.appName}</span>
            </>
          ) : (
            <>
              <Puzzle className="h-4 w-4" />
              <span className="hidden sm:inline">Apps</span>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-60 p-0 rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
      >
        {/* Search input */}
        {activeApps.length > 3 && (
          <div className="p-2 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                aria-label="Search connected apps"
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full h-8 pl-8 pr-3 rounded-lg bg-muted/40 border-0 text-sm text-foreground placeholder:text-muted-foreground outline-none ${FOCUS_RING}`}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Apps list */}
        <div className="max-h-50 overflow-y-auto p-1 scrollbar-hide">
          {activeApps.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No apps connected yet
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-muted-foreground">
              No apps match &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredApps.map(app => {
              const isSelected = selectedApp?.appId === app.appId
              return (
                <button
                  key={app.appId}
                  type="button"
                  onClick={() => handleSelect(app)}
                  aria-pressed={isSelected}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${FOCUS_RING} ${isSelected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-foreground/80 hover:bg-muted/50'
                    }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md overflow-hidden border shrink-0 ${isSelected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/40 bg-muted/40'
                    }`}>
                    {app.appIcon ? (
                      <img src={app.appIcon} alt="" className="w-4 h-4 object-contain" />
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground">{app.appName?.[0]}</span>
                    )}
                  </div>
                  <span className="flex-1 text-left text-[13px] font-medium truncate">{app.appName}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer: Manage Apps. Deliberately not accented — it is navigation, and
            the old orange was a ninth hue with no assigned meaning. */}
        <div className="border-t border-border/40 p-1">
          <button
            type="button"
            onClick={() => { router.push('/app/connections'); changeOpen(false); }}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/70 transition-colors hover:bg-muted/50 ${FOCUS_RING}`}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-inset text-ink-2 shadow-hairline">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span className="text-[13px] font-medium">
              {activeApps.length > 0 ? 'Manage Apps' : 'Connect Apps'}
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
