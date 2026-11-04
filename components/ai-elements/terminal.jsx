'use client';

import React from 'react';
import { Terminal as TerminalIcon, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Terminal AI Element
 * Standardized code execution console window with macOS-style controls and output buffer.
 */
export function Terminal({
  command,
  output,
  title = 'bash',
  className,
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const text = `${command ? `$ ${command}\n` : ''}${output || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-slot="ai-terminal"
      className={cn(
        'rounded-2xl border border-border/60 bg-neutral-950 text-neutral-100 overflow-hidden font-mono text-xs shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500/80" />
            <span className="size-2.5 rounded-full bg-amber-500/80" />
            <span className="size-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] text-neutral-400 font-medium ml-2 flex items-center gap-1">
            <TerminalIcon className="size-3 text-neutral-400" />
            {title}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          title="Copy console output"
        >
          {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
        </button>
      </div>

      <div className="p-4 space-y-1.5 overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
        {command && (
          <div className="text-emerald-400 flex items-start gap-1.5">
            <span className="opacity-60 select-none">$</span>
            <span className="font-semibold">{command}</span>
          </div>
        )}
        {output && <pre className="text-neutral-300 whitespace-pre-wrap">{output}</pre>}
      </div>
    </div>
  );
}

export default Terminal;
