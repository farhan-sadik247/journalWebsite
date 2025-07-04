'use client';

import { useState } from 'react';
import { FiCheck, FiX, FiClock, FiDollarSign, FiUser, FiHash, FiCalendar, FiFileText } from 'react-icons/fi';
import styles from './PaymentSubmissionCard.module.scss';

interface PaymentSubmission {
  _id: string;
  manuscriptId?: {
    _id: string;
    title: string;
    status: string;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  accountHolderName: string;
  amount: number;
  transactionId: string;
  invoiceNumber?: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: {
    name: string;
    email: string;
  };
  rejectionReason?: string;
}

interface PaymentSubmissionCardProps {
  submission: PaymentSubmission;
  onUpdate: () => void;
}

export default function PaymentSubmissionCard({ submission: initialSubmission, onUpdate }: PaymentSubmissionCardProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  // Use state to track the submission and its status
  const [submission, setSubmission] = useState<PaymentSubmission>(initialSubmission);
  // Track if this submission card should be displayed at all
  const [isVisible, setIsVisible] = useState(true);

  // This function will fetch the latest data for this submission
  const refreshSubmissionData = async () => {
    try {
      setActionLoading(true);
      console.log('Refreshing submission data for', submission._id);
      console.log('Current status before refresh:', submission.status);
      
      const response = await fetch(`/api/payment-info/${submission._id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Refreshed data:', data.paymentInfo);
        
        if (data.paymentInfo) {
          // Update submission with fresh data
          setSubmission(data.paymentInfo);
          console.log('Updated status after refresh:', data.paymentInfo.status);
          
          // If the status is now changed, we can update visibility after a delay
          if (data.paymentInfo.status !== 'pending') {
            setTimeout(() => {
              setIsVisible(false);
            }, 3000); // 3 seconds delay to show the updated state
          }
          
          // Update parent component data as well
          onUpdate();
          
          // Show alert about the status
          alert(`Current payment status: ${data.paymentInfo.status}`);
        } else {
          console.error('API returned success but no payment info data');
          alert('Could not fetch updated payment data');
        }
      } else {
        console.error('Failed to refresh submission data');
        alert('Failed to refresh payment data from the server');
      }
    } catch (error) {
      console.error('Error refreshing submission data:', error);
      alert(`Error refreshing data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      console.log('Sending accept request for submission:', submission._id);
      const response = await fetch(`/api/payment-info/${submission._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (response.ok) {
        console.log('Accept successful, updating data');
        const result = await response.json();
        console.log('Accept response data:', result);
        
        // Update our local component state immediately
        if (result.paymentInfo) {
          const updatedSubmission = result.paymentInfo;
          setSubmission(updatedSubmission);
          
          // If the status is now "completed", we can remove this card from view after a delay
          if (updatedSubmission.status === 'completed') {
            setTimeout(() => {
              setIsVisible(false);
            }, 3000); // 3 seconds delay to show the completed state
          }
        } else {
          await refreshSubmissionData(); // Fetch the updated data
        }
        
        // Call onUpdate to refresh the parent component with new data
        onUpdate();
      } else {
        const error = await response.json();
        console.error('Accept failed with server error:', error);
        alert(`Error: ${error.error || 'Failed to accept payment'}`);
      }
    } catch (error) {
      console.error('Error accepting payment:', error);
      alert('An error occurred while accepting the payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      console.log('Sending rejection request for submission:', submission._id);
      console.log('Current status before rejection:', submission.status);
      
      const response = await fetch(`/api/payment-info/${submission._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'reject',
          rejectionReason: rejectionReason.trim()
        }),
      });

      const responseText = await response.text();
      console.log('Raw API response:', responseText);
      
      let result;
      try {
        // Parse the response text as JSON
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        alert('Server returned an invalid response format');
        return;
      }

      if (response.ok && result.success) {
        console.log('Rejection successful, closing modal and updating parent');
        console.log('Rejection response data:', result);
        
        // Update our local component state immediately
        if (result.paymentInfo) {
          const updatedSubmission = result.paymentInfo;
          console.log('Updated submission from API:', updatedSubmission);
          console.log('New status from API:', updatedSubmission.status);
          
          // Force the status to rejected if it's not already
          if (updatedSubmission.status !== 'rejected') {
            console.warn('API returned success but status is not rejected, forcing status update locally');
            updatedSubmission.status = 'rejected';
          }
          
          setSubmission(updatedSubmission);
          
          // If the status is now "rejected", we can remove this card from view after a delay
          // so the user can see the status change
          setTimeout(() => {
            setIsVisible(false);
          }, 3000); // 3 seconds delay to show the rejected state
        } else {
          console.warn('API response missing paymentInfo, fetching data manually');
          await refreshSubmissionData(); // Fetch the updated data
          
          // Force the status update locally if needed
          setSubmission(prev => ({...prev, status: 'rejected'}));
        }
        
        setShowRejectModal(false);
        setRejectionReason('');
        // Call onUpdate to refresh the parent component with new data
        onUpdate();
      } else {
        console.error('Rejection failed with server error:', result);
        alert(`Error: ${result.error || 'Failed to reject payment'}`);
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('An error occurred while rejecting the payment');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusDisplay = () => {
    switch (submission.status) {
      case 'completed':
        return { icon: <FiCheck />, text: 'Approved', className: styles.approved };
      case 'rejected':
        return { icon: <FiX />, text: 'Rejected', className: styles.rejected };
      case 'pending':
      default:
        return { icon: <FiClock />, text: 'Pending Review', className: styles.pending };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Don't render anything if the card shouldn't be visible
  if (!isVisible) {
    return null;
  }
  
  return (
    <>
      <div className={styles.submissionCard}>
        <div className={styles.header}>
          <div className={`${styles.statusBadge} ${statusDisplay.className}`}>
            {statusDisplay.icon}
            <span>{statusDisplay.text}</span>
          </div>
          <div className={styles.submissionDate}>
            <FiCalendar />
            <span>{formatDate(submission.createdAt)}</span>
          </div>
        </div>

        <div className={styles.manuscriptInfo}>
          <div className={styles.manuscriptTitle}>
            <FiFileText />
            <h4>{submission.manuscriptId?.title || 'Unknown Manuscript'}</h4>
          </div>
          <div className={styles.manuscriptId}>
            ID: {submission.manuscriptId?._id?.slice(-8) || 'N/A'}
          </div>
          {submission.invoiceNumber && (
            <div className={styles.invoiceNumber}>
              Invoice: {submission.invoiceNumber}
            </div>
          )}
        </div>

        <div className={styles.authorInfo}>
          <div className={styles.authorName}>
            <FiUser />
            <span>{submission.userId.name}</span>
          </div>
          <div className={styles.authorEmail}>
            {submission.userId.email}
          </div>
        </div>

        <div className={styles.paymentDetails}>
          <div className={styles.amount}>
            <FiDollarSign />
            <span className={styles.amountValue}>{formatCurrency(submission.amount)}</span>
          </div>
          <div className={styles.accountHolder}>
            <strong>Account Holder:</strong> {submission.accountHolderName}
          </div>
          <div className={styles.transactionId}>
            <FiHash />
            <span>Transaction ID: {submission.transactionId}</span>
          </div>
        </div>

        {submission.status === 'rejected' && submission.rejectionReason && (
          <div className={styles.rejectionInfo}>
            <div className={styles.rejectionLabel}>
              <FiX />
              <strong>Rejection Reason:</strong>
            </div>
            <div className={styles.rejectionReason}>
              {submission.rejectionReason}
            </div>
          </div>
        )}

        {submission.status === 'completed' && submission.verifiedAt && (
          <div className={styles.verificationInfo}>
            <div className={styles.verificationLabel}>
              <FiCheck />
              <strong>Verified:</strong>
            </div>
            <div className={styles.verificationDetails}>
              {formatDate(submission.verifiedAt)}
              {submission.verifiedBy && ` by ${submission.verifiedBy.name}`}
            </div>
          </div>
        )}

        {(submission.status === 'pending' || actionLoading) && (
          <div className={styles.actions}>
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className={`${styles.actionButton} ${styles.acceptButton}`}
            >
              <FiCheck />
              {actionLoading ? 'Processing...' : 'Accept'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className={`${styles.actionButton} ${styles.rejectButton}`}
            >
              <FiX />
              {actionLoading && submission.status === 'rejected' ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={() => refreshSubmissionData()}
              disabled={actionLoading}
              className={`${styles.actionButton}`}
              style={{ marginLeft: '8px', backgroundColor: '#555' }}
            >
              ⟳ Refresh
            </button>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Reject Payment Submission</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className={styles.closeButton}
              >
                <FiX />
              </button>
            </div>
            <div className={styles.modalContent}>
              <p>Please provide a reason for rejecting this payment submission:</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className={styles.rejectionTextarea}
                rows={4}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowRejectModal(false)}
                className={`${styles.modalButton} ${styles.cancelButton}`}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className={`${styles.modalButton} ${styles.confirmButton}`}
              >
                {actionLoading ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
