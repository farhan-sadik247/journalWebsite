import { Suspense } from 'react';
import PaymentPortal from './PaymentPortal';

export const metadata = {
  title: 'Payment Portal - Journal Management System',
  description: 'Complete your article processing charge payment',
};

function PaymentPortalFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading payment portal...</p>
      </div>
    </div>
  );
}

interface PaymentPortalPageProps {
  searchParams: {
    paymentId?: string;
  };
}

export default function PaymentPortalPage({ searchParams }: PaymentPortalPageProps) {
  return (
    <Suspense fallback={<PaymentPortalFallback />}>
      <PaymentPortal paymentId={searchParams.paymentId} />
    </Suspense>
  );
}
