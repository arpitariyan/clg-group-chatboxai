'use client';

import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Inline Citation AI Element
 * Compact numeric pill chip with hover/click popover preview.
 */
export function InlineCitation({
  index = 1,
  title,
  domain,
  snippet,
  url,
  favicon,
  className,
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="ai-inline-citation"
          className={cn(
            'inline-flex items-center justify-center align-super mx-0.5 px-1.5 py-0.2 rounded-md',
            'bg-muted/80 hover:bg-primary/15 text-foreground hover:text-primary text-[10px] font-mono font-semibold',
            'border border-border/60 transition-colors cursor-pointer shadow-2xs',
            className
          )}
          title={title || domain || `Citation ${index}`}
        >
          {index}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-72 p-3 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-xl text-xs space-y-2"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {favicon ? (
              <img src={favicon} alt="" className="size-3.5 rounded-xs shrink-0" />
            ) : (
              <Globe className="size-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium text-foreground truncate">{domain || 'Source'}</span>
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        {title && <h5 className="font-semibold text-foreground line-clamp-2">{title}</h5>}
        {snippet && <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">{snippet}</p>}
      </PopoverContent>
    </Popover>
  );
}

export default InlineCitation;
