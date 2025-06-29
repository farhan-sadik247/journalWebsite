'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './PaymentDashboard.module.scss';
import {
  FiDollarSign,
  FiClock,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiDownload,
  FiEye,
  FiFilter,
  FiSearch,
  FiCalendar,
  FiCreditCard,
  FiFileText
} from 'react-icons/fi';

interface Payment {
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
  waiverReason?: string;
  createdAt: string;
}

export default function PaymentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = searchParams?.get('view') || 'default'; // admin, editor, or default
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchPayments();
    }
  }, [session, status, filter, currentPage]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/payments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
        setTotalPages(data.pagination.pages);
      } else {
        console.error('Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
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
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredPayments = payments.filter(payment =>
    payment.manuscriptId.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    completed: payments.filter(p => p.status === 'completed').length,
    waived: payments.filter(p => p.status === 'waived').length,
    totalAmount: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
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
              {viewMode === 'admin' ? 'Payment Management' :
               viewMode === 'editor' ? 'Payment Oversight' :
               'Payment Dashboard'}
            </h1>
            <p>
              {viewMode === 'admin' ? 'Manage APC fees, payments, and system configuration' :
               viewMode === 'editor' ? 'Review payments, approve waivers, and monitor APC status' :
               'View your payment status and invoice history'}
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
              <p>Total Payments</p>
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
              <FiDollarSign />
            </div>
            <div className={styles.statInfo}>
              <h3>{formatCurrency(stats.totalAmount)}</h3>
              <p>Total Revenue</p>
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
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="waived">Waived</option>
            </select>
          </div>

          <div className={styles.searchGroup}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search by manuscript title or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className={styles.tableContainer}>
          <table className={styles.paymentsTable}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Manuscript</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Method</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment._id}>
                  <td>
                    <div className={styles.invoiceCell}>
                      <FiFileText />
                      <span>{payment.invoiceNumber}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.manuscriptCell}>
                      <h4>{payment.manuscriptId.title}</h4>
                      <span>ID: {payment.manuscriptId._id.slice(-8)}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.amountCell}>
                      <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                      {payment.discountAmount > 0 && (
                        <div className={styles.discountInfo}>
                          <small>
                            Original: {formatCurrency(payment.baseFee, payment.currency)}
                          </small>
                          <small className={styles.discountText}>
                            -{formatCurrency(payment.discountAmount, payment.currency)}
                          </small>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.statusBadge} ${getStatusBadgeClass(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      <span>{payment.status.replace('-', ' ').toUpperCase()}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.methodCell}>
                      <FiCreditCard />
                      <span>{payment.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.dateCell}>
                      <FiCalendar />
                      <span>{formatDate(payment.dueDate)}</span>
                      {new Date(payment.dueDate) < new Date() && payment.status === 'pending' && (
                        <div className={styles.overdueIndicator}>
                          <FiAlertCircle />
                          Overdue
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        onClick={() => router.push(`/dashboard/payments/${payment._id}`)}
                        className={`${styles.actionButton} ${styles.viewButton}`}
                        title="View Details"
                      >
                        <FiEye />
                      </button>
                      {payment.status === 'completed' && (
                        <button
                          className={`${styles.actionButton} ${styles.downloadButton}`}
                          title="Download Receipt"
                        >
                          <FiDownload />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className={styles.emptyState}>
              <FiDollarSign />
              <h3>No payments found</h3>
              <p>
                {searchTerm
                  ? 'No payments match your search criteria.'
                  : 'No payments have been created yet.'}
              </p>
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
                  className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
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
