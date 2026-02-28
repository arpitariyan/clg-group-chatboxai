'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogOut, AlertTriangle } from 'lucide-react';

const LogoutConfirmation = ({ isOpen, onClose, onConfirm }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await onConfirm();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className='cursor-pointer'>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Sign Out Confirmation
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Are you sure you want to sign out of your account? You'll need to sign in again to access your conversations.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoggingOut}
            className="w-full sm:w-auto"
          >
            No, Stay Signed In
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoggingOut}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 cursor-pointer"></div>
                Signing Out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2 cursor-pointer" />
                Yes, Sign Out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutConfirmation;