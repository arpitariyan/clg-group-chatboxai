'use client';

import { useState } from 'react';
import { Download, Image as ImageIcon, FileCode2, Loader2 } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * Export format/scale options and download links.
 * Allows users to export assets in different formats (PNG, SVG) and scales (1x, 2x, 3x).
 */
export default function AssetExportPanel({ assets = [], onExport, loading }) {
  const [format, setFormat] = useState('png');
  const [scale, setScale] = useState(2);

  const formats = [
    { id: 'png', label: 'PNG', icon: ImageIcon },
    { id: 'svg', label: 'SVG', icon: FileCode2 },
  ];

  const scales = [1, 2, 3];

  if (!assets || assets.length === 0) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Asset Export</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Format selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Format</label>
          <div className="flex gap-2">
            {formats.map((f) => {
              const Icon = f.icon;
              return (
                <Button
                  key={f.id}
                  variant={format === f.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat(f.id)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Scale selection (only for PNG) */}
        {format === 'png' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Scale</label>
            <div className="flex gap-2">
              {scales.map((s) => (
                <Button
                  key={s}
                  variant={scale === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScale(s)}
                  className="h-8 text-xs w-12"
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Asset list with download links */}
        <ScrollArea className="max-h-62.5">
          <div className="space-y-2">
            {assets.map((asset, index) => (
              <div
                key={asset.nodeId || index}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name || 'Asset'}
                      className="w-10 h-10 rounded border object-cover bg-white"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name || `Asset ${index + 1}`}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-2.5">
                        {format.toUpperCase()}
                      </Badge>
                      {format === 'png' && (
                        <Badge variant="outline" className="text-2.5">
                          {scale}x
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {asset.downloadUrl ? (
                  <a
                    href={asset.downloadUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => onExport?.(asset.nodeId, format, scale)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
