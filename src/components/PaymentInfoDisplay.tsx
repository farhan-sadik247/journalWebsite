'use client';

import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiClock, FiDollarSign, FiUser, FiHash, FiRefreshCw } from 'react-icons/fi';
import PaymentInfoModal from './PaymentInfoModal';
import styles from './PaymentInfoDisplay.module.scss';

interface PaymentInfo {
  _id: string;
  accountHolderName: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: {
    name: string;
    email: string;
  };
  rejectionReason?: string;
}

interface BankConfig {
  payableAmount: number;
  currency: string;
  bankName: string;
  accountNumber: string;
  accountDetails: string;
}

interface PaymentInfoDisplayProps {
  manuscriptId: string;
  userRole?: string;
  isAuthor?: boolean;
}

export default function PaymentInfoDisplay({ manuscriptId, userRole, isAuthor }: PaymentInfoDisplayProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [allPayments, setAllPayments] = useState<PaymentInfo[]>([]);
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);

  // Enhanced debugging
  console.log('PaymentInfoDisplay rendered with props:', { 
    manuscriptId, 
    userRole, 
    isAuthor,
    currentPaymentStatus: paymentInfo?.status,
    modalState: showResubmitModal,
    bankConfigAvailable: !!bankConfig
  });

  // Debug log for modal state changes
  useEffect(() => {
    console.log('Modal state changed:', showResubmitModal);
    if (showResubmitModal) {
      console.log('Modal opened - Current state:', {
        paymentInfo,
        bankConfig,
        isAuthor,
        userRole
      });
      
      // If modal is opened but bank config is not available, try to fetch it
      if (!bankConfig) {
        console.log('🏦 Bank config not available when modal opened, fetching...');
        fetchBankConfig();
      }
    }
  }, [showResubmitModal]);

  useEffect(() => {
    fetchPaymentInfo();
    fetchBankConfig();
  }, [manuscriptId]);

  const fetchPaymentInfo = async () => {
    try {
      console.log('Fetching payment info for manuscript:', manuscriptId);
      const response = await fetch(`/api/payment-info?manuscriptId=${manuscriptId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Payment info response:', data);
        if (data.paymentInfos && data.paymentInfos.length > 0) {
          // Store all payments for admin/editor view
          setAllPayments(data.paymentInfos);
          // For authors, show the latest payment
          // For admins/editors, show the latest pending payment or latest payment
          let displayPayment = data.paymentInfos[0];
          
          if (userRole === 'admin' || userRole === 'editor') {
            // Find latest pending payment for admin/editor, or latest if no pending
            const pendingPayment = data.paymentInfos.find((p: PaymentInfo) => p.status === 'pending');
            displayPayment = pendingPayment || data.paymentInfos[0];
          }
          
          console.log('Display payment info:', displayPayment);
          setPaymentInfo(displayPayment);
        }
      }
    } catch (error) {
      console.error('Error fetching payment info:', error);
    }
  };

  const fetchBankConfig = async () => {
    try {
      console.log('🏦 Fetching bank config...');
      const response = await fetch('/api/bank-config');
      console.log('🏦 Bank config response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🏦 Bank config data:', data);
        // API returns config under 'config' property, not 'bankConfig'
        setBankConfig(data.config);
        console.log('🏦 Bank config set successfully:', data.config);
      } else {
        console.error('🏦 Bank config API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🏦 Error response:', errorText);
      }
    } catch (error) {
      console.error('🏦 Error fetching bank config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPayment = async () => {
    if (!paymentInfo) return;

    console.log('🟢 ACCEPT: Starting payment acceptance process:', {
      paymentId: paymentInfo._id,
      paymentStatus: paymentInfo.status,
      userRole,
      manuscriptId
    });

    setActionLoading(true);
    try {
      const url = `/api/payment-info/${paymentInfo._id}`;
      console.log('🟢 ACCEPT: Making PUT request to:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'accept',
        }),
      });

      console.log('🟢 ACCEPT: Response status:', response.status);
      const responseText = await response.text();
      console.log('🟢 ACCEPT: Raw response:', responseText);

      if (response.ok) {
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('🟢 ACCEPT: Parsed response:', data);
        } catch (e) {
          console.log('🟢 ACCEPT: Response was not JSON, treating as success');
        }
        alert('Payment accepted successfully!');
        fetchPaymentInfo(); // Refresh data
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.error('🟢 ACCEPT: Error response:', errorData);
          alert(`Error: ${errorData.error || 'Failed to accept payment'}`);
        } catch (e) {
          console.error('🟢 ACCEPT: Non-JSON error response:', responseText);
          alert(`Error: ${responseText || 'Failed to accept payment'}`);
        }
      }
    } catch (error) {
      console.error('🟢 ACCEPT: Network/other error:', error);
      alert('Error accepting payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!paymentInfo) return;

    console.log('🔴 REJECT: Starting payment rejection process:', {
      paymentId: paymentInfo._id,
      paymentStatus: paymentInfo.status,
      userRole,
      manuscriptId
    });

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason || reason.trim() === '') {
      alert('Rejection reason is required');
      return;
    }

    console.log('🔴 REJECT: Rejection reason provided:', reason.trim());

    setActionLoading(true);
    try {
      const url = `/api/payment-info/${paymentInfo._id}`;
      console.log('🔴 REJECT: Making PUT request to:', url);
      
      const requestBody = {
        action: 'reject',
        rejectionReason: reason.trim(),
      };
      console.log('🔴 REJECT: Request body:', requestBody);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔴 REJECT: Response status:', response.status);
      const responseText = await response.text();
      console.log('🔴 REJECT: Raw response:', responseText);

      if (response.ok) {
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('🔴 REJECT: Parsed response:', data);
        } catch (e) {
          console.log('🔴 REJECT: Response was not JSON, treating as success');
        }
        alert('Payment rejected successfully! The author has been notified to resubmit payment.');
        fetchPaymentInfo(); // Refresh data
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.error('🔴 REJECT: Error response:', errorData);
          alert(`Error: ${errorData.error || 'Failed to reject payment'}`);
        } catch (e) {
          console.error('🔴 REJECT: Non-JSON error response:', responseText);
          alert(`Error: ${responseText || 'Failed to reject payment'}`);
        }
      }
    } catch (error) {
      console.error('🔴 REJECT: Network/other error:', error);
      alert('Error rejecting payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResubmitPayment = async (data: { accountHolderName: string; amount: number; transactionId: string }) => {
    try {
      console.log('Submitting/resubmitting payment information:', { 
        ...data, 
        manuscriptId, 
        existingPayment: paymentInfo ? 'yes' : 'no',
        paymentStatus: paymentInfo?.status
      });
      
      // Clean the manuscriptId parameter in case it contains rejected flag
      const cleanManuscriptId = manuscriptId.split('?')[0];
      console.log('Using clean manuscriptId:', cleanManuscriptId);
      
      const response = await fetch('/api/payment-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          manuscriptId: cleanManuscriptId,
        }),
      });

      const responseText = await response.text();
      console.log('Raw API response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        alert('Server returned an invalid response format');
        return;
      }

      if (response.ok) {
        console.log('Payment submission successful:', result);
        alert('Payment information submitted successfully!');
        setShowResubmitModal(false);
        // Wait a moment before refreshing to allow server to process
        setTimeout(() => {
          fetchPaymentInfo(); // Refresh data
        }, 500);
      } else {
        console.error('Payment submission error:', result);
        alert(`Error: ${result.error || 'Failed to submit payment information'}`);
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert(`Error submitting payment information: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Helper to determine if payment needs resubmission
  const needsResubmission = () => {
    return paymentInfo?.status === 'rejected' && isAuthor;
  };

  // Helper to get payment action button text
  const getPaymentActionButton = () => {
    if (!paymentInfo && isAuthor) {
      return (
        <button
          onClick={() => setShowResubmitModal(true)}
          className="btn btn-primary"
          style={{ marginTop: '15px' }}
        >
          <FiDollarSign />
          Submit Payment Information
        </button>
      );
    }
    
    if (paymentInfo?.status === 'rejected' && isAuthor) {
      return (
        <button
          onClick={() => setShowResubmitModal(true)}
          className="btn btn-warning"
          style={{ marginTop: '15px' }}
        >
          <FiRefreshCw />
          Resubmit Payment Information
        </button>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <p>Loading payment information...</p>
      </div>
    );
  }

  if (!paymentInfo) {
    return (
      <div className={styles.noPayment}>
        <p>No payment information submitted yet.</p>
        {bankConfig && (
          <div className={styles.expectedPayment}>
            <h4>Expected Payment:</h4>
            <p>{bankConfig.currency} ${bankConfig.payableAmount.toFixed(2)}</p>
          </div>
        )}
        {isAuthor && (
          <button
            onClick={() => {
              console.log('🟢 Initial submit button clicked - Full debugging info:', { 
                isAuthor, 
                bankConfig,
                modalState: showResubmitModal,
                manuscriptId,
                userRole 
              });
              console.log('🟢 Setting modal to true...');
              setShowResubmitModal(true);
              console.log('🟢 Modal state should now be true');
            }}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '15px', padding: '10px' }}
          >
            <FiDollarSign style={{ marginRight: '5px' }} />
            Submit Payment Information
          </button>
        )}
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (paymentInfo.status) {
      case 'completed':
        return <FiCheck className={styles.completed} />;
      case 'rejected':
        return <FiX className={styles.rejected} />;
      default:
        return <FiClock className={styles.pending} />;
    }
  };

  const getStatusClass = () => {
    return styles[paymentInfo.status] || styles.pending;
  };

  return (
    <>
      <div className={styles.paymentInfoDisplay}>
      {/* Show all payments for admin/editor */}
      {(userRole === 'admin' || userRole === 'editor') && allPayments.length > 1 && (
        <div className={styles.allPaymentsSection}>
          <h4>All Payment Submissions ({allPayments.length})</h4>
          <div className={styles.paymentsList}>
            {allPayments.map((payment, index) => (
              <div key={payment._id} className={`${styles.paymentSummary} ${styles[payment.status]}`}>
                <div className={styles.paymentIndex}>#{allPayments.length - index}</div>
                <div className={styles.paymentDetails}>
                  <span className={styles.paymentAmount}>${payment.amount.toFixed(2)}</span>
                  <span className={styles.paymentStatus}>{payment.status.toUpperCase()}</span>
                  <span className={styles.paymentDate}>
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.paymentActions}>
                  <button 
                    onClick={() => {
                      console.log('🔄 Switching to payment:', {
                        fromPaymentId: paymentInfo?._id,
                        toPaymentId: payment._id,
                        fromStatus: paymentInfo?.status,
                        toStatus: payment.status,
                        allPayments: allPayments.map(p => ({ id: p._id, status: p.status }))
                      });
                      setPaymentInfo(payment);
                    }}
                    className={`btn ${paymentInfo?._id === payment._id ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {paymentInfo?._id === payment._id ? 'Current' : 'View'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.paymentCard}>
        <div className={styles.cardHeader}>
          <h4>
            <FiDollarSign />
            Payment Submission
          </h4>
          <div className={`${styles.statusBadge} ${getStatusClass()}`}>
            {getStatusIcon()}
            {paymentInfo.status.toUpperCase()}
          </div>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <FiUser className={styles.icon} />
              <div>
                <label>Account Holder Name</label>
                <span>{paymentInfo.accountHolderName}</span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <FiDollarSign className={styles.icon} />
              <div>
                <label>Amount</label>
                <span>{bankConfig?.currency || 'USD'} ${paymentInfo.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <FiHash className={styles.icon} />
              <div>
                <label>Transaction ID</label>
                <span>{paymentInfo.transactionId}</span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <FiClock className={styles.icon} />
              <div>
                <label>Submitted Date</label>
                <span>{new Date(paymentInfo.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {paymentInfo.status === 'completed' && paymentInfo.verifiedBy && (
            <div className={styles.verificationInfo}>
              <h5>Payment Accepted</h5>
              <p>
                Accepted by {paymentInfo.verifiedBy.name} on{' '}
                {paymentInfo.verifiedAt && new Date(paymentInfo.verifiedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {paymentInfo.status === 'rejected' && paymentInfo.rejectionReason && (
            <div className={styles.rejectionInfo}>
              <h5>Payment Rejected</h5>
              <div className={styles.rejectionReason}>
                <p><strong>Reason:</strong> {paymentInfo.rejectionReason}</p>
              </div>
              {isAuthor && (
                <button
                  onClick={() => {
                    console.log('🔴 Resubmit button clicked - Full debugging info:', { 
                      paymentInfo, 
                      isAuthor, 
                      bankConfig,
                      currentModalState: showResubmitModal,
                      manuscriptId,
                      userRole,
                      paymentStatus: paymentInfo?.status
                    });
                    console.log('🔴 Setting modal to true...');
                    setShowResubmitModal(true);
                    console.log('🔴 Modal state should now be true');
                    
                    // Double-check after a short delay
                    setTimeout(() => {
                      console.log('🔴 Modal state after 100ms:', showResubmitModal);
                    }, 100);
                  }}
                  className="btn btn-warning"
                  style={{ marginTop: '15px', width: '100%', padding: '10px' }}
                >
                  <FiRefreshCw style={{ marginRight: '5px' }} />
                  Re-submit Payment Information
                </button>
              )}
            </div>
          )}
        </div>

        {paymentInfo.status === 'pending' && (userRole === 'admin' || userRole === 'editor') && (
          <div className={styles.cardActions}>
            <button
              onClick={handleAcceptPayment}
              disabled={actionLoading}
              className="btn btn-success"
            >
              <FiCheck />
              Accept Payment
            </button>
            <button
              onClick={handleRejectPayment}
              disabled={actionLoading}
              className="btn btn-danger"
            >
              <FiX />
              Reject Payment
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Payment Modal - handles both initial submission and resubmission */}
      {showResubmitModal && (
        <>
          {/* Debug overlay to confirm modal is rendering */}
          <div style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: 'green',
            color: 'white',
            padding: '15px',
            zIndex: 10000,
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'monospace',
            border: '2px solid white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            minWidth: '300px'
          }}>
            🟢 MODAL DEBUG INFO:<br/>
            Modal State: <strong>{showResubmitModal.toString()}</strong><br/>
            Bank Config: <strong>{bankConfig ? 'Available ✅' : 'Not Available ❌'}</strong><br/>
            Payment Status: <strong>{paymentInfo?.status || 'No Payment'}</strong><br/>
            Amount: <strong>{bankConfig?.payableAmount || 'N/A'}</strong><br/>
            Is Author: <strong>{isAuthor?.toString() || 'undefined'}</strong><br/>
            User Role: <strong>{userRole || 'undefined'}</strong><br/>
            Show Admin Buttons: <strong>{(userRole === 'admin' || userRole === 'editor') && paymentInfo?.status === 'pending' ? 'YES' : 'NO'}</strong><br/>
            Current Payment ID: <strong>{paymentInfo?._id || 'None'}</strong><br/>
            All Payments Count: <strong>{allPayments.length}</strong><br/>
            Timestamp: <strong>{new Date().toLocaleTimeString()}</strong>
          </div>
          
          {bankConfig ? (
            <PaymentInfoModal
              isOpen={showResubmitModal}
              onClose={() => {
                console.log('Closing payment modal');
                setShowResubmitModal(false);
              }}
              amount={bankConfig.payableAmount}
              manuscriptId={paymentInfo?.status === 'rejected' ? `${manuscriptId}?rejected=true` : manuscriptId}
              onSubmit={handleResubmitPayment}
            />
          ) : (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 9999,
              textAlign: 'center'
            }}>
              <div style={{ marginBottom: '1rem' }}>Loading bank configuration...</div>
              <button 
                onClick={() => {
                  console.log('🏦 Manually retrying bank config fetch...');
                  fetchBankConfig();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
              <button 
                onClick={() => {
                  console.log('🏦 Closing modal due to bank config issue');
                  setShowResubmitModal(false);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginLeft: '0.5rem'
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
