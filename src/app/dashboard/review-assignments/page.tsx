'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FiCalendar, 
  FiClock, 
  FiUser, 
  FiFileText, 
  FiEye, 
  FiEdit,
  FiCheckCircle,
  FiAlertTriangle,
  FiFilter,
  FiDownload
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './ReviewAssignments.module.scss';

interface Review {
  _id: string;
  manuscriptId: {
    _id: string;
    title: string;
    authors: Array<{ name: string; email: string }>;
    status: string;
    submissionDate: string;
    category: string;
    abstract: string;
  };
  reviewerId: {
    _id: string;
    name: string;
    email: string;
  };
  type: string;
  status: string;
  assignedDate: string;
  dueDate: string;
  completedDate?: string;
  comments?: {
    confidentialToEditor?: string;
    forAuthors?: string;
    detailedReview?: string;
  };
  recommendation?: string;
}

export default function ReviewAssignmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!session.user.roles?.includes('reviewer') && !session.user.roles?.includes('editor')) {
      router.push('/dashboard');
      return;
    }

    fetchReviews();
  }, [session, status, router]);

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews');
      if (response.ok) {
        const data = await response.json();
        // Additional client-side filtering to ensure valid manuscript data
        const validReviews = (data.reviews || []).filter((review: Review) => {
          if (!review.manuscriptId || !review.manuscriptId.title) {
            console.warn('Filtered out review with null/invalid manuscriptId:', review._id);
            return false;
          }
          return true;
        });
        setReviews(validReviews);
      } else {
        toast.error('Failed to fetch review assignments');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Error loading review assignments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'in_progress':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'overdue':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (type: string) => {
    // Assign priority based on review type or other factors
    switch (type) {
      case 'double_blind':
        return '#ef4444'; // high priority
      case 'single_blind':
        return '#f59e0b'; // medium priority
      default:
        return '#10b981'; // low priority
    }
  };

  const getPriorityText = (type: string) => {
    switch (type) {
      case 'double_blind':
        return 'high';
      case 'single_blind':
        return 'medium';
      default:
        return 'low';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'completed' && new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredAndSortedReviews = reviews
    .filter(review => {
      // First check if review has valid manuscript data
      if (!review.manuscriptId || !review.manuscriptId.title) {
        return false;
      }
      
      // Filter by status
      if (filter !== 'all' && review.status !== filter) return false;
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          review.manuscriptId.title.toLowerCase().includes(searchLower) ||
          (review.manuscriptId.authors || []).some(author => 
            author.name.toLowerCase().includes(searchLower)
          ) ||
          (review.manuscriptId.category || '').toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'assignedDate':
          return new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime();
        case 'priority':
          const aPriority = getPriorityText(a.type);
          const bPriority = getPriorityText(b.type);
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[bPriority as keyof typeof priorityOrder] || 0) - (priorityOrder[aPriority as keyof typeof priorityOrder] || 0);
        case 'title':
          return (a.manuscriptId?.title || '').localeCompare(b.manuscriptId?.title || '');
        default:
          return 0;
      }
    });

  const getStatusStats = () => {
    const stats = {
      all: reviews.length,
      pending: reviews.filter(r => r.status === 'pending').length,
      in_progress: reviews.filter(r => r.status === 'in_progress').length,
      completed: reviews.filter(r => r.status === 'completed').length,
      overdue: reviews.filter(r => isOverdue(r.dueDate, r.status)).length,
    };
    return stats;
  };

  const handleStartReview = (reviewId: string) => {
    router.push(`/dashboard/reviews/${reviewId}`);
  };

  const handleViewManuscript = (manuscriptId: string) => {
    router.push(`/dashboard/manuscripts/${manuscriptId}`);
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading review assignments...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Review Assignments</h1>
        <p>Manage and track your manuscript review tasks</p>
      </div>

      {/* Statistics Cards */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiFileText />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.all}</h3>
            <p>Total Reviews</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#f59e0b' }}>
            <FiClock />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.pending}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#3b82f6' }}>
            <FiEdit />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.in_progress}</h3>
            <p>In Progress</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#10b981' }}>
            <FiCheckCircle />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.completed}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#ef4444' }}>
            <FiAlertTriangle />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.overdue}</h3>
            <p>Overdue</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by title, author, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Filter by Status:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="dueDate">Due Date</option>
              <option value="assignedDate">Assigned Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className={styles.reviewsList}>
        {filteredAndSortedReviews.length === 0 ? (
          <div className={styles.emptyState}>
            <FiFileText size={48} />
            <h3>No review assignments found</h3>
            <p>
              {searchTerm || filter !== 'all' 
                ? 'No reviews match your current search or filter criteria.'
                : 'You don\'t have any review assignments yet.'
              }
            </p>
          </div>
        ) : (
          filteredAndSortedReviews.map((review) => {
            // Skip reviews with null/undefined manuscriptId or invalid populated manuscript
            if (!review.manuscriptId || !review.manuscriptId.title) {
              console.warn('Review found with null/invalid manuscriptId:', review._id);
              return null;
            }
            
            return (
            <div key={review._id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.titleSection}>
                  <h3>{review.manuscriptId.title || 'Untitled Manuscript'}</h3>
                  <div className={styles.metadata}>
                    <span className={styles.category}>{review.manuscriptId.category || 'Unknown Category'}</span>
                    <span className={styles.reviewType}>{review.type} Review</span>
                    <span 
                      className={styles.priority}
                      style={{ backgroundColor: getPriorityColor(review.type) }}
                    >
                      {getPriorityText(review.type)} priority
                    </span>
                  </div>
                </div>
                <div className={styles.statusSection}>
                  <span 
                    className={styles.status}
                    style={{ color: getStatusColor(isOverdue(review.dueDate, review.status) ? 'overdue' : review.status) }}
                  >
                    {isOverdue(review.dueDate, review.status) ? 'Overdue' : 
                     review.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className={styles.reviewBody}>
                <div className={styles.manuscriptInfo}>
                  <p className={styles.authors}>
                    <FiUser /> {review.manuscriptId.authors?.map((a: any) => a.name).join(', ') || 'Unknown Authors'}
                  </p>
                  <p className={styles.abstract}>
                    {review.manuscriptId.abstract?.substring(0, 200) || 'No abstract available'}...
                  </p>
                </div>

                <div className={styles.dateInfo}>
                  <div className={styles.dateItem}>
                    <FiCalendar />
                    <span>Assigned: {new Date(review.assignedDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.dateItem}>
                    <FiClock />
                    <span>
                      Due: {new Date(review.dueDate).toLocaleDateString()}
                      {isOverdue(review.dueDate, review.status) ? (
                        <span className={styles.overdueBadge}>({Math.abs(getDaysUntilDue(review.dueDate))} days overdue)</span>
                      ) : (
                        getDaysUntilDue(review.dueDate) <= 7 && (
                          <span className={styles.dueSoonBadge}>({getDaysUntilDue(review.dueDate)} days left)</span>
                        )
                      )}
                    </span>
                  </div>
                  {review.completedDate && (
                    <div className={styles.dateItem}>
                      <FiCheckCircle />
                      <span>Completed: {new Date(review.completedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.reviewActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => handleViewManuscript(review.manuscriptId?._id || '')}
                  disabled={!review.manuscriptId?._id}
                >
                  <FiEye />
                  View Manuscript
                </button>
                {review.status === 'completed' ? (
                  <button
                    className={styles.primaryButton}
                    onClick={() => handleStartReview(review._id)}
                  >
                    <FiEye />
                    View Review
                  </button>
                ) : (
                  <button
                    className={styles.primaryButton}
                    onClick={() => handleStartReview(review._id)}
                  >
                    <FiEdit />
                    {review.status === 'pending' ? 'Start Review' : 'Continue Review'}
                  </button>
                )}
              </div>
            </div>
          );
          }).filter(Boolean) // Filter out null values
        )}
      </div>
    </div>
  );
}
