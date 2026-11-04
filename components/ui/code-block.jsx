'use client';

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CodeBlock UI Component
 * Code container with syntax header, language badge, line numbers, and copy action.
 */
function CodeBlock({
  language = "javascript",
  code = "",
  title,
  showLineNumbers = false,
  className,
  children,
}) {
  const [copied, setCopied] = React.useState(false);
  const textContent = code || (typeof children === "string" ? children : "");

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      data-slot="code-block"
      className={cn(
        "rounded-2xl border border-border/60 bg-neutral-950 text-neutral-100 overflow-hidden font-mono text-xs shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {title || language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <div className="p-4 overflow-x-auto leading-relaxed">
        <pre className="text-neutral-200 whitespace-pre font-mono">
          {textContent || children}
        </pre>
      </div>
    </div>
  );
}

export { CodeBlock };
export default CodeBlock;
