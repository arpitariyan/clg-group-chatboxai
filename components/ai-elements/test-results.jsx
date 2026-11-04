'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Test Results AI Element
 * Pass/fail assertion dashboard for generated code and tool runs.
 */
export function TestResults({
  suite = 'Test Suite',
  passed = 0,
  failed = 0,
  duration,
  tests = [],
  className,
}) {
  const total = passed + failed;
  const allPassed = failed === 0;

  return (
    <div
      data-slot="ai-test-results"
      className={cn('rounded-2xl border border-border/60 bg-card/60 p-4 shadow-xs space-y-3', className)}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : (
            <XCircle className="size-4 text-destructive" />
          )}
          <h4 className="text-xs font-semibold text-foreground">{suite}</h4>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-500 font-semibold">{passed} passed</span>
          {failed > 0 && <span className="text-destructive font-semibold">{failed} failed</span>}
          {duration && (
            <span className="text-muted-foreground font-mono text-[11px] flex items-center gap-1">
              <Clock className="size-2.5" />
              {duration}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {tests.map((test, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30 border border-border/30 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              {test.status === 'passed' ? (
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="size-3 text-destructive shrink-0" />
              )}
              <span className="font-medium text-foreground truncate">{test.name}</span>
            </div>
            {test.duration && <span className="text-[10px] text-muted-foreground font-mono">{test.duration}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestResults;
