'use client'

import { useEffect, useState, useRef } from "react";

export function useMessageScrollerVisibility(messageIds) {
  const [visibleMessageIds, setVisibleMessageIds] = useState([]);
  const [currentAnchorId, setCurrentAnchorId] = useState(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // Clean up any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Map to keep track of which IDs are currently intersecting
    const visibilityMap = new Map();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-message-id");
          if (entry.isIntersecting) {
            visibilityMap.set(id, true);
          } else {
            visibilityMap.delete(id);
          }
        });

        // Filter original IDs to maintain correct document order
        const visible = messageIds.filter((id) => visibilityMap.has(id));
        setVisibleMessageIds(visible);

        // Define the "anchored" item as the first visible item in view
        if (visible.length > 0) {
          setCurrentAnchorId(visible[0]);
        } else {
          setCurrentAnchorId(null);
        }
      },
      {
        root: null, // uses the viewport
        rootMargin: "-10% 0px -10% 0px", // slight inset to trigger anchor precisely
        threshold: 0.1, // triggers when 10% of the element is visible
      }
    );

    // Observe all message elements matching the IDs
    messageIds.forEach((id) => {
      const el = document.getElementById(`msg-${id}`);
      if (el) observerRef.current.observe(el);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [messageIds]);

  // Function to smoothly scroll to a specific target anchor
  const scrollToAnchor = (id) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return { currentAnchorId, visibleMessageIds, scrollToAnchor };
}

/**
 * Message Scroller UI Component
 * Renders a tall vertical minimap of dashes on the right edge,
 * and shows a popover outline when hovered.
 */
export function MessageScroller({ messages, currentAnchorId, visibleMessageIds, scrollToAnchor, className = '' }) {
    const [isHovered, setIsHovered] = useState(false);
    
    if (!messages || messages.length < 2) return null;

    return (
        <div 
            className={`fixed top-1/2 right-2 md:right-4 -translate-y-1/2 z-50 hidden md:flex items-center ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Popover Panel (Transcript Outline) */}
            <div 
                className={`absolute right-full pr-4 transition-all duration-300 transform origin-right ${
                    isHovered 
                        ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto' 
                        : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
                }`}
            >
                <div className="w-[300px] max-h-[70vh] overflow-y-auto bg-[#171717] dark:bg-[oklch(0.2200_0_0)] border border-[#262626] dark:border-gray-700/60 rounded-xl p-4 shadow-2xl flex flex-col pointer-events-auto">
                    
                    <div className="flex flex-col gap-1.5">
                        {messages.map((msg, index) => {
                            const isCurrentAnchor = currentAnchorId === msg.id;
                            const isVisible = visibleMessageIds.includes(msg.id);
                            
                            // Use title or displayQuestion from the message object
                            const displayTitle = msg.displayQuestion || msg.title || `Message ${index + 1}`;

                            return (
                                <button
                                    key={`nav-${msg.id}`}
                                    onClick={() => scrollToAnchor(msg.id)}
                                    className={`flex items-start gap-2.5 bg-transparent border-none text-left cursor-pointer p-2 rounded-lg w-full transition-colors duration-200 hover:bg-white/5 ${
                                        isCurrentAnchor 
                                            ? 'text-white font-medium bg-white/5' 
                                            : (isVisible ? 'text-[#b4b4b4]' : 'text-gray-500')
                                    }`}
                                >
                                    <span className="text-[13px] leading-tight line-clamp-2">
                                        {displayTitle}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Vertical Dashes Column (ChatGPT style Minimap) */}
            <div className="flex flex-col items-center justify-center gap-[6px] py-4 px-2 w-8 rounded-full transition-colors cursor-pointer bg-transparent">
                {messages.map((msg, idx) => {
                    const isCurrentAnchor = currentAnchorId === msg.id;
                    return (
                        <div 
                            key={`dash-${msg.id}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                scrollToAnchor(msg.id);
                            }}
                            className={`h-[2px] rounded-full transition-all duration-300 ${
                                isCurrentAnchor 
                                    ? 'w-4 bg-gray-900 dark:bg-white' 
                                    : 'w-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-400'
                            }`}
                        />
                    )
                })}
            </div>
        </div>
    );
}
