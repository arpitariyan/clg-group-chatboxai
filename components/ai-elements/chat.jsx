'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MessageScroller } from './message-scroller';
import { PromptInput } from './prompt-input';

/**
 * Chat AI Element
 * Composed full chat interface container with message stream and input dock.
 */
export function Chat({
  messages = [],
  inputProps,
  children,
  className,
}) {
  return (
    <div
      data-slot="ai-chat"
      className={cn('flex flex-col h-full w-full max-w-4xl mx-auto overflow-hidden', className)}
    >
      <MessageScroller className="flex-1">
        {children || (
          <div className="space-y-4 max-w-3xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <div key={msg.id || idx}>{msg}</div>
            ))}
          </div>
        )}
      </MessageScroller>

      {inputProps && (
        <div className="p-4 max-w-3xl mx-auto w-full">
          <PromptInput {...inputProps} />
        </div>
      )}
    </div>
  );
}

export default Chat;
