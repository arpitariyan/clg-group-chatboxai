'use client';

import { ImageIcon, Loader2 } from '@/components/ui/animated-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Selected design preview panel.
 * Shows a thumbnail/preview of the currently selected Figma node.
 */
export default function FigmaPreview({ selectedNode, nodeData, loading }) {
  if (!selectedNode) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Select a frame to preview
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {nodeData?.name || 'Preview'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading preview...</p>
          </div>
        ) : nodeData?.thumbnailUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={nodeData.thumbnailUrl}
              alt={nodeData.name || 'Design preview'}
              className="max-w-full max-h-75 rounded-lg border object-contain bg-muted/20"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded-lg border border-dashed bg-muted/10 min-h-50">
            <div className="text-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Preview not available
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
