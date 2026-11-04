'use client';

import React, { useState } from 'react';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * File Tree AI Element
 * Interactive collapsible file tree for code generators, workspaces, and builder files.
 */
function FileTreeNode({ item, level = 0, activePath, onSelectFile }) {
  const [isOpen, setIsOpen] = useState(item.defaultOpen ?? true);
  const isFolder = Array.isArray(item.children);
  const isSelected = activePath === item.path;

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelectFile?.(item.path);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={cn(
          'flex w-full items-center gap-2 py-1.5 pr-2 rounded-lg text-xs font-mono transition-colors text-left cursor-pointer',
          isSelected
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-foreground/80 hover:bg-accent/40 hover:text-foreground'
        )}
      >
        {isFolder ? (
          <>
            {isOpen ? (
              <ChevronDown className="size-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="size-3.5 text-primary shrink-0" />
            ) : (
              <Folder className="size-3.5 text-primary shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="size-3" />
            <FileCode className="size-3.5 text-muted-foreground shrink-0" />
          </>
        )}
        <span className="truncate">{item.name}</span>
      </button>

      {isFolder && isOpen && (
        <div className="space-y-0.5">
          {item.children.map((child, idx) => (
            <FileTreeNode
              key={child.path || idx}
              item={child}
              level={level + 1}
              activePath={activePath}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  items = [],
  activePath,
  onSelectFile,
  className,
}) {
  return (
    <div
      data-slot="ai-file-tree"
      className={cn('rounded-2xl border border-border/60 bg-card/60 p-2 shadow-xs space-y-0.5', className)}
    >
      {items.map((item, idx) => (
        <FileTreeNode
          key={item.path || idx}
          item={item}
          level={0}
          activePath={activePath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

export default FileTree;
