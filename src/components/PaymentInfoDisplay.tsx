'use client';

import { useState, useEffect } from 'react';
import { FiDollarSign, FiCheck, FiX, FiClock, FiEye, FiCreditCard } from 'react-icons/fi';
import styles from './PaymentInfoDisplay.module.scss';

interface PaymentInfo {
  _id: string;
  manuscriptId: string;
  userId: string;
  accountHolderName: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'completed' | 'rejected';
  invoiceNumber?: string;
  createdAt: string;
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
  rejectionReason?: string;
}

interface BankConfig {
  payableAmount: number;
  bankName: string;
  accountNumber: string;
  accountDetails: string;
  currency: string;
}

interface PaymentInfoDisplayProps {
  manuscriptId: string;
  userRole: string;
  isAuthor: boolean;
}

export default function PaymentInfoDisplay({ manuscriptId, userRole, isAuthor }: PaymentInfoDisplayProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [allPayments, setAllPayments] = useState<PaymentInfo[]>([]);
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState(0);

  // Form data for payment submission
  const [accountHolderName, setAccountHolderName] = useState('');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPaymentInfo(),
          fetchBankConfig()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [manuscriptId]);

  const fetchPaymentInfo = async () => {
    try {
      const response = await fetch(`/api/payment-info?manuscriptId=${manuscriptId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.paymentInfos && data.paymentInfos.length > 0) {
          // Store all payments for admin/editor view
          setAllPayments(data.paymentInfos);
          
          let displayPayment = data.paymentInfos[0]; // Default to latest payment
          
          if (userRole === 'admin' || userRole === 'editor') {
            // Find latest pending payment for admin/editor, or latest if no pending
            const pendingPayment = data.paymentInfos.find((p: PaymentInfo) => p.status === 'pending');
            displayPayment = pendingPayment || data.paymentInfos[0];
          } else {
            // For authors, always show the latest payment (including rejected ones)
            displayPayment = data.paymentInfos[0];
          }
          
          setPaymentInfo(displayPayment);
        } else {
          // No payment info found
          setPaymentInfo(null);
        }
      }
    } catch (error) {
      console.error('Error fetching payment info:', error);
    }
  };

  const fetchBankConfig = async () => {
    try {
      const response = await fetch('/api/bank-config');
      if (response.ok) {
        const data = await response.json();
        setBankConfig(data.config);
      } else {
        console.error('Failed to fetch bank config:', response.status);
      }
    } catch (error) {
      console.error('Error fetching bank config:', error);
    }
  };

  const handleSubmitPayment = async () => {
    if (!accountHolderName.trim() || !transactionId.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmittingPayment(true);
      const response = await fetch('/api/payment-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manuscriptId,
          accountHolderName: accountHolderName.trim(),
          transactionId: transactionId.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Payment information submitted successfully! Please wait for admin verification.');
        setShowPaymentModal(false);
        setAccountHolderName('');
        setTransactionId('');
        await fetchPaymentInfo(); // Refresh payment info
      } else {
        alert(data.error || 'Failed to submit payment information');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Error submitting payment information');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePaymentAction = async (paymentId: string, action: 'accept' | 'reject', reasonParam?: string) => {
    try {
      const body: any = { action };
      
      if (action === 'reject' && reasonParam) {
        body.rejectionReason = reasonParam;
      }

      const response = await fetch(`/api/payment-info/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert(`Payment ${action === 'accept' ? 'approved' : 'rejected'} successfully!`);
        await fetchPaymentInfo(); // Refresh payment info
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${action} payment`);
      }
    } catch (error) {
      console.error(`Error ${action}ing payment:`, error);
      alert(`Error ${action}ing payment`);
    }
  };

  const handleRejectPayment = async () => {
    if (!paymentInfo) return;

    if (!confirm('Are you sure you want to reject this payment? The author will be notified.')) {
      return;
    }

    try {
      const response = await fetch(`/api/payment-info/${paymentInfo._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject'
        })
      });
      
      if (response.ok) {
        alert('Payment rejected successfully!');
        await fetchPaymentInfo();
      } else {
        const errorData = await response.json();
        alert('Failed to reject payment: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Error rejecting payment');
    }
  };

  const selectPayment = (index: number) => {
    setSelectedPaymentIndex(index);
    setPaymentInfo(allPayments[index]);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading payment information...</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'pending': return '#ffc107';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <FiCheck />;
      case 'pending': return <FiClock />;
      case 'rejected': return <FiX />;
      default: return <FiDollarSign />;
    }
  };

  return (
    <div className={styles.container}>
      
      {/* Show payment status */}
      {paymentInfo ? (
        <div className={styles.paymentStatus}>
          <div className={styles.statusHeader}>
            <div 
              className={styles.statusBadge}
              style={{ backgroundColor: getStatusColor(paymentInfo.status) }}
            >
              {getStatusIcon(paymentInfo.status)}
              <span>
                {paymentInfo.status === 'completed' ? 'Paid' : 
                 paymentInfo.status === 'pending' ? 'Pending' : 'Rejected'}
              </span>
            </div>
          </div>

          {/* Show payment details */}
          <div className={styles.paymentDetails}>
            <div className={styles.detailRow}>
              <span>Account Holder:</span>
              <span>{paymentInfo.accountHolderName}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Amount:</span>
              <span>${paymentInfo.amount.toFixed(2)}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Transaction ID:</span>
              <span>{paymentInfo.transactionId}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Status:</span>
              <span style={{ color: getStatusColor(paymentInfo.status) }}>
                {paymentInfo.status.charAt(0).toUpperCase() + paymentInfo.status.slice(1)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span>Submitted:</span>
              <span>{new Date(paymentInfo.createdAt).toLocaleDateString()}</span>
            </div>
            {paymentInfo.verifiedBy && (
              <div className={styles.detailRow}>
                <span>Verified by:</span>
                <span>{paymentInfo.verifiedBy.name}</span>
              </div>
            )}
            {paymentInfo.status === 'rejected' && paymentInfo.rejectionReason && (
              <div className={styles.detailRow}>
                <span>Rejection Reason:</span>
                <span className={styles.rejectionReason}>{paymentInfo.rejectionReason}</span>
              </div>
            )}
          </div>

          {/* Admin/Editor Actions */}
          {(userRole === 'admin' || userRole === 'editor') && paymentInfo.status === 'pending' && (
            <div className={styles.adminActions}>
              <button
                className={`${styles.actionBtn} ${styles.approveBtn}`}
                onClick={() => handlePaymentAction(paymentInfo._id, 'accept')}
                title="Accept Payment"
              >
                <FiCheck />
              </button>
              <button
                className={`${styles.actionBtn} ${styles.rejectBtn}`}
                onClick={handleRejectPayment}
                title="Reject Payment"
              >
                <FiX />
              </button>
            </div>
          )}

          {/* Author Actions */}
          {isAuthor && paymentInfo.status === 'rejected' && (
            <div className={styles.authorActions}>
              <div className={styles.rejectionNotice}>
                <p>⚠️ Your payment submission was rejected. Please review the reason above and submit corrected payment information.</p>
              </div>
              
              {/* Show bank details for resubmission */}
              {bankConfig && (
                <div className={styles.bankDetails}>
                  <h4>Bank Transfer Details</h4>
                  <div className={styles.bankInfo}>
                    <div className={styles.bankRow}>
                      <span>Payable Amount:</span>
                      <span className={styles.amount}>{bankConfig.currency} ${bankConfig.payableAmount.toFixed(2)}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span>Bank Name:</span>
                      <span>{bankConfig.bankName}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span>Account Number:</span>
                      <span>{bankConfig.accountNumber}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span>Bank Details:</span>
                      <span>{bankConfig.accountDetails}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                className={styles.resubmitBtn}
                onClick={() => setShowPaymentModal(true)}
              >
                Re-submit Payment Information
              </button>
            </div>
          )}
        </div>
      ) : (
        /* No payment info - show bank details and submit button for authors */
        isAuthor && (
          <div className={styles.noPayment}>
            {/* Bank Details */}
            {bankConfig ? (
              <div className={styles.bankDetails}>
                <h4>Bank Transfer Details</h4>
                <div className={styles.bankInfo}>
                  <div className={styles.bankRow}>
                    <span>Payable Amount:</span>
                    <span className={styles.amount}>{bankConfig.currency} ${bankConfig.payableAmount.toFixed(2)}</span>
                  </div>
                  <div className={styles.bankRow}>
                    <span>Bank Name:</span>
                    <span>{bankConfig.bankName}</span>
                  </div>
                  <div className={styles.bankRow}>
                    <span>Account Number:</span>
                    <span>{bankConfig.accountNumber}</span>
                  </div>
                  <div className={styles.bankRow}>
                    <span>Bank Details:</span>
                    <span>{bankConfig.accountDetails}</span>
                  </div>
                </div>
                <p>After completing the bank transfer, please submit your payment information below.</p>
              </div>
            ) : (
              <div className={styles.loadingBank}>
                <p>Loading bank details...</p>
              </div>
            )}
            
            <button
              className={styles.submitBtn}
              onClick={() => setShowPaymentModal(true)}
              disabled={!bankConfig}
            >
              <FiCreditCard />
              Submit Payment Information
            </button>
          </div>
        )
      )}

      {/* All Payment Submissions - Only for Admin/Editor */}
      {(userRole === 'admin' || userRole === 'editor') && allPayments.length > 1 && (
        <div className={styles.allPayments}>
          <h4>All Payment Submissions</h4>
          <div className={styles.paymentList}>
            {allPayments.map((payment, index) => (
              <div 
                key={payment._id} 
                className={`${styles.paymentItem} ${selectedPaymentIndex === index ? styles.selected : ''}`}
              >
                <div className={styles.paymentSummary}>
                  <span className={styles.paymentNumber}>Payment #{index + 1}</span>
                  <span className={styles.paymentAmount}>${payment.amount.toFixed(2)}</span>
                  <span 
                    className={styles.paymentStatus}
                    style={{ color: getStatusColor(payment.status) }}
                  >
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                  <span className={styles.paymentDate}>
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.paymentActions}>
                  <button
                    className={`${styles.viewBtn} ${selectedPaymentIndex === index ? styles.current : ''}`}
                    onClick={() => selectPayment(index)}
                  >
                    <FiEye />
                    {selectedPaymentIndex === index ? 'Current' : 'View'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>
                {paymentInfo?.status === 'rejected' ? 'Resubmit Payment Information' : 'Submit Payment Information'}
              </h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowPaymentModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              {paymentInfo?.status === 'rejected' && (
                <div className={styles.resubmissionNotice}>
                  <p><strong>Previous submission was rejected:</strong> {paymentInfo.rejectionReason}</p>
                  <p>Please provide correct payment information below.</p>
                </div>
              )}
              {bankConfig && (
                <div className={styles.bankInfo}>
                  <h4>Bank Transfer Details</h4>
                  <div className={styles.bankDetails}>
                    <div className={styles.detailRow}>
                      <span>Amount:</span>
                      <span>{bankConfig.currency} ${bankConfig.payableAmount.toFixed(2)}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Bank:</span>
                      <span>{bankConfig.bankName}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Account:</span>
                      <span>{bankConfig.accountNumber}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.paymentForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="accountHolderName">Account Holder Name *</label>
                  <input
                    id="accountHolderName"
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Enter account holder name"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="transactionId">Transaction ID / Reference Number *</label>
                  <input
                    id="transactionId"
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID or reference number"
                    required
                  />
                </div>

                <p className={styles.note}>
                  * Please ensure you have completed the bank transfer before submitting this information.
                </p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowPaymentModal(false)}
                disabled={submittingPayment}
              >
                Cancel
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmitPayment}
                disabled={submittingPayment}
              >
                {submittingPayment ? 'Submitting...' : 'Submit Payment Information'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
