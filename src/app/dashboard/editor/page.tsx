'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './EditorDashboard.module.scss';
import Link from 'next/link';
import { FiBook, FiEdit3, FiSearch, FiFilter } from 'react-icons/fi';

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{ name: string; email: string }>;
  status: string;
  submissionDate: string;
  lastModified: string;
  reviewsCount: number;
  completedReviews: number;
  requiresPayment: boolean;
  paymentStatus: 'not-required' | 'pending' | 'processing' | 'completed' | 'failed' | 'waived';
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
  const [filteredManuscripts, setFilteredManuscripts] = useState<Manuscript[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [copyEditors, setCopyEditors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'manuscripts' | 'reviews' | 'assign' | 'copy-edit'>('manuscripts');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCopyEditorModal, setShowCopyEditorModal] = useState(false);
  const [selectedManuscript, setSelectedManuscript] = useState<string>('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [selectedCopyEditor, setSelectedCopyEditor] = useState<string>('');
  const [copyEditorDueDate, setCopyEditorDueDate] = useState<string>('');
  const [copyEditorNotes, setCopyEditorNotes] = useState<string>('');
  const [reviewType, setReviewType] = useState<'single_blind' | 'double_blind'>('double_blind');
  const [reviewerSearchTerm, setReviewerSearchTerm] = useState<string>('');
  const [showReviewerSearch, setShowReviewerSearch] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchData();
    }
  }, [session, status, router]);

  useEffect(() => {
    filterManuscripts();
  }, [manuscripts, searchTerm, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch manuscripts
      const manuscriptsResponse = await fetch('/api/manuscripts?editor=true');
      const manuscriptsData = await manuscriptsResponse.json();
      setManuscripts(manuscriptsData.manuscripts || []);
      setFilteredManuscripts(manuscriptsData.manuscripts || []); // Initialize filtered manuscripts

      // Fetch reviews
      const reviewsResponse = await fetch('/api/reviews?role=editor');
      const reviewsData = await reviewsResponse.json();
      setReviews(reviewsData || []);

      // Fetch reviewers
      const reviewersResponse = await fetch('/api/users?role=reviewer');
      const reviewersData = await reviewersResponse.json();
      setReviewers(reviewersData.users || []);

      // Fetch copy editors
      const copyEditorsResponse = await fetch('/api/users?role=copy-editor');
      const copyEditorsData = await copyEditorsResponse.json();
      setCopyEditors(copyEditorsData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterManuscripts = () => {
    let filtered = manuscripts;

    if (searchTerm) {
      filtered = filtered.filter(manuscript =>
        manuscript.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manuscript.authors.some(author => 
          author.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          author.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(manuscript => manuscript.status === statusFilter);
    }

    setFilteredManuscripts(filtered);
  };

  const handleAssignCopyEditor = async () => {
    if (!selectedManuscript || !selectedCopyEditor) return;

    try {
      const response = await fetch(`/api/manuscripts/${selectedManuscript}/simple-copy-edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'assign-copy-editor',
          copyEditorId: selectedCopyEditor,
        }),
      });

      if (response.ok) {
        setShowCopyEditorModal(false);
        setSelectedManuscript('');
        setSelectedCopyEditor('');
        setCopyEditorDueDate('');
        setCopyEditorNotes('');
        fetchData(); // Refresh data
        alert('Copy editor assigned successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error assigning copy editor:', error);
      alert('Error assigning copy editor');
    }
  };

  const handlePublishManuscript = async (manuscriptId: string) => {
    if (!confirm('Are you sure you want to publish this manuscript? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Manuscript published successfully!');
        fetchData(); // Refresh the data
      } else {
        const errorData = await response.json();
        alert(`Failed to publish manuscript: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error publishing manuscript:', error);
      alert('Error publishing manuscript');
    }
  };

  const handleAssignReview = async () => {
    if (!selectedManuscript || selectedReviewers.length === 0) return;

    // Check if this is a re-assignment for a revision
    const manuscript = manuscripts.find(m => m._id === selectedManuscript);
    const isReassignment = manuscript && ['revision-requested', 'major-revision-requested', 'minor-revision-requested'].includes(manuscript.status);
    
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
            type: reviewType,
            isReReview: isReassignment // Flag to indicate if this is a re-review
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
        
        // Show different message for re-assignment
        if (isReassignment) {
          alert(`Re-review ${selectedReviewers.length > 1 ? 'assignments' : 'assignment'} created successfully!`);
        } else {
          alert(`Reviews assigned successfully to ${selectedReviewers.length} reviewer(s)!`);
        }
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
  const filteredReviewers = Array.isArray(reviewers) ? reviewers.filter(reviewer =>
    reviewer.name.toLowerCase().includes(reviewerSearchTerm.toLowerCase()) ||
    reviewer.email.toLowerCase().includes(reviewerSearchTerm.toLowerCase())
  ) : [];

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
    return Array.isArray(manuscripts) ? manuscripts.filter(m => m.status === status).length : 0;
  };

  const getPendingReviews = () => {
    return Array.isArray(reviews) ? reviews.filter(r => r.status === 'pending').length : 0;
  };

  const getOverdueReviews = () => {
    return Array.isArray(reviews) ? reviews.filter(r => 
      r.status !== 'completed' && new Date(r.dueDate) < new Date()
    ).length : 0;
  };

  // Filter manuscripts based on search term and status
  useEffect(() => {
    let filtered = manuscripts;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(manuscript => 
        manuscript.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manuscript.authors.some(author => author.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(manuscript => manuscript.status === statusFilter);
    }

    setFilteredManuscripts(filtered);
  }, [searchTerm, statusFilter, manuscripts]);

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
          <h3>{Array.isArray(manuscripts) ? manuscripts.length : 0}</h3>
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
          Manuscripts ({Array.isArray(manuscripts) ? manuscripts.length : 0})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews ({Array.isArray(reviews) ? reviews.length : 0})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'assign' ? styles.active : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          Assign Reviews
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'copy-edit' ? styles.active : ''}`}
          onClick={() => setActiveTab('copy-edit')}
        >
          Assign Copy Editors
        </button>
      </div>

      {/* Manuscripts Tab */}
      {activeTab === 'manuscripts' && (
        <div className={styles.manuscriptsList}>
          <div className={styles.sectionHeader}>
            <h2 style={{ color: 'white' }}>Manuscripts</h2>
          </div>

          {/* Search and Filter Section */}
          <div className={styles.searchFilter}>
            <div className={styles.searchGroup}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search manuscripts by title, author name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.statusFilter}
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under-review">Under Review</option>
                <option value="under-editorial-review">Under Editorial Review</option>
                <option value="revision-requested">Revision Requested</option>
                <option value="major-revision-requested">Major Revision</option>
                <option value="minor-revision-requested">Minor Revision</option>
                <option value="reviewed">Reviewed</option>
                <option value="accepted">Accepted</option>
                <option value="accepted-awaiting-copy-edit">Accepted - Awaiting Copy Edit</option>
                <option value="in-copy-editing">In Copy Editing</option>
                <option value="copy-editing-complete">Copy Editing Complete</option>
                <option value="ready-for-publication">Ready for Publication</option>
                <option value="in-production">In Production</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
                <option value="payment-required">Payment Required</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className={styles.resultsHeader}>
            <span>{filteredManuscripts.length} manuscript(s) found</span>
          </div>

          {!Array.isArray(filteredManuscripts) || filteredManuscripts.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No manuscripts found</h3>
              <p>{searchTerm || statusFilter !== 'all' ? 'No manuscripts match your search criteria.' : 'No manuscripts are currently in the system.'}</p>
              {(searchTerm || statusFilter !== 'all') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className={styles.clearFiltersButton}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filteredManuscripts.map((manuscript) => (
              <div key={manuscript._id} className={styles.manuscriptCard}>
                <div className={styles.manuscriptInfo}>
                  <h3>{manuscript.title}</h3>
                  <p>Authors: {manuscript.authors.map(a => a.name).join(', ')}</p>
                  <div className={styles.metadata}>
                    <span style={{ color: getStatusColor(manuscript.status) }}>
                      {manuscript.status === 'published' ? 'Published' : manuscript.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                  {manuscript.completedReviews >= 2 && manuscript.status === 'under-review' && (
                    <button
                      className={styles.decisionButton}
                      onClick={() => router.push(`/dashboard/editor/decisions/${manuscript._id}`)}
                    >
                      Make Decision
                    </button>
                  )}
                  {manuscript.status !== 'published' && (
                    <button
                      className={styles.assignButton}
                      onClick={() => {
                        setSelectedManuscript(manuscript._id);
                        setActiveTab('assign');
                      }}
                    >
                      Assign Review
                    </button>
                  )}
                  {['revision-requested', 'major-revision-requested', 'minor-revision-requested'].includes(manuscript.status) && manuscript.status !== 'published' && (
                    <button
                      className={styles.assignButton}
                      onClick={() => {
                        setSelectedManuscript(manuscript._id);
                        setActiveTab('assign');
                      }}
                      style={{
                        background: '#2c3e50',
                        borderColor: '#34495e'
                      }}
                    >
                      Re-assign Reviewer
                    </button>
                  )}
                  {['accepted', 'accepted-awaiting-copy-edit', 'in-copy-editing'].includes(manuscript.status) && manuscript.status !== 'published' && (
                    <>
                      {(!manuscript.requiresPayment || 
                        manuscript.paymentStatus === 'completed' || 
                        manuscript.paymentStatus === 'not-required' || 
                        manuscript.paymentStatus === 'waived') ? (
                        <button
                          className={styles.copyEditButton}
                          onClick={() => {
                            setSelectedManuscript(manuscript._id);
                            setActiveTab('copy-edit');
                          }}
                        >
                          Assign Copy Editor
                        </button>
                      ) : (
                        <button
                          className={styles.copyEditButton}
                          disabled
                          title="Payment must be completed before copy editor assignment"
                          style={{ 
                            opacity: 0.5, 
                            cursor: 'not-allowed',
                            backgroundColor: '#ccc',
                            color: '#666'
                          }}
                        >
                          Payment Required
                        </button>
                      )}
                    </>
                  )}
                  {manuscript.status === 'ready-for-publication' && (
                    <button
                      className={styles.publishButton}
                      onClick={() => handlePublishManuscript(manuscript._id)}
                    >
                      Publish Manuscript
                    </button>
                  )}
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
          {!Array.isArray(reviews) || reviews.length === 0 ? (
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
            {/* Check if the selected manuscript is in revision status */}
            {selectedManuscript && manuscripts.find(m => 
              m._id === selectedManuscript && 
              ['revision-requested', 'major-revision-requested', 'minor-revision-requested'].includes(m.status)
            ) ? (
              <>
                <h2>Re-assign Reviewers for Revised Manuscript</h2>
              </>
            ) : (
              <h2>Assign Reviews</h2>
            )}
          </div>
          
          <div className={styles.assignForm}>
            <div className={styles.formGroup}>
              <label>Select Manuscript</label>
              <select
                value={selectedManuscript}
                onChange={(e) => setSelectedManuscript(e.target.value)}
              >
                <option value="">Choose manuscript...</option>
                {Array.isArray(manuscripts) && manuscripts
                  // Filter out published manuscripts and only show manuscripts that can have reviewers assigned
                  .filter(m => ['submitted', 'under-review', 'revision-requested', 'major-revision-requested', 'minor-revision-requested'].includes(m.status))
                  .map((manuscript) => (
                    <option key={manuscript._id} value={manuscript._id}>
                      {manuscript.title} {['revision-requested', 'major-revision-requested', 'minor-revision-requested'].includes(manuscript.status) ? '(REVISED)' : ''}
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
                      const reviewer = Array.isArray(reviewers) ? reviewers.find(r => r._id === reviewerId) : null;
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
              style={
                selectedManuscript && 
                manuscripts.find(m => m._id === selectedManuscript && ['revision-requested', 'major-revision-requested', 'minor-revision-requested'].includes(m.status)) ?
                { background: '#2c3e50', borderColor: '#34495e' } : {}
              }
            >
              {selectedManuscript && 
               manuscripts.find(m => m._id === selectedManuscript && ['revision-requested', 'major-revision-requested', 'minor-revision-requested'].includes(m.status)) ?
               `Re-assign for Review (${selectedReviewers.length} reviewer${selectedReviewers.length !== 1 ? 's' : ''})` :
               `Assign Review${selectedReviewers.length > 1 ? 's' : ''} (${selectedReviewers.length} reviewer${selectedReviewers.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      )}

      {/* Copy Editor Assignment Tab */}
      {activeTab === 'copy-edit' && (
        <div className={styles.assignSection}>
          <div className={styles.sectionHeader}>
            <h2 style={{ color: 'white' }}>Assign Copy Editors</h2>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              padding: '0.75rem', 
              borderRadius: '6px', 
              marginTop: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <strong>Requirements:</strong> Manuscripts must be <em>accepted</em> and have <em>payment completed</em> (or not required/waived) before copy editor assignment.
            </div>
          </div>

          <div className={styles.assignForm}>
            <div className={styles.formGroup}>
              <label>Select Manuscript</label>
              <select
                value={selectedManuscript}
                onChange={(e) => setSelectedManuscript(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="">Choose a manuscript...</option>
                {Array.isArray(manuscripts) && manuscripts
                  .filter(m => {
                    // Must be accepted status
                    const isAccepted = ['accepted', 'accepted-awaiting-copy-edit', 'in-copy-editing'].includes(m.status);
                    
                    // Must have payment completed, not required, or waived
                    const isPaymentComplete = !m.requiresPayment || 
                      m.paymentStatus === 'completed' || 
                      m.paymentStatus === 'not-required' || 
                      m.paymentStatus === 'waived';
                    
                    return isAccepted && isPaymentComplete;
                  })
                  .map((manuscript) => (
                    <option key={manuscript._id} value={manuscript._id}>
                      {manuscript.title} - {manuscript.authors.map(a => a.name).join(', ')}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Select Copy Editor</label>
              <select
                value={selectedCopyEditor}
                onChange={(e) => setSelectedCopyEditor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="">Choose a copy editor...</option>
                {Array.isArray(copyEditors) && copyEditors.map((editor) => (
                  <option key={editor._id} value={editor._id}>
                    {editor.name} ({editor.email})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Due Date (Optional)</label>
              <input
                type="date"
                value={copyEditorDueDate}
                onChange={(e) => setCopyEditorDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Assignment Notes (Optional)</label>
              <textarea
                value={copyEditorNotes}
                onChange={(e) => setCopyEditorNotes(e.target.value)}
                placeholder="Enter any special instructions or notes for the copy editor..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              className={styles.assignButton}
              onClick={handleAssignCopyEditor}
              disabled={!selectedManuscript || !selectedCopyEditor}
            >
              Assign Copy Editor
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

      {/* Copy Editor Assignment Confirmation Modal */}
      {showCopyEditorModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Confirm Copy Editor Assignment</h3>
            <p>Are you sure you want to assign this copy editor to the selected manuscript?</p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowCopyEditorModal(false)}>Cancel</button>
              <button onClick={handleAssignCopyEditor}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
