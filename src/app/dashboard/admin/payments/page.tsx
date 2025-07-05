'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FiDollarSign, 
  FiCheck, 
  FiX, 
  FiClock, 
  FiEye, 
  FiFilter,
  FiSearch,
  FiArrowLeft
} from 'react-icons/fi';
import styles from './AdminPaymentDashboard.module.scss';

interface PaymentInfo {
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
  invoiceNumber?: string;
  createdAt: string;
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
}

export default function AdminPaymentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [paymentInfos, setPaymentInfos] = useState<PaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check admin access
    const hasAdminAccess = session.user.roles?.includes('admin') || 
                          session.user.currentActiveRole === 'admin' || 
                          session.user.role === 'admin';

    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }

    fetchPaymentInfos();
  }, [session, status, router, filter, currentPage]);

  const fetchPaymentInfos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/payment-info?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentInfos(data.paymentInfos || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        console.error('Failed to fetch payment information');
      }
    } catch (error) {
      console.error('Error fetching payment information:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (paymentId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`/api/payment-info/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        alert(`Payment ${action === 'accept' ? 'approved' : 'rejected'} successfully!`);
        await fetchPaymentInfos(); // Refresh data
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${action} payment`);
      }
    } catch (error) {
      console.error(`Error ${action}ing payment:`, error);
      alert(`Error ${action}ing payment`);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheck />;
      case 'pending':
        return <FiClock />;
      case 'rejected':
        return <FiX />;
      default:
        return <FiDollarSign />;
    }
  };

  const filteredPayments = paymentInfos.filter(payment => {
    const manuscriptTitle = payment.manuscriptId?.title || '';
    const authorName = payment.userId?.name || '';
    const accountHolder = payment.accountHolderName || '';
    
    return manuscriptTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
           authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           accountHolder.toLowerCase().includes(searchTerm.toLowerCase()) ||
           payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: paymentInfos.length,
    pending: paymentInfos.filter(p => p.status === 'pending').length,
    completed: paymentInfos.filter(p => p.status === 'completed').length,
    rejected: paymentInfos.filter(p => p.status === 'rejected').length,
    totalAmount: paymentInfos
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/dashboard/admin')}
        >
          <FiArrowLeft />
          Back to Admin Dashboard
        </button>
        
        <div className={styles.headerContent}>
          <FiDollarSign className={styles.headerIcon} />
          <div>
            <h1>Payment Management</h1>
            <p>Review and process author payment submissions</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiDollarSign />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.total}</h3>
            <p>Total Submissions</p>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon + ' ' + styles.pending}>
            <FiClock />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.pending}</h3>
            <p>Pending Review</p>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon + ' ' + styles.completed}>
            <FiCheck />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.completed}</h3>
            <p>Approved</p>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon + ' ' + styles.rejected}>
            <FiX />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.rejected}</h3>
            <p>Rejected</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <FiFilter />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className={styles.searchGroup}>
          <FiSearch />
          <input
            type="text"
            placeholder="Search by manuscript, author, or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Payment Submissions Table */}
      <div className={styles.tableContainer}>
        <table className={styles.paymentsTable}>
          <thead>
            <tr>
              <th>Manuscript</th>
              <th>Author</th>
              <th>Account Holder</th>
              <th>Amount</th>
              <th>Transaction ID</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <tr key={payment._id}>
                  <td>
                    <div className={styles.manuscriptInfo}>
                      <div className={styles.manuscriptTitle}>
                        {payment.manuscriptId?.title || 'Unknown Manuscript'}
                      </div>
                      <div className={styles.manuscriptId}>
                        ID: {payment.manuscriptId?._id}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.authorInfo}>
                      <div className={styles.authorName}>{payment.userId?.name}</div>
                      <div className={styles.authorEmail}>{payment.userId?.email}</div>
                    </div>
                  </td>
                  <td>{payment.accountHolderName}</td>
                  <td className={styles.amount}>${payment.amount.toFixed(2)}</td>
                  <td className={styles.transactionId}>{payment.transactionId}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                  <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => router.push(`/dashboard/manuscripts/${payment.manuscriptId?._id}`)}
                        title="View Manuscript"
                      >
                        <FiEye />
                      </button>
                      {payment.status === 'pending' && (
                        <>
                          <button
                            className={styles.approveBtn}
                            onClick={() => handlePaymentAction(payment._id, 'accept')}
                            title="Accept Payment"
                          >
                            <FiCheck />
                          </button>
                          <button
                            className={styles.rejectBtn}
                            onClick={() => handlePaymentAction(payment._id, 'reject')}
                            title="Reject Payment"
                          >
                            <FiX />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className={styles.noData}>
                  No payment submissions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
