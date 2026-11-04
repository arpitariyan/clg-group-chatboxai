'use client';

import { useState } from 'react';
import { Copy, Check, Palette, Type, Ruler, Square, Layers } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * Tabbed design token display.
 * Shows extracted tokens organized by category: Colors, Typography, Spacing, Borders, Shadows.
 */
export default function DesignTokensPanel({ tokens = {}, format = 'css', formattedOutput = '' }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');

  if (!tokens || Object.keys(tokens).length === 0) return null;

  const categories = [
    { id: 'colors', label: 'Colors', icon: Palette, tokens: tokens.colors || [] },
    { id: 'typography', label: 'Typography', icon: Type, tokens: tokens.typography || [] },
    { id: 'spacing', label: 'Spacing', icon: Ruler, tokens: tokens.spacing || [] },
    { id: 'borders', label: 'Borders', icon: Square, tokens: tokens.borders || [] },
    { id: 'shadows', label: 'Shadows', icon: Layers, tokens: tokens.shadows || [] },
  ];

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(formattedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const renderColorToken = (token) => (
    <div key={token.name} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50">
      <div
        className="w-8 h-8 rounded-md border shadow-sm shrink-0"
        style={{ backgroundColor: token.value }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{token.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{token.value}</p>
      </div>
    </div>
  );

  const renderTypographyToken = (token) => (
    <div key={token.name} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{token.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{token.value}</p>
      </div>
      {token.cssVariable && (
        <Badge variant="outline" className="text-2.5 shrink-0 ml-2">
          {token.cssVariable}
        </Badge>
      )}
    </div>
  );

  const renderGenericToken = (token) => (
    <div key={token.name} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{token.name}</p>
        {token.description && (
          <p className="text-xs text-muted-foreground">{token.description}</p>
        )}
      </div>
      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono shrink-0 ml-2">
        {token.value}
      </code>
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Design Tokens</CardTitle>
        {formattedOutput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAll}
            className="h-7 px-2 text-xs gap-1"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            Copy {format.toUpperCase()}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col px-4">
          <TabsList className="w-full justify-start">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs gap-1">
                <cat.icon className="w-3 h-3" />
                {cat.label}
                {cat.tokens.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-2.5">
                    {cat.tokens.length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="flex-1 mt-2">
              <ScrollArea className="h-full max-h-87.5">
                {cat.tokens.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No {cat.label.toLowerCase()} tokens found
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {cat.tokens.map((token) => {
                      if (cat.id === 'colors') return renderColorToken(token);
                      if (cat.id === 'typography') return renderTypographyToken(token);
                      return renderGenericToken(token);
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
