'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PaymentDetail.module.scss';
import {
  FiArrowLeft,
  FiDollarSign,
  FiClock,
  FiCheck,
  FiX,
  FiDownload,
  FiCreditCard,
  FiFileText,
  FiCalendar,
  FiUser,
  FiMapPin,
  FiMail,
  FiHome,
  FiInfo,
  FiAlertCircle,
  FiEdit3
} from 'react-icons/fi';

interface Payment {
  _id: string;
  manuscriptId?: {
    _id: string;
    title: string;
    status: string;
    authors: Array<{
      name: string;
      email: string;
      affiliation: string;
      isCorresponding: boolean;
    }>;
  } | null;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  baseFee: number;
  discountAmount: number;
  discountReason: string;
  dueDate: string;
  paymentDate?: string;
  invoiceNumber: string;
  invoiceDate: string;
  transactionId?: string;
  waiverReason?: string;
  waiverApprovedBy?: {
    name: string;
    email: string;
  };
  waiverApprovedDate?: string;
  billingAddress: {
    name: string;
    institution: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentDetail({ paymentId }: { paymentId: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session && paymentId) {
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
      } else if (response.status === 404) {
        setError('Payment not found');
      } else {
        setError('Failed to load payment details');
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (newStatus: string, transactionId?: string) => {
    if (!payment) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/payments/${payment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          transactionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPayment(data.payment);
        alert('Payment status updated successfully');
      } else {
        alert('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const approveWaiver = async () => {
    if (!payment) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/payments/${payment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approveWaiver: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPayment(data.payment);
        alert('Waiver approved successfully');
      } else {
        alert('Failed to approve waiver');
      }
    } catch (error) {
      console.error('Error approving waiver:', error);
      alert('Failed to approve waiver');
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptPayment = async () => {
    if (!confirm('Are you sure you want to accept this payment?')) {
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/payments/${payment?._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'accept'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPayment(data.payment);
        alert('Payment accepted successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to accept payment'}`);
      }
    } catch (error) {
      console.error('Error accepting payment:', error);
      alert('Failed to accept payment');
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectPayment = async () => {
    const reason = prompt('Please provide a reason for rejecting this payment:');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/payments/${payment?._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: reason.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPayment(data.payment);
        alert('Payment rejected successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to reject payment'}`);
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheck className={styles.iconSuccess} />;
      case 'pending':
        return <FiClock className={styles.iconWarning} />;
      case 'failed':
        return <FiX className={styles.iconDanger} />;
      case 'waived':
        return <FiCheck className={styles.iconInfo} />;
      case 'processing':
        return <FiClock className={styles.iconInfo} />;
      default:
        return <FiAlertCircle className={styles.iconSecondary} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return styles.statusSuccess;
      case 'pending':
        return styles.statusWarning;
      case 'failed':
        return styles.statusDanger;
      case 'waived':
        return styles.statusInfo;
      case 'processing':
        return styles.statusInfo;
      default:
        return styles.statusSecondary;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorContent}>
          <h1>Error</h1>
          <p>{error}</p>
          <Link href="/dashboard/payments" className="btn btn-primary">
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  if (!payment) {
    return null;
  }

  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor';
  const correspondingAuthor = payment.manuscriptId?.authors?.find(author => author.isCorresponding);

  return (
    <div className={styles.paymentDetail}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <Link href="/dashboard/payments" className={styles.backButton}>
            <FiArrowLeft />
            Back to Payments
          </Link>

          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1>Payment Details</h1>
              <div className={styles.statusBadges}>
                <div className={`${styles.statusBadge} ${getStatusBadgeClass(payment.status)}`}>
                  {getStatusIcon(payment.status)}
                  <span>{payment.status.replace('-', ' ').toUpperCase()}</span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className={styles.headerActions}>
                {payment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAcceptPayment()}
                      disabled={updating}
                      className="btn btn-success"
                    >
                      <FiCheck />
                      Accept Payment
                    </button>
                    <button
                      onClick={() => handleRejectPayment()}
                      disabled={updating}
                      className="btn btn-danger"
                    >
                      <FiX />
                      Reject Payment
                    </button>
                  </>
                )}
                
                {payment.status === 'waived' && !payment.waiverApprovedBy && (
                  <button
                    onClick={approveWaiver}
                    disabled={updating}
                    className="btn btn-primary"
                  >
                    <FiCheck />
                    Approve Waiver
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Main Content */}
          <div className={styles.mainContent}>
            {/* Payment Summary */}
            <section className={styles.section}>
              <h2>
                <FiDollarSign />
                Payment Summary
              </h2>
              
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <div className={styles.label}>Invoice Number</div>
                  <div className={styles.value}>
                    <FiFileText />
                    {payment.invoiceNumber}
                  </div>
                </div>

                <div className={styles.summaryItem}>
                  <div className={styles.label}>Total Amount</div>
                  <div className={styles.value}>
                    <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                  </div>
                </div>

                <div className={styles.summaryItem}>
                  <div className={styles.label}>Payment Method</div>
                  <div className={styles.value}>
                    <FiCreditCard />
                    {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                <div className={styles.summaryItem}>
                  <div className={styles.label}>Due Date</div>
                  <div className={styles.value}>
                    <FiCalendar />
                    {formatDateShort(payment.dueDate)}
                    {new Date(payment.dueDate) < new Date() && payment.status === 'pending' && (
                      <span className={styles.overdueTag}>OVERDUE</span>
                    )}
                  </div>
                </div>

                {payment.paymentDate && (
                  <div className={styles.summaryItem}>
                    <div className={styles.label}>Paid Date</div>
                    <div className={styles.value}>
                      <FiCalendar />
                      {formatDateShort(payment.paymentDate)}
                    </div>
                  </div>
                )}

                {payment.transactionId && (
                  <div className={styles.summaryItem}>
                    <div className={styles.label}>Transaction ID</div>
                    <div className={styles.value}>
                      <code>{payment.transactionId}</code>
                    </div>
                  </div>
                )}
              </div>

              {/* Fee Breakdown */}
              {payment.discountAmount > 0 && (
                <div className={styles.feeBreakdown}>
                  <h3>Fee Breakdown</h3>
                  <div className={styles.breakdownItem}>
                    <span>Base Fee</span>
                    <span>{formatCurrency(payment.baseFee, payment.currency)}</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span>Discount ({payment.discountReason})</span>
                    <span className={styles.discountAmount}>
                      -{formatCurrency(payment.discountAmount, payment.currency)}
                    </span>
                  </div>
                  <div className={`${styles.breakdownItem} ${styles.total}`}>
                    <strong>Total Amount</strong>
                    <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                  </div>
                </div>
              )}
            </section>

            {/* Manuscript Information */}
            <section className={styles.section}>
              <h2>
                <FiFileText />
                Manuscript Information
              </h2>
              
              <div className={styles.manuscriptInfo}>
                <h3>{payment.manuscriptId?.title || 'Unknown Manuscript'}</h3>
                <p>
                  <strong>Manuscript ID:</strong> {payment.manuscriptId?._id || 'N/A'}
                </p>
                <p>
                  <strong>Status:</strong> {
                    payment.manuscriptId?.status === 'published' 
                      ? 'Published' 
                      : payment.manuscriptId?.status?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'UNKNOWN'
                  }
                </p>
                
                {correspondingAuthor && (
                  <div className={styles.correspondingAuthor}>
                    <h4>Corresponding Author</h4>
                    <p>
                      <FiUser />
                      {correspondingAuthor.name}
                    </p>
                    <p>
                      <FiMail />
                      {correspondingAuthor.email}
                    </p>
                    <p>
                      <FiHome />
                      {correspondingAuthor.affiliation}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Waiver Information */}
            {payment.status === 'waived' && (
              <section className={styles.section}>
                <h2>
                  <FiInfo />
                  Waiver Information
                </h2>
                
                <div className={styles.waiverInfo}>
                  <div className={styles.infoItem}>
                    <strong>Reason:</strong>
                    <p>{payment.waiverReason}</p>
                  </div>
                  
                  {payment.waiverApprovedBy && (
                    <>
                      <div className={styles.infoItem}>
                        <strong>Approved By:</strong>
                        <p>{payment.waiverApprovedBy.name}</p>
                      </div>
                      
                      <div className={styles.infoItem}>
                        <strong>Approved Date:</strong>
                        <p>{formatDate(payment.waiverApprovedDate!)}</p>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Admin Notes */}
            {payment.notes && (
              <section className={styles.section}>
                <h2>
                  <FiEdit3 />
                  Admin Notes
                </h2>
                <div className={styles.notesContent}>
                  <p>{payment.notes}</p>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Billing Address */}
            <div className={styles.sidebarCard}>
              <h3>
                <FiMapPin />
                Billing Address
              </h3>
              <div className={styles.addressInfo}>
                <p><strong>{payment.billingAddress.name}</strong></p>
                {payment.billingAddress.institution && (
                  <p>{payment.billingAddress.institution}</p>
                )}
                <p>{payment.billingAddress.address}</p>
                <p>
                  {payment.billingAddress.city}
                  {payment.billingAddress.state && `, ${payment.billingAddress.state}`}
                  {payment.billingAddress.postalCode && ` ${payment.billingAddress.postalCode}`}
                </p>
                <p>{payment.billingAddress.country}</p>
              </div>
            </div>

            {/* Payment History */}
            <div className={styles.sidebarCard}>
              <h3>
                <FiClock />
                Payment Timeline
              </h3>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon}>
                    <FiFileText />
                  </div>
                  <div className={styles.timelineContent}>
                    <strong>Invoice Created</strong>
                    <span>{formatDate(payment.invoiceDate)}</span>
                  </div>
                </div>
                
                {payment.paymentDate && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineIcon}>
                      <FiCheck />
                    </div>
                    <div className={styles.timelineContent}>
                      <strong>Payment Completed</strong>
                      <span>{formatDate(payment.paymentDate)}</span>
                    </div>
                  </div>
                )}
                
                {payment.waiverApprovedDate && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineIcon}>
                      <FiCheck />
                    </div>
                    <div className={styles.timelineContent}>
                      <strong>Waiver Approved</strong>
                      <span>{formatDate(payment.waiverApprovedDate)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.sidebarCard}>
              <h3>Actions</h3>
              <div className={styles.actionsList}>
                {payment.manuscriptId?._id && (
                  <Link
                    href={`/dashboard/manuscripts/${payment.manuscriptId._id}`}
                    className={styles.actionButton}
                  >
                    <FiFileText />
                    View Manuscript
                  </Link>
                )}
                
                {payment.status === 'completed' && (
                  <button className={styles.actionButton}>
                    <FiDownload />
                    Download Receipt
                  </button>
                )}
                
                <button className={styles.actionButton}>
                  <FiDownload />
                  Download Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
