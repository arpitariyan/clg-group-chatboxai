'use client';

import { Check, X, Puzzle, ArrowRight, Loader2 } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * Component mapping panel with match suggestions and confirm/reject buttons.
 * Shows Figma components matched to existing codebase components.
 */
export default function ComponentMappingPanel({
  mappings = [],
  onConfirm,
  onReject,
  loading,
}) {
  if (!mappings || mappings.length === 0) return null;

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30';
    if (confidence >= 80) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30';
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Puzzle className="w-4 h-4" />
          Component Mappings
          <Badge variant="secondary" className="ml-auto text-2.5">
            {mappings.length} match{mappings.length !== 1 ? 'es' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full max-h-100">
          <div className="space-y-2 px-4 pb-4">
            {mappings.map((mapping, index) => (
              <div
                key={mapping.figmaComponentId || index}
                className="p-3 rounded-lg border bg-card space-y-2"
              >
                {/* Mapping header: Figma → Local */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium truncate max-w-[40%]">
                    {mapping.figmaComponentName}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs truncate max-w-[40%] text-violet-600 dark:text-violet-400">
                    {mapping.localComponentName}
                  </span>
                </div>

                {/* Import path */}
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {mapping.localComponentPath}
                </p>

                {/* Confidence + Actions */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-2.5 ${getConfidenceColor(mapping.confidence)}`}
                  >
                    {mapping.confidence}% match
                  </Badge>

                  {mapping.confirmed === undefined ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onConfirm?.(mapping)}
                        disabled={loading}
                        className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      >
                        {loading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span className="ml-1 text-xs">Confirm</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReject?.(mapping)}
                        disabled={loading}
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="ml-1 text-xs">Reject</span>
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={mapping.confirmed ? 'default' : 'destructive'} className="text-2.5">
                      {mapping.confirmed ? 'Confirmed' : 'Rejected'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
