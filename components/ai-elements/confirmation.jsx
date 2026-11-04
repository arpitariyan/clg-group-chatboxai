'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Confirmation AI Element
 * Action safety confirmation modal before irreversible tool calls or data deletions.
 */
export function Confirmation({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm AI Action',
  description = 'Are you sure you want the AI agent to execute this operation?',
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-[420px] rounded-2xl border-border/60 bg-card/95 text-card-foreground p-6 shadow-2xl backdrop-blur-md">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="size-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-1.5">
            <AlertDialogTitle className="text-base font-semibold text-foreground">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-row w-full gap-2 mt-4 sm:space-x-0">
          <AlertDialogCancel
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl h-9 text-xs border border-border/60 bg-secondary/80 text-secondary-foreground hover:bg-secondary cursor-pointer"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-xl h-9 text-xs cursor-pointer ${
              isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default Confirmation;
