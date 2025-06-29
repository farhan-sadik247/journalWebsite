'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './EditorDashboard.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{ name: string; email: string }>;
  status: string;
  submissionDate: string;
  lastModified: string;
  reviewsCount: number;
  completedReviews: number;
}

interface Review {
  _id: string;
  manuscriptId: {
    _id: string;
    title: string;
  };
  reviewerId: {
    _id: string;
    name: string;
    email: string;
  };
  status: string;
  assignedDate: string;
  dueDate: string;
  recommendation?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  specializations?: string[];
}

export default function EditorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'manuscripts' | 'reviews' | 'assign'>('manuscripts');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedManuscript, setSelectedManuscript] = useState<string>('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [reviewType, setReviewType] = useState<'single_blind' | 'double_blind'>('double_blind');
  const [reviewerSearchTerm, setReviewerSearchTerm] = useState<string>('');
  const [showReviewerSearch, setShowReviewerSearch] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowReviewerSearch(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!session.user.roles?.includes('editor') && !session.user.roles?.includes('admin')) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch manuscripts
      const manuscriptsResponse = await fetch('/api/manuscripts?editor=true');
      const manuscriptsData = await manuscriptsResponse.json();
      setManuscripts(manuscriptsData.manuscripts || []);

      // Fetch reviews
      const reviewsResponse = await fetch('/api/reviews?role=editor');
      const reviewsData = await reviewsResponse.json();
      setReviews(reviewsData || []);

      // Fetch reviewers
      const reviewersResponse = await fetch('/api/admin/users?role=reviewer');
      const reviewersData = await reviewersResponse.json();
      setReviewers(reviewersData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignReview = async () => {
    if (!selectedManuscript || selectedReviewers.length === 0) return;

    try {
      // Assign reviews to multiple reviewers
      const assignmentPromises = selectedReviewers.map(reviewerId => 
        fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            manuscriptId: selectedManuscript,
            reviewerId: reviewerId,
            type: reviewType
          }),
        })
      );

      const responses = await Promise.all(assignmentPromises);
      const allSuccessful = responses.every(response => response.ok);

      if (allSuccessful) {
        setShowAssignModal(false);
        setSelectedManuscript('');
        setSelectedReviewers([]);
        setReviewerSearchTerm('');
        setShowReviewerSearch(false);
        fetchData(); // Refresh data
        alert(`Reviews assigned successfully to ${selectedReviewers.length} reviewer(s)!`);
      } else {
        // Handle partial failures
        const failedCount = responses.filter(r => !r.ok).length;
        alert(`${selectedReviewers.length - failedCount} reviews assigned successfully. ${failedCount} failed.`);
        fetchData(); // Refresh data anyway
      }
    } catch (error) {
      console.error('Error assigning reviews:', error);
      alert('Error assigning reviews');
    }
  };

  // Helper functions for reviewer search
  const filteredReviewers = reviewers.filter(reviewer =>
    reviewer.name.toLowerCase().includes(reviewerSearchTerm.toLowerCase()) ||
    reviewer.email.toLowerCase().includes(reviewerSearchTerm.toLowerCase())
  );

  const addReviewer = (reviewerId: string) => {
    if (!selectedReviewers.includes(reviewerId)) {
      setSelectedReviewers([...selectedReviewers, reviewerId]);
    }
    setReviewerSearchTerm('');
    setShowReviewerSearch(false);
  };

  const removeReviewer = (reviewerId: string) => {
    setSelectedReviewers(selectedReviewers.filter(id => id !== reviewerId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return '#f39c12';
      case 'under-review':
        return '#3498db';
      case 'reviewed':
        return '#9b59b6';
      case 'accepted':
        return '#27ae60';
      case 'rejected':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getManuscriptsByStatus = (status: string) => {
    return manuscripts.filter(m => m.status === status).length;
  };

  const getPendingReviews = () => {
    return reviews.filter(r => r.status === 'pending').length;
  };

  const getOverdueReviews = () => {
    return reviews.filter(r => 
      r.status !== 'completed' && new Date(r.dueDate) < new Date()
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Editor Dashboard</h1>
        <p>Manage manuscripts and coordinate peer review process</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h3>{manuscripts.length}</h3>
          <p>Total Manuscripts</p>
        </div>
        <div className={styles.statCard}>
          <h3>{getManuscriptsByStatus('submitted')}</h3>
          <p>New Submissions</p>
        </div>
        <div className={styles.statCard}>
          <h3>{getManuscriptsByStatus('under-review')}</h3>
          <p>Under Review</p>
        </div>
        <div className={styles.statCard}>
          <h3>{getPendingReviews()}</h3>
          <p>Pending Reviews</p>
        </div>
        <div className={styles.statCard}>
          <h3>{getOverdueReviews()}</h3>
          <p>Overdue Reviews</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'manuscripts' ? styles.active : ''}`}
          onClick={() => setActiveTab('manuscripts')}
        >
          Manuscripts ({manuscripts.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews ({reviews.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'assign' ? styles.active : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          Assign Reviews
        </button>
      </div>

      {/* Manuscripts Tab */}
      {activeTab === 'manuscripts' && (
        <div className={styles.manuscriptsList}>
          <div className={styles.sectionHeader}>
            <h2>Manuscripts</h2>
          </div>
          {manuscripts.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No manuscripts found</h3>
              <p>No manuscripts are currently in the system.</p>
            </div>
          ) : (
            manuscripts.map((manuscript) => (
              <div key={manuscript._id} className={styles.manuscriptCard}>
                <div className={styles.manuscriptInfo}>
                  <h3>{manuscript.title}</h3>
                  <p>Authors: {manuscript.authors.map(a => a.name).join(', ')}</p>
                  <div className={styles.metadata}>
                    <span style={{ color: getStatusColor(manuscript.status) }}>
                      {manuscript.status.toUpperCase()}
                    </span>
                    <span>Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
                    <span>Reviews: {manuscript.completedReviews}/{manuscript.reviewsCount}</span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.viewButton}
                    onClick={() => router.push(`/dashboard/manuscripts/${manuscript._id}`)}
                  >
                    View Details
                  </button>
                  <button
                    className={styles.assignButton}
                    onClick={() => {
                      setSelectedManuscript(manuscript._id);
                      setActiveTab('assign');
                    }}
                  >
                    Assign Review
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className={styles.reviewsList}>
          <div className={styles.sectionHeader}>
            <h2>Reviews</h2>
          </div>
          {reviews.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No reviews found</h3>
              <p>No reviews are currently assigned.</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review._id} className={styles.reviewCard}>
                <div className={styles.reviewInfo}>
                  <h3>{review.manuscriptId.title}</h3>
                  <p>Reviewer: {review.reviewerId.name}</p>
                  <div className={styles.metadata}>
                    <span>Assigned: {new Date(review.assignedDate).toLocaleDateString()}</span>
                    <span>Due: {new Date(review.dueDate).toLocaleDateString()}</span>
                    <span style={{ color: getStatusColor(review.status) }}>
                      {review.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.viewButton}
                    onClick={() => router.push(`/dashboard/reviews/${review._id}`)}
                  >
                    View Review
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Assign Reviews Tab */}
      {activeTab === 'assign' && (
        <div className={styles.assignSection}>
          <div className={styles.sectionHeader}>
            <h2>Assign Reviews</h2>
          </div>
          
          <div className={styles.assignForm}>
            <div className={styles.formGroup}>
              <label>Select Manuscript</label>
              <select
                value={selectedManuscript}
                onChange={(e) => setSelectedManuscript(e.target.value)}
              >
                <option value="">Choose manuscript...</option>
                {manuscripts
                  .filter(m => ['submitted', 'under-review'].includes(m.status))
                  .map((manuscript) => (
                    <option key={manuscript._id} value={manuscript._id}>
                      {manuscript.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Search and Select Reviewers</label>
              
              {/* Search Input */}
              <div className={styles.searchContainer} ref={searchRef}>
                <input
                  type="text"
                  placeholder="Type reviewer name or email to search..."
                  value={reviewerSearchTerm}
                  onChange={(e) => {
                    setReviewerSearchTerm(e.target.value);
                    setShowReviewerSearch(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowReviewerSearch(reviewerSearchTerm.length > 0)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
                
                {/* Search Results Dropdown */}
                {showReviewerSearch && reviewerSearchTerm && (
                  <div className={styles.searchResults}>
                    {filteredReviewers.length > 0 ? (
                      filteredReviewers.map((reviewer) => (
                        <div
                          key={reviewer._id}
                          className={`${styles.reviewerOption} ${
                            selectedReviewers.includes(reviewer._id) ? styles.selected : ''
                          }`}
                          onClick={() => addReviewer(reviewer._id)}
                        >
                          <div className={styles.reviewerInfo}>
                            <strong>{reviewer.name}</strong>
                            <span>{reviewer.email}</span>
                            {reviewer.specializations && (
                              <small>Specializations: {reviewer.specializations.join(', ')}</small>
                            )}
                          </div>
                          {selectedReviewers.includes(reviewer._id) && (
                            <span className={styles.selectedBadge}>✓ Selected</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className={styles.noResults}>
                        No reviewers found matching &quot;{reviewerSearchTerm}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Reviewers */}
              {selectedReviewers.length > 0 && (
                <div className={styles.selectedReviewers}>
                  <label>Selected Reviewers ({selectedReviewers.length}):</label>
                  <div className={styles.reviewerTags}>
                    {selectedReviewers.map((reviewerId) => {
                      const reviewer = reviewers.find(r => r._id === reviewerId);
                      return reviewer ? (
                        <span key={reviewerId} className={styles.reviewerTag}>
                          {reviewer.name}
                          <button
                            type="button"
                            onClick={() => removeReviewer(reviewerId)}
                            className={styles.removeTag}
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Review Type (Fixed: Double Blind)</label>
              <input
                type="text"
                value="Double Blind"
                disabled
                style={{ 
                  background: '#f5f5f5', 
                  color: '#666', 
                  border: '1px solid #ddd',
                  padding: '0.5rem',
                  borderRadius: '4px'
                }}
              />
            </div>

            <button
              className={styles.assignButton}
              onClick={handleAssignReview}
              disabled={!selectedManuscript || selectedReviewers.length === 0}
            >
              Assign Review{selectedReviewers.length > 1 ? 's' : ''} ({selectedReviewers.length} reviewer{selectedReviewers.length !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      )}

      {/* Assignment Confirmation Modal */}
      {showAssignModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Confirm Review Assignment</h3>
            <p>Are you sure you want to assign {selectedReviewers.length} review{selectedReviewers.length !== 1 ? 's' : ''} to {selectedReviewers.length} reviewer{selectedReviewers.length !== 1 ? 's' : ''}?</p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button onClick={handleAssignReview}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
