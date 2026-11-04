'use client';

import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sources AI Element
 * Standardized grid / row of web and document research source cards.
 */
export function Sources({
  sources = [],
  title = 'Sources',
  className,
}) {
  if (!sources || sources.length === 0) return null;

  return (
    <div data-slot="ai-sources" className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
        <span className="text-[11px] text-muted-foreground">{sources.length} sources</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {sources.map((source, idx) => (
          <a
            key={source.url || idx}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between p-2.5 rounded-xl border border-border/60 bg-card/60 hover:bg-accent/40 hover:border-border transition-all shadow-xs"
          >
            <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
              {source.favicon ? (
                <img src={source.favicon} alt="" className="size-3.5 rounded-xs shrink-0" />
              ) : (
                <Globe className="size-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-[11px] text-muted-foreground group-hover:text-foreground truncate transition-colors">
                {source.domain || source.site || 'Web'}
              </span>
            </div>

            <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug group-hover:underline">
              {source.title || source.name}
            </p>

            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
              <span>#{idx + 1}</span>
              <ExternalLink className="size-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default Sources;
