'use client';

import React from 'react';
import { Bot, User, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Message AI Element
 * Standardized message row with avatar, role badge, timestamp, body, and actions.
 */
export function Message({
  role = 'assistant', // 'user' | 'assistant' | 'system'
  content,
  timestamp,
  modelName,
  avatar,
  actions = true,
  children,
  className,
}) {
  const isUser = role === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (typeof content === 'string') {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      data-slot="ai-message"
      data-role={role}
      className={cn(
        'group flex gap-3.5 py-4 px-2 sm:px-4 rounded-2xl transition-colors',
        isUser ? 'bg-muted/30 ml-auto max-w-2xl' : 'bg-transparent w-full',
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border/60 text-primary'
        )}
      >
        {avatar ? (
          <img src={avatar} alt="" className="size-full rounded-xl object-cover" />
        ) : isUser ? (
          <User className="size-4" />
        ) : (
          <Bot className="size-4" />
        )}
      </div>

      {/* Content Container */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {isUser ? 'You' : modelName || 'ChatBox AI'}
          </span>
          {timestamp && <span className="text-[11px] font-mono opacity-60">{timestamp}</span>}
        </div>

        <div className="text-sm leading-relaxed text-foreground select-text space-y-2">
          {content || children}
        </div>

        {/* Message Actions */}
        {!isUser && actions && (
          <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Copy message"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Helpful"
            >
              <ThumbsUp className="size-3.5" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Unhelpful"
            >
              <ThumbsDown className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Message;
