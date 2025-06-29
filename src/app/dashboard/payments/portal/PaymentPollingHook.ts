// Alternative implementation using polling instead of direct confirmation
// This can be used instead of the webhook approach

import { useState, useEffect } from 'react';

export function usePaymentPolling(paymentId: string, onSuccess: () => void, onError: () => void) {
  const [isPolling, setIsPolling] = useState(false);

  const startPolling = () => {
    setIsPolling(true);
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/${paymentId}/status`);
        const data = await response.json();

        if (response.ok) {
          const payment = data.payment;
          
          if (payment.status === 'completed') {
            clearInterval(pollInterval);
            setIsPolling(false);
            onSuccess();
          } else if (payment.status === 'failed') {
            clearInterval(pollInterval);
            setIsPolling(false);
            onError();
          }
          // Continue polling if status is still 'pending' or 'processing'
        } else {
          console.error('Failed to check payment status:', data);
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPolling(false);
    }, 300000);
  };

  return { isPolling, startPolling };
}

// Usage in PaymentPortal.tsx:
/*
import { usePaymentPolling } from './PaymentPollingHook';

// In your component:
const { isPolling, startPolling } = usePaymentPolling(
  payment?._id || '',
  () => {
    toast.success('Payment completed successfully!');
    router.push('/dashboard/payments');
  },
  () => {
    toast.error('Payment failed');
    setProcessing(false);
  }
);

// After successful Stripe confirmation:
} else {
  console.log('Payment succeeded:', paymentIntent);
  toast.success('Payment confirmed! Updating status...');
  
  // Start polling for status updates
  startPolling();
}
*/
