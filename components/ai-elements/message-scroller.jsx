'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Message Scroller AI Element
 * Viewport container that automatically scrolls down during stream, and provides a jump-to-bottom button when scrolled up.
 */
export function MessageScroller({
  children,
  autoScroll = true,
  className,
}) {
  const containerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
  };

  useEffect(() => {
    if (autoScroll && !showScrollBottom) {
      scrollToBottom();
    }
  }, [children, autoScroll, showScrollBottom]);

  return (
    <div className={cn('relative flex-1 overflow-hidden flex flex-col', className)}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-slot="ai-message-scroller"
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar"
      >
        {children}
      </div>

      {showScrollBottom && (
        <Button
          size="icon"
          variant="outline"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 size-9 rounded-full shadow-lg bg-card/90 backdrop-blur-md border border-border/60 hover:bg-accent text-foreground cursor-pointer z-20 animate-in fade-in"
          title="Scroll to bottom"
        >
          <ArrowDown className="size-4" />
        </Button>
      )}
    </div>
  );
}

export default MessageScroller;
