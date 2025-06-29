'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import {
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiCalendar,
  FiUser,
  FiMapPin,
  FiCheck,
  FiAlertCircle,
  FiLoader,
} from 'react-icons/fi';
import styles from './PaymentPortal.module.scss';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Payment {
  _id: string;
  manuscriptId: {
    _id: string;
    title: string;
    status: string;
  };
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  invoiceNumber: string;
  billingAddress: {
    name: string;
    institution: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  baseFee: number;
  discountAmount: number;
  discountReason: string;
}

interface PaymentPortalProps {
  paymentId?: string;
}

export default function PaymentPortal({ paymentId }: PaymentPortalProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentPortalContent paymentId={paymentId} />
    </Elements>
  );
}

function PaymentPortalContent({ paymentId }: PaymentPortalProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (!paymentId) {
      toast.error('Payment ID is required');
      router.push('/dashboard/payments');
      return;
    }

    if (session) {
      fetchPayment();
    }
  }, [session, status, paymentId]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payments/${paymentId}`);
      
      if (response.ok) {
        const data = await response.json();
        setPayment(data.payment);
        
        // If payment is already completed, redirect to payment dashboard
        if (data.payment.status === 'completed') {
          toast.success('Payment already completed');
          router.push('/dashboard/payments');
          return;
        }
        
        // If payment is waived, redirect to payment dashboard
        if (data.payment.status === 'waived') {
          toast.success('Payment has been waived');
          router.push('/dashboard/payments');
          return;
        }
        
        // If payment amount is 0, no payment needed
        if (data.payment.amount <= 0) {
          toast.success('No payment required');
          router.push('/dashboard/payments');
          return;
        }
        
        // Create payment intent for valid payments
        if (data.payment.status === 'pending' || data.payment.status === 'processing') {
          await createPaymentIntent();
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to fetch payment');
        router.push('/dashboard/payments');
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      toast.error('Failed to load payment information');
      router.push('/dashboard/payments');
    } finally {
      setLoading(false);
    }
  };

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId }),
      });

      if (response.ok) {
        const data = await response.json();
        setClientSecret(data.clientSecret);
        setPaymentStatus(data.status);
        
        if (data.status === 'succeeded') {
          toast.success('Payment already completed');
          router.push('/dashboard/payments');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast.error('Failed to initialize payment');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      toast.error('Payment system not ready');
      return;
    }

    setProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Card element not found');
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: payment?.billingAddress.name,
          email: session?.user?.email,
          address: {
            line1: payment?.billingAddress.address,
            city: payment?.billingAddress.city,
            state: payment?.billingAddress.state,
            postal_code: payment?.billingAddress.postalCode,
            country: payment?.billingAddress.country,
          },
        },
      },
      receipt_email: session?.user?.email,
    });

    if (error) {
      console.error('Payment failed:', error);
      toast.error(error.message || 'Payment failed');
      setProcessing(false);
    } else {
      console.log('Payment succeeded:', paymentIntent);
      
      // Update payment status immediately after successful payment
      try {
        const updateResponse = await fetch(`/api/payments/${payment?._id}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            status: 'completed',
            transactionId: paymentIntent.id,
          }),
        });

        if (updateResponse.ok) {
          toast.success('Payment completed successfully!');
          
          // Redirect to payments dashboard
          setTimeout(() => {
            router.push('/dashboard/payments');
          }, 1500);
        } else {
          toast.error('Payment processed but status update failed. Please contact support.');
          setTimeout(() => {
            router.push('/dashboard/payments');
          }, 3000);
        }
      } catch (updateError) {
        console.error('Failed to update payment status:', updateError);
        toast.error('Payment processed but status update failed. Please contact support.');
        setTimeout(() => {
          router.push('/dashboard/payments');
        }, 3000);
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <FiLoader className={styles.spinner} />
        <p>Loading payment information...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className={styles.errorContainer}>
        <FiAlertCircle className={styles.errorIcon} />
        <h2>Payment Not Found</h2>
        <p>The payment you are looking for could not be found.</p>
        <button onClick={() => router.push('/dashboard/payments')} className={styles.backButton}>
          Back to Payments
        </button>
      </div>
    );
  }

  return (
    <div className={styles.paymentPortal}>
      <div className={styles.container}>
        <div className={styles.header}>
          <FiCreditCard className={styles.headerIcon} />
          <h1>Complete Payment</h1>
          <p>Article Processing Charge Payment Portal</p>
        </div>

        <div className={styles.content}>
          {/* Payment Summary */}
          <div className={styles.summaryCard}>
            <h2>
              <FiFileText className={styles.icon} />
              Payment Summary
            </h2>
            
            <div className={styles.summaryItem}>
              <span className={styles.label}>Invoice Number:</span>
              <span className={styles.value}>{payment.invoiceNumber}</span>
            </div>
            
            <div className={styles.summaryItem}>
              <span className={styles.label}>Manuscript:</span>
              <span className={styles.value}>{payment.manuscriptId.title}</span>
            </div>
            
            <div className={styles.summaryItem}>
              <span className={styles.label}>Due Date:</span>
              <span className={styles.value}>
                <FiCalendar className={styles.icon} />
                {new Date(payment.dueDate).toLocaleDateString()}
              </span>
            </div>
            
            <div className={styles.feeBreakdown}>
              <div className={styles.feeItem}>
                <span>Base Fee:</span>
                <span>${payment.baseFee.toFixed(2)} {payment.currency}</span>
              </div>
              
              {payment.discountAmount > 0 && (
                <div className={styles.feeItem}>
                  <span>Discount ({payment.discountReason}):</span>
                  <span className={styles.discount}>-${payment.discountAmount.toFixed(2)} {payment.currency}</span>
                </div>
              )}
              
              <div className={styles.totalFee}>
                <span>Total Amount:</span>
                <span>${payment.amount.toFixed(2)} {payment.currency}</span>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className={styles.billingCard}>
            <h2>
              <FiUser className={styles.icon} />
              Billing Information
            </h2>
            
            <div className={styles.billingInfo}>
              <div className={styles.billingItem}>
                <FiUser className={styles.icon} />
                <div>
                  <div className={styles.billingName}>{payment.billingAddress.name}</div>
                  {payment.billingAddress.institution && (
                    <div className={styles.billingInstitution}>{payment.billingAddress.institution}</div>
                  )}
                </div>
              </div>
              
              <div className={styles.billingItem}>
                <FiMapPin className={styles.icon} />
                <div className={styles.billingAddress}>
                  <div>{payment.billingAddress.address}</div>
                  <div>
                    {payment.billingAddress.city}
                    {payment.billingAddress.state && `, ${payment.billingAddress.state}`}
                    {payment.billingAddress.postalCode && ` ${payment.billingAddress.postalCode}`}
                  </div>
                  <div>{payment.billingAddress.country}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          {clientSecret && (
            <div className={styles.paymentCard}>
              <h2>
                <FiCreditCard className={styles.icon} />
                Payment Details
              </h2>
              
              <form onSubmit={handleSubmit} className={styles.paymentForm}>
                <div className={styles.cardElementContainer}>
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                        invalid: {
                          color: '#9e2146',
                        },
                      },
                    }}
                  />
                </div>
                
                <div className={styles.securityNote}>
                  <FiCheck className={styles.icon} />
                  <span>Your payment is secured by Stripe and encrypted with SSL</span>
                </div>
                
                <button
                  type="submit"
                  disabled={!stripe || processing}
                  className={styles.payButton}
                >
                  {processing ? (
                    <>
                      <FiLoader className={styles.spinner} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiDollarSign className={styles.icon} />
                      Pay ${payment.amount.toFixed(2)} {payment.currency}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
