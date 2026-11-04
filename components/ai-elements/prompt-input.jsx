'use client';

import React, { useRef } from 'react';
import { ArrowUp, Paperclip, Mic, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Prompt Input AI Element
 * Standardized AI prompt input with autogrow textarea, attachment tray, and action triggers.
 * Follows shadcn/ui base-nova geometry.
 */
export function PromptInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading = false,
  placeholder = 'Ask anything...',
  children,
  attachments = [],
  onRemoveAttachment,
  className,
}) {
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value?.trim()) {
        onSubmit?.(e);
      }
    }
  };

  return (
    <div
      data-slot="ai-prompt-input"
      className={cn(
        'relative w-full rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md p-3 shadow-sm transition-all focus-within:border-ring/60 focus-within:ring-1 focus-within:ring-ring/40',
        className
      )}
    >
      {/* Attachment Tray */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 mb-2 border-b border-border/40">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs text-foreground font-medium"
            >
              <Paperclip className="size-3 text-muted-foreground" />
              <span className="truncate max-w-40">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment?.(idx)}
                className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="w-full resize-none bg-transparent px-1 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-11 max-h-48 leading-relaxed"
      />

      {/* Toolbar / Actions */}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/30">
        <div className="flex items-center gap-1.5">{children}</div>

        <div className="flex items-center gap-1.5">
          {isLoading ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onClick={onStop}
              className="size-8 rounded-lg cursor-pointer"
              title="Stop generation"
            >
              <StopCircle className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={onSubmit}
              disabled={!value?.trim()}
              className="size-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer disabled:opacity-30 transition-all shadow-xs"
              title="Send prompt"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PromptInput;
