'use client';

import React from 'react';
import { Sparkles, Check, ChevronDown, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Model Selector AI Element
 * Standardized dropdown selector for AI models, capabilities, and token context limits.
 */
export function ModelSelector({
  models = [],
  selectedModelId,
  onSelectModel,
  disabled = false,
  className,
}) {
  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0] || {
    id: 'gpt-4o',
    name: 'Default Model',
    provider: 'OpenAI',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          data-slot="ai-model-selector"
          className={cn(
            'inline-flex items-center gap-2 h-8 px-2.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
            disabled && 'opacity-50 pointer-events-none',
            className
          )}
        >
          <Cpu className="size-3.5 text-primary" />
          <span className="font-semibold truncate max-w-36">{selectedModel.name}</span>
          <ChevronDown className="size-3 text-muted-foreground ml-auto opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 max-h-80 overflow-y-auto p-1 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-xl"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Select AI Model
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/40" />

        {models.map((model) => {
          const isSelected = model.id === selectedModel.id;
          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onSelectModel?.(model.id)}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors',
                isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent'
              )}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold truncate">{model.name}</span>
                  {model.badge && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                      {model.badge}
                    </span>
                  )}
                </div>
                {model.description && (
                  <span className="text-[11px] text-muted-foreground truncate">{model.description}</span>
                )}
              </div>
              {isSelected && <Check className="size-3.5 text-primary shrink-0 ml-2" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ModelSelector;
