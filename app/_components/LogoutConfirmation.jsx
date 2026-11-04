'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogOut } from '@/components/ui/animated-icon';

const LogoutConfirmation = ({ isOpen, onClose, onConfirm }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setIsLoggingOut(true);
    try {
      await onConfirm();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-[400px] rounded-2xl border-border/60 bg-card/95 text-card-foreground p-6 shadow-2xl backdrop-blur-md">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
          <AlertDialogMedia className="w-12 h-12 rounded-xl flex items-center justify-center bg-destructive/10 text-destructive">
            <LogOut className="w-6 h-6" />
          </AlertDialogMedia>
          <div className="space-y-2">
            <AlertDialogTitle className="text-xl font-semibold text-foreground">
              Log out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to sign out of your account? You'll need to sign in again to access your conversations.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-row w-full gap-3 mt-6 sm:space-x-0">
          <AlertDialogCancel
            variant="outline"
            onClick={onClose}
            disabled={isLoggingOut}
            className="flex-1 rounded-xl h-10 border border-border/60 bg-secondary/80 text-secondary-foreground hover:bg-secondary cursor-pointer"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoggingOut}
            className="flex-1 rounded-xl h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            {isLoggingOut ? 'Logging Out...' : 'Log Out'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LogoutConfirmation;