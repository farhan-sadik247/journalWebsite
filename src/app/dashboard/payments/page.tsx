import { Suspense } from 'react';
import PaymentDashboard from './PaymentDashboard';

export const metadata = {
  title: 'Payment Dashboard - Journal Management System',
  description: 'Manage article processing charges and payments',
};

function PaymentDashboardFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading payment dashboard...</p>
      </div>
    </div>
  );
}

export default function PaymentDashboardPage() {
  return (
    <Suspense fallback={<PaymentDashboardFallback />}>
      <PaymentDashboard />
    </Suspense>
  );
}
