'use client';

import { FiUser, FiDollarSign, FiCalendar, FiFileText, FiCheck, FiX, FiClock } from 'react-icons/fi';
import styles from './PaymentSubmissionCard.module.scss';

interface PaymentSubmission {
  _id: string;
  manuscriptId: {
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
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  verifiedBy?: {
    name: string;
    email: string;
  };
  verifiedAt?: string;
}

interface PaymentSubmissionCardProps {
  submission: PaymentSubmission;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onView?: (id: string) => void;
  onUpdate?: () => Promise<void>;
  showActions?: boolean;
}

export default function PaymentSubmissionCard({ 
  submission, 
  onApprove, 
  onReject, 
  onView,
  onUpdate,
  showActions = true 
}: PaymentSubmissionCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheck className={styles.iconSuccess} />;
      case 'pending':
        return <FiClock className={styles.iconWarning} />;
      case 'rejected':
        return <FiX className={styles.iconDanger} />;
      default:
        return <FiDollarSign className={styles.iconSecondary} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return styles.statusCompleted;
      case 'pending':
        return styles.statusPending;
      case 'rejected':
        return styles.statusRejected;
      default:
        return styles.statusDefault;
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

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.manuscriptInfo}>
          <h3 className={styles.manuscriptTitle}>
            {submission.manuscriptId?.title || 'Unknown Manuscript'}
          </h3>
          <span className={styles.manuscriptId}>
            ID: {submission.manuscriptId?._id}
          </span>
        </div>
        <div className={`${styles.statusBadge} ${getStatusBadgeClass(submission.status)}`}>
          {getStatusIcon(submission.status)}
          <span>{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</span>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <FiUser className={styles.infoIcon} />
            <div>
              <span className={styles.infoLabel}>Author</span>
              <span className={styles.infoValue}>{submission.userId?.name}</span>
              <span className={styles.infoSub}>{submission.userId?.email}</span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <FiFileText className={styles.infoIcon} />
            <div>
              <span className={styles.infoLabel}>Account Holder</span>
              <span className={styles.infoValue}>{submission.accountHolderName}</span>
              <span className={styles.infoSub}>Transaction: {submission.transactionId}</span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <FiDollarSign className={styles.infoIcon} />
            <div>
              <span className={styles.infoLabel}>Amount</span>
              <span className={styles.infoValue}>{formatCurrency(submission.amount)}</span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <FiCalendar className={styles.infoIcon} />
            <div>
              <span className={styles.infoLabel}>Submitted</span>
              <span className={styles.infoValue}>{formatDate(submission.createdAt)}</span>
              {submission.verifiedAt && (
                <span className={styles.infoSub}>
                  Verified: {formatDate(submission.verifiedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {submission.verifiedBy && (
          <div className={styles.verificationInfo}>
            <span className={styles.verificationText}>
              Verified by: {submission.verifiedBy.name}
            </span>
          </div>
        )}
      </div>

      {showActions && (
        <div className={styles.cardActions}>
          {onView && (
            <button
              className={styles.viewBtn}
              onClick={() => onView(submission._id)}
            >
              View Details
            </button>
          )}
          
          {submission.status === 'pending' && (
            <>
              {onApprove && (
                <button
                  className={styles.approveBtn}
                  onClick={() => onApprove(submission._id)}
                >
                  <FiCheck />
                  Approve
                </button>
              )}
              {onReject && (
                <button
                  className={styles.rejectBtn}
                  onClick={() => onReject(submission._id)}
                >
                  <FiX />
                  Reject
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
