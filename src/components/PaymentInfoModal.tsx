'use client';

import { useEffect } from 'react';

interface PaymentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscriptId: string;
  onPaymentSubmitted?: () => void;
}

export default function PaymentInfoModal({ 
  isOpen, 
  onClose, 
  manuscriptId, 
  onPaymentSubmitted 
}: PaymentInfoModalProps) {
  // This component is now deprecated in favor of PaymentInfoDisplay
  // but kept for backward compatibility
  
  useEffect(() => {
    if (isOpen) {
      console.warn('PaymentInfoModal is deprecated. Use PaymentInfoDisplay component instead.');
      onClose();
    }
  }, [isOpen, onClose]);

  return null;
}
