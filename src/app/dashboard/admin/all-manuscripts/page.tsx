'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, 
  FiSearch, 
  FiFilter, 
  FiTrash2, 
  FiEye, 
  FiAlertTriangle,
  FiUser,
  FiCalendar,
  FiFileText
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './AllManuscripts.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  status: string;
  category: string;
  submissionDate: string;
  lastModified: string;
  submittedBy: {
    name: string;
    email: string;
  };
  authors: Array<{
    firstName: string;
    lastName: string;
    email: string;
  }>;
  keywords: string[];
}

export default function AllManuscriptsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [filteredManuscripts, setFilteredManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [manuscriptToDelete, setManuscriptToDelete] = useState<Manuscript | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check admin access
    const userRole = session.user.currentActiveRole || session.user.role;
    const userRoles = session.user.roles || [userRole];
    const hasAdminAccess = userRoles.includes('admin') || userRole === 'admin';

    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }

    fetchManuscripts();
  }, [session, status, router]);

  useEffect(() => {
    filterManuscripts();
  }, [manuscripts, searchTerm, statusFilter, categoryFilter]);

  const fetchManuscripts = async () => {
    try {
      const response = await fetch('/api/manuscripts?admin=true');
      if (response.ok) {
        const data = await response.json();
        setManuscripts(data.manuscripts || []);
      } else {
        toast.error('Failed to fetch manuscripts');
      }
    } catch (error) {
      console.error('Error fetching manuscripts:', error);
      toast.error('Error loading manuscripts');
    } finally {
      setLoading(false);
    }
  };

  const filterManuscripts = () => {
    let filtered = manuscripts;

    if (searchTerm) {
      filtered = filtered.filter(manuscript =>
        manuscript.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manuscript.submittedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manuscript.submittedBy.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manuscript.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(manuscript => manuscript.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(manuscript => manuscript.category === categoryFilter);
    }

    setFilteredManuscripts(filtered);
  };

  const handleDeleteClick = (manuscript: Manuscript) => {
    setManuscriptToDelete(manuscript);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!manuscriptToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscriptToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`Manuscript "${manuscriptToDelete.title}" deleted successfully`);
        setManuscripts(prev => prev.filter(m => m._id !== manuscriptToDelete._id));
        setShowDeleteModal(false);
        setManuscriptToDelete(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete manuscript');
      }
    } catch (error) {
      console.error('Error deleting manuscript:', error);
      toast.error('Error deleting manuscript');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      'submitted': styles.statusSubmitted,
      'under-review': styles.statusUnderReview,
      'under-editorial-review': styles.statusEditorialReview,
      'major-revision-requested': styles.statusMajorRevision,
      'minor-revision-requested': styles.statusMinorRevision,
      'accepted': styles.statusAccepted,
      'rejected': styles.statusRejected,
      'payment-required': styles.statusPaymentRequired,
      'payment-submitted': styles.statusPaymentSubmitted,
      'in-production': styles.statusInProduction,
      'published': styles.statusPublished,
    };

    return `${styles.statusBadge} ${statusClasses[status] || styles.statusDefault}`;
  };

  const getStatusDisplayText = (status: string) => {
    const statusTexts: { [key: string]: string } = {
      'submitted': 'Submitted',
      'under-review': 'Under Review',
      'under-editorial-review': 'Editorial Review',
      'major-revision-requested': 'Major Revision',
      'minor-revision-requested': 'Minor Revision',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
      'payment-required': 'Payment Required',
      'payment-submitted': 'Payment Submitted',
      'in-production': 'In Production',
      'published': 'Published',
    };
    return statusTexts[status] || status;
  };

  const uniqueStatuses = Array.from(new Set(manuscripts.map(m => m.status)));
  const uniqueCategories = Array.from(new Set(manuscripts.map(m => m.category)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.allManuscriptsPage}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <Link href="/dashboard/admin" className={styles.backButton}>
              <FiArrowLeft />
              Back to Admin Dashboard
            </Link>
            <h1>All Manuscripts</h1>
            <p>View and manage all submitted manuscripts</p>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{manuscripts.length}</span>
              <span className={styles.statLabel}>Total Manuscripts</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{filteredManuscripts.length}</span>
              <span className={styles.statLabel}>Filtered Results</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.searchFilter}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search by title, author, email, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.selectFilters}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {getStatusDisplayText(status)}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Warning Notice */}
        <div className={styles.warningNotice}>
          <FiAlertTriangle />
          <div>
            <h3>⚠️ Administrative Manuscript Management</h3>
            <p>This section allows permanent deletion of manuscripts and all associated data. Use with extreme caution. Deleted manuscripts cannot be recovered.</p>
          </div>
        </div>

        {/* Manuscripts List */}
        <div className={styles.manuscriptsList}>
          {filteredManuscripts.length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText />
              <h3>No manuscripts found</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            filteredManuscripts.map((manuscript) => (
              <div key={manuscript._id} className={styles.manuscriptCard}>
                <div className={styles.manuscriptHeader}>
                  <div className={styles.manuscriptTitle}>
                    <h3>{manuscript.title}</h3>
                    <span className={getStatusBadge(manuscript.status)}>
                      {getStatusDisplayText(manuscript.status)}
                    </span>
                  </div>
                </div>

                <div className={styles.manuscriptMeta}>
                  <div className={styles.metaItem}>
                    <FiUser />
                    <span>Submitted by: {manuscript.submittedBy.name}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <FiCalendar />
                    <span>Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <FiFileText />
                    <span>Category: {manuscript.category}</span>
                  </div>
                </div>

                <div className={styles.manuscriptAuthors}>
                  <strong>Authors:</strong> {manuscript.authors.map(author => 
                    `${author.firstName} ${author.lastName}`
                  ).join(', ')}
                </div>

                <div className={styles.manuscriptKeywords}>
                  {manuscript.keywords.slice(0, 5).map((keyword, index) => (
                    <span key={index} className={styles.keyword}>
                      {keyword}
                    </span>
                  ))}
                  {manuscript.keywords.length > 5 && (
                    <span className={styles.moreKeywords}>
                      +{manuscript.keywords.length - 5} more
                    </span>
                  )}
                </div>

                <div className={styles.manuscriptActions}>
                  <Link 
                    href={`/dashboard/manuscripts/${manuscript._id}`}
                    className={`${styles.actionButton} ${styles.viewButton}`}
                  >
                    <FiEye />
                    View Details
                  </Link>
                  <button 
                    onClick={() => handleDeleteClick(manuscript)}
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                  >
                    <FiTrash2 />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && manuscriptToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>⚠️ Confirm Manuscript Deletion</h3>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.warningIcon}>
                <FiAlertTriangle />
              </div>
              <div className={styles.modalContent}>
                <p><strong>You are about to permanently delete:</strong></p>
                <div className={styles.manuscriptInfo}>
                  <p><strong>Title:</strong> {manuscriptToDelete.title}</p>
                  <p><strong>Author:</strong> {manuscriptToDelete.submittedBy.name}</p>
                  <p><strong>Status:</strong> {getStatusDisplayText(manuscriptToDelete.status)}</p>
                  <p><strong>Submitted:</strong> {new Date(manuscriptToDelete.submissionDate).toLocaleDateString()}</p>
                </div>
                <div className={styles.warningText}>
                  <p>⚠️ <strong>This action cannot be undone!</strong></p>
                  <p>This will permanently delete:</p>
                  <ul>
                    <li>The manuscript and all its files</li>
                    <li>All associated reviews and comments</li>
                    <li>Payment records (if any)</li>
                    <li>Timeline and history data</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className={styles.cancelButton}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className={styles.confirmDeleteButton}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 />
                    Yes, Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
