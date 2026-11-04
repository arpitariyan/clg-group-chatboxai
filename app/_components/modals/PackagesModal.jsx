'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PackagesModal({ isOpen, onClose }) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      onClose?.();
      router.push('/pricing');
    }
  }, [isOpen, onClose, router]);

  return null;
}
