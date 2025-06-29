'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './ReviewerDashboard.module.scss';

interface Review {
  _id: string;
  manuscriptId: {
    _id: string;
    title: string;
    authors: Array<{ name: string; email: string }>;
    status: string;
    submissionDate: string;
  };
  type: string;
  status: string;
  assignedDate: string;
  dueDate: string;
  submittedDate?: string;
}

export default function ReviewerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!session.user.roles?.includes('reviewer')) {
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
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true;
    return review.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'in_progress':
        return 'blue';
      case 'completed':
        return 'green';
      case 'overdue':
        return 'red';
      default:
        return 'gray';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'completed' && new Date(dueDate) < new Date();
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Reviewer Dashboard</h1>
        <p>Manage your assigned manuscript reviews</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h3>{reviews.filter(r => r.status === 'pending').length}</h3>
          <p>Pending Reviews</p>
        </div>
        <div className={styles.statCard}>
          <h3>{reviews.filter(r => r.status === 'in_progress').length}</h3>
          <p>In Progress</p>
        </div>
        <div className={styles.statCard}>
          <h3>{reviews.filter(r => r.status === 'completed').length}</h3>
          <p>Completed</p>
        </div>
        <div className={styles.statCard}>
          <h3>{reviews.filter(r => isOverdue(r.dueDate, r.status)).length}</h3>
          <p>Overdue</p>
        </div>
      </div>

      <div className={styles.filters}>
        <button
          className={filter === 'all' ? styles.active : ''}
          onClick={() => setFilter('all')}
        >
          All Reviews
        </button>
        <button
          className={filter === 'pending' ? styles.active : ''}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          className={filter === 'in_progress' ? styles.active : ''}
          onClick={() => setFilter('in_progress')}
        >
          In Progress
        </button>
        <button
          className={filter === 'completed' ? styles.active : ''}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      <div className={styles.reviewsList}>
        {filteredReviews.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No reviews found</h3>
            <p>You don&apos;t have any reviews matching the current filter.</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review._id} className={styles.reviewCard}>
              <div className={styles.reviewInfo}>
                <h3>{review.manuscriptId.title}</h3>
                <p className={styles.authors}>
                  by {review.manuscriptId.authors.map((a: any) => a.name).join(', ')}
                </p>
                <div className={styles.metadata}>
                  <span className={styles.type}>{review.type} Review</span>
                  <span 
                    className={styles.status}
                    style={{ color: getStatusColor(isOverdue(review.dueDate, review.status) ? 'overdue' : review.status) }}
                  >
                    {isOverdue(review.dueDate, review.status) ? 'Overdue' : 
                     review.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className={styles.dates}>
                  <span>Assigned: {new Date(review.assignedDate).toLocaleDateString()}</span>
                  <span>Due: {new Date(review.dueDate).toLocaleDateString()}</span>
                  {review.submittedDate && (
                    <span>Submitted: {new Date(review.submittedDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className={styles.actions}>
                {review.status === 'completed' ? (
                  <button
                    className={styles.viewButton}
                    onClick={() => router.push(`/dashboard/reviews/${review._id}`)}
                  >
                    View Review
                  </button>
                ) : (
                  <button
                    className={styles.reviewButton}
                    onClick={() => router.push(`/dashboard/reviews/${review._id}`)}
                  >
                    {review.status === 'pending' ? 'Start Review' : 'Continue Review'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
