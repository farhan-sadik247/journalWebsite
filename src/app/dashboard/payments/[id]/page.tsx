import PaymentDetail from './PaymentDetail';

export const metadata = {
  title: 'Payment Details - Journal Management System',
  description: 'View payment details and invoice information',
};

export default function PaymentDetailPage({ params }: { params: { id: string } }) {
  return <PaymentDetail paymentId={params.id} />;
}
