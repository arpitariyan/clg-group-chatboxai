'use client';

import { useState } from 'react';
import { FileImage, ChevronRight, Loader2, RefreshCw, Layers } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * File/frame selection with thumbnails.
 * Shows the user's recent Figma files and allows selecting files and nodes.
 */
export default function FigmaFileBrowser({
  files = [],
  selectedFile,
  selectedNode,
  fileMetadata,
  onFetchFiles,
  onSelectFile,
  onSelectNode,
  loadingStates = {},
}) {
  const [expandedFile, setExpandedFile] = useState(null);
  const isLoadingFiles = loadingStates.files;
  const isLoadingMetadata = loadingStates.metadata;
  const isLoadingNodes = loadingStates.nodes;

  const handleFileClick = (fileKey) => {
    if (expandedFile === fileKey) {
      setExpandedFile(null);
    } else {
      setExpandedFile(fileKey);
      onSelectFile(fileKey);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Files</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFetchFiles}
          disabled={isLoadingFiles}
          className="h-7 px-2"
        >
          {isLoadingFiles ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full max-h-100">
          {isLoadingFiles && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FileImage className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">No files found</p>
              <Button
                variant="link"
                size="sm"
                onClick={onFetchFiles}
                className="mt-2 text-xs"
              >
                Refresh files
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div key={file.key || file.fileKey} className="space-y-0.5">
                  <button
                    onClick={() => handleFileClick(file.key || file.fileKey)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
                      selectedFile === (file.key || file.fileKey)
                        ? 'bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name || file.fileName}
                        className="w-10 h-10 rounded-md object-cover border bg-muted"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <FileImage className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name || file.fileName}
                      </p>
                      {file.lastModified && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.lastModified).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        expandedFile === (file.key || file.fileKey) ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {/* Expanded file pages/frames */}
                  {expandedFile === (file.key || file.fileKey) && (
                    <div className="ml-6 pl-3 border-l border-muted space-y-0.5">
                      {isLoadingMetadata ? (
                        <div className="flex items-center gap-2 py-2 px-2">
                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Loading pages...</span>
                        </div>
                      ) : fileMetadata?.pages ? (
                        fileMetadata.pages.map((page) => (
                          <button
                            key={page.id}
                            onClick={() => onSelectNode(file.key || file.fileKey, page.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md transition-colors text-xs ${
                              selectedNode === page.id
                                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            }`}
                          >
                            <Layers className="w-3 h-3 shrink-0" />
                            <span className="truncate">{page.name}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground py-2 px-2">
                          Select to load pages
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
