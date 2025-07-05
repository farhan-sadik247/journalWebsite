'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import PaymentSubmissionCard from '@/components/PaymentSubmissionCard';
import styles from './PaymentDashboard.module.scss';
import {
  FiDollarSign,
  FiClock,
  FiCheck,
  FiX,
  FiFilter,
  FiSearch,
  FiCalendar,
  FiFileText
} from 'react-icons/fi';

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
  rejectionReason?: string;
  createdAt: string;
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
}

export default function PaymentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [paymentSubmissions, setPaymentSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchPaymentSubmissions();
    }
  }, [session, status, filter, currentPage]);

  const fetchPaymentSubmissions = async () => {
    if (!session?.user) {
      console.log('No session, skipping payment submissions fetch');
      return;
    }
    
    console.log('Fetching payment submissions...');
    try {
      setLoading(true);
      
      let url = '/api/payment-info';
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      
      // For admins/editors, optionally filter by status
      if (isAdmin && filter !== 'all') {
        params.append('status', filter);
      }
      
      url += '?' + params.toString();
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Payment submissions fetched successfully:', data.paymentInfos?.length);
        setPaymentSubmissions(data.paymentInfos || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        console.error('Failed to fetch payment submissions');
      }
    } catch (error) {
      console.error('Error fetching payment submissions:', error);
    } finally {
      setLoading(false);
    }
  };

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
        return styles.statusSuccess;
      case 'pending':
        return styles.statusWarning;
      case 'rejected':
        return styles.statusDanger;
      default:
        return styles.statusSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredSubmissions = paymentSubmissions.filter(submission => {
    const manuscriptTitle = submission.manuscriptId?.title || '';
    const accountHolder = submission.accountHolderName || '';
    const transactionId = submission.transactionId || '';
    
    const searchLower = searchTerm.toLowerCase();
    return manuscriptTitle.toLowerCase().includes(searchLower) ||
           accountHolder.toLowerCase().includes(searchLower) ||
           transactionId.toLowerCase().includes(searchLower);
  });

  const stats = {
    total: paymentSubmissions.length,
    pending: paymentSubmissions.filter(p => p.status === 'pending').length,
    completed: paymentSubmissions.filter(p => p.status === 'completed').length,
    rejected: paymentSubmissions.filter(p => p.status === 'rejected').length,
    totalAmount: paymentSubmissions
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
  };

  const handleAcceptPayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to accept this payment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/payment-info/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'accept'
        }),
      });

      if (response.ok) {
        alert('Payment accepted successfully!');
        await fetchPaymentSubmissions();
      } else {
        const errorData = await response.json();
        alert('Failed to accept payment: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error accepting payment:', error);
      alert('Error accepting payment');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const rejectionReason = prompt('Please provide a reason for rejection:', 'Wrong TrxID!!');
    if (!rejectionReason) {
      return;
    }

    if (!confirm('Are you sure you want to reject this payment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/payment-info/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason
        }),
      });

      if (response.ok) {
        alert('Payment rejected successfully!');
        await fetchPaymentSubmissions();
      } else {
        const errorData = await response.json();
        alert('Failed to reject payment: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Error rejecting payment');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className={styles.paymentDashboard}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>
              {isAdmin ? 'Payment Management' : 'My Payment History'}
            </h1>
            <p>
              {isAdmin ? 'Review and manage payment submissions from authors' : 'View your payment submissions and status'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiFileText />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.total}</h3>
              <p>Total Submissions</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiClock />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.pending}</h3>
              <p>Pending</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiCheck />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.completed}</h3>
              <p>Completed</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiX />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.rejected}</h3>
              <p>Rejected</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className={styles.filtersSection}>
          <div className={styles.filterGroup}>
            <FiFilter />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Submissions</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className={styles.searchGroup}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search by manuscript title, account holder, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Payment Submissions */}
        <div className={styles.submissionsContainer}>
          <div className={styles.submissionsHeader}>
            <h3>Payment Submissions</h3>
            <p>{isAdmin ? 'Review and approve payment information submitted by authors' : 'Your payment submission history'}</p>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>
              <div className="spinner" />
              <p>Loading payment submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText />
              <h3>No payment submissions found</h3>
              <p>
                {searchTerm
                  ? 'No submissions match your search criteria.'
                  : paymentSubmissions.length === 0
                  ? 'No payment submissions have been created yet.'
                  : 'All submissions are filtered out by your current filter.'}
              </p>
            </div>
          ) : (
            <div className={styles.submissionsGrid}>
              {filteredSubmissions.map((submission) => (
                <div key={submission._id} className={styles.submissionCard}>
                  <PaymentSubmissionCard
                    submission={submission}
                    onUpdate={fetchPaymentSubmissions}
                    onApprove={isAdmin ? handleAcceptPayment : undefined}
                    onReject={isAdmin ? handleRejectPayment : undefined}
                    showActions={isAdmin}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
            >
              Previous
            </button>
            
            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
