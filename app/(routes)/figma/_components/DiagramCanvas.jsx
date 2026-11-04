'use client';

import { useRef } from 'react';
import { Download, Image as ImageIcon, FileCode2 } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * SVG diagram renderer with SVG/PNG download options.
 * Renders the generated diagram SVG and provides export functionality.
 */
export default function DiagramCanvas({ svgContent, diagramType, title }) {
  const svgContainerRef = useRef(null);

  if (!svgContent) return null;

  const handleDownloadSVG = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'diagram'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = () => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;

    const canvas = document.createElement('canvas');
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${title || 'diagram'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = url;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">
          {title || 'Diagram'}
          {diagramType && (
            <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
              ({diagramType})
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadSVG}
            className="h-7 px-2 text-xs gap-1"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            SVG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadPNG}
            className="h-7 px-2 text-xs gap-1"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            PNG
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto">
        <div
          ref={svgContainerRef}
          className="w-full h-full flex items-center justify-center min-h-75 rounded-lg border bg-white dark:bg-gray-950 p-4"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </CardContent>
    </Card>
  );
}
