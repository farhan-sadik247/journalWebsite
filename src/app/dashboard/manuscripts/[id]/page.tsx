'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  FiArrowLeft,
  FiDownload,
  FiUser,
  FiMail,
  FiBookOpen,
  FiTag,
  FiCalendar,
  FiFileText,
  FiClock,
  FiDollarSign,
  FiCreditCard
} from 'react-icons/fi';
import styles from './ManuscriptDetail.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  status: string;
  category: string;
  submissionDate: string;
  lastModified: string;
  files: any[];
  keywords: string[];
  authors: any[];
  funding?: string;
  conflictOfInterest?: string;
  ethicsStatement?: string;
  dataAvailability?: string;
  reviewerSuggestions?: string[];
  reviewerExclusions?: string[];
  timeline: any[];
  copyEditingStage?: string;
  authorCopyEditReview?: {
    approval?: string;
    comments?: string;
    reviewedBy?: string;
    reviewDate?: string;
  };
}

interface Review {
  _id: string;
  status: string;
  assignedDate: string;
  dueDate: string;
  completedDate?: string;
  recommendation?: string;
  type: string;
  reviewerId?: {
    _id: string;
    name: string;
    email: string;
  };
  comments?: {
    forAuthors?: string;
    detailedReview?: string;
  };
  ratings?: {
    technicalQuality?: number;
    novelty?: number;
    significance?: number;
    clarity?: number;
    overall?: number;
  };
}

export default function ManuscriptDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [draftApprovalLoading, setDraftApprovalLoading] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftComments, setDraftComments] = useState('');
  const [draftApprovalType, setDraftApprovalType] = useState<'approved' | 'needs_changes'>('approved');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session && params.id) {
      fetchManuscript();
      fetchReviews();
    }
  }, [session, status, router, params.id]);

  const fetchManuscript = async () => {
    try {
      // Add cache-busting to ensure fresh data
      const response = await fetch(`/api/manuscripts/${params.id}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched manuscript data:', {
          id: data.manuscript._id,
          status: data.manuscript.status,
          title: data.manuscript.title?.substring(0, 50) + '...'
        });
        setManuscript(data.manuscript);
      } else if (response.status === 404) {
        setError('Manuscript not found');
      } else {
        setError('Failed to load manuscript');
      }
    } catch (error) {
      console.error('Error fetching manuscript:', error);
      setError('Failed to load manuscript');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`/api/reviews?manuscriptId=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      } else {
        console.error('Failed to fetch reviews:', response.status, response.statusText);
        // Don't set an error state, just keep reviews as empty array
        // This allows the "no reviews" message to show appropriately
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Don't set an error state, just keep reviews as empty array
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchPaymentInfo = async () => {
    if (!manuscript?._id) return;
    
    try {
      setPaymentLoading(true);
      console.log('Fetching payment info for manuscript:', manuscript._id);
      
      // Use manuscript category for article type
      const articleType = manuscript.category?.toLowerCase() || 'research';
      
      console.log('Payment calculation params:', {
        articleType
      });

      const response = await fetch(`/api/fee-config/calculate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleType: articleType
        })
      });

      const data = await response.json();
      console.log('Payment response:', data);

      if (response.ok) {
        setPaymentInfo(data.feeCalculation);
      } else {
        console.error('Payment calculation failed:', data);
        setPaymentInfo(null);
      }
    } catch (error) {
      console.error('Error fetching payment info:', error);
      setPaymentInfo(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentClick = () => {
    if (!paymentInfo) {
      fetchPaymentInfo();
    }
    setShowPaymentModal(true);
  };

  const proceedToPayment = async () => {
    if (!manuscript || !paymentInfo) {
      toast.error('Payment information not available');
      return;
    }

    try {
      setPaymentLoading(true);

      // Get corresponding author for billing information
      let billingAuthor = manuscript.authors.find((author: any) => author.isCorresponding);
      
      console.log('=== AUTHOR DEBUGGING ===');
      console.log('All authors:', manuscript.authors);
      console.log('Author[0] full object:', manuscript.authors[0] ? JSON.stringify(manuscript.authors[0], null, 2) : 'No authors');
      console.log('Corresponding author found:', billingAuthor);
      
      // If no corresponding author marked, use the first author
      if (!billingAuthor) {
        billingAuthor = manuscript.authors[0];
        console.log('Using first author as fallback:', billingAuthor);
      }
      
      if (!billingAuthor) {
        toast.error('No author information found for this manuscript');
        return;
      }

      console.log('=== BILLING AUTHOR DETAILED ===');
      console.log('Author object keys:', Object.keys(billingAuthor));
      console.log('Author.name:', billingAuthor.name);
      console.log('Author.firstName:', billingAuthor.firstName);
      console.log('Author.lastName:', billingAuthor.lastName);
      console.log('Author.email:', billingAuthor.email);
      console.log('Author.affiliation:', billingAuthor.affiliation);

      // Create a robust name from available fields
      let authorName = '';
      if (billingAuthor.name && billingAuthor.name.trim()) {
        authorName = billingAuthor.name.trim();
        console.log('Using author.name:', authorName);
      } else if (billingAuthor.firstName && billingAuthor.lastName) {
        authorName = `${billingAuthor.firstName.trim()} ${billingAuthor.lastName.trim()}`;
        console.log('Using firstName + lastName:', authorName);
      } else if (billingAuthor.email) {
        // Use email prefix as fallback
        authorName = billingAuthor.email.split('@')[0];
        console.log('Using email prefix as name:', authorName);
      } else {
        authorName = 'Unknown Author';
        console.log('Using fallback name:', authorName);
      }

      // Ensure we have a name
      if (!authorName || authorName.trim() === '') {
        authorName = 'Author Name Required';
        console.log('FORCED authorName because empty:', authorName);
      }

      // Create billing address with robust data
      const billingAddress = {
        name: authorName,
        institution: billingAuthor.affiliation || '',
        address: billingAuthor.address || 'Address not provided',
        city: billingAuthor.city || 'City not provided',
        state: billingAuthor.state || '',
        country: billingAuthor.country || 'US',
        postalCode: billingAuthor.postalCode || '',
      };
      
      console.log('=== FINAL BILLING ADDRESS ===');
      console.log('Final billing address:', billingAddress);
      console.log('Name is present:', !!billingAddress.name);
      console.log('Name length:', billingAddress.name ? billingAddress.name.length : 0);

      // Create payment record
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptId: manuscript._id,
          paymentMethod: 'stripe', // Default to Stripe for online payments
          billingAddress,
          requestWaiver: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to payment portal with the payment ID
        router.push(`/dashboard/payments/portal?paymentId=${data.payment._id}`);
      } else {
        toast.error(data.error || 'Failed to create payment record');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to initialize payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    if (manuscript?.status === 'accepted') {
      fetchPaymentInfo();
    }
  }, [manuscript?.status]);

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'submitted': 'status-submitted',
      'under-review': 'status-under-review',
      'revision-requested': 'status-revision-requested',
      'major-revision-requested': 'status-major-revision',
      'minor-revision-requested': 'status-minor-revision',
      'under-editorial-review': 'status-under-editorial-review',
      'reviewed': 'status-reviewed',
      'accepted': 'status-accepted',
      'accepted-awaiting-copy-edit': 'status-accepted',
      'in-copy-editing': 'status-in-production',
      'copy-editing-complete': 'status-in-production',
      'rejected': 'status-rejected',
      'payment-required': 'status-payment-required',
      'in-production': 'status-in-production',
      'published': 'status-published',
    };
    
    return `status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-submitted'}`;
  };

  const getManuscriptStatusDisplayText = (status: string) => {
    const statusTexts = {
      'submitted': 'Submitted',
      'under-review': 'Under Review',
      'revision-requested': 'Revision Requested',
      'major-revision-requested': 'Major Revision Required',
      'minor-revision-requested': 'Minor Revision Required',
      'under-editorial-review': 'Under Editorial Review',
      'reviewed': 'Reviewed',
      'accepted': 'Accepted',
      'accepted-awaiting-copy-edit': 'Accepted - Awaiting Copy Edit',
      'in-copy-editing': 'In Copy Editing',
      'copy-editing-complete': 'Copy Editing Complete',
      'rejected': 'Rejected',
      'payment-required': 'Payment Required',
      'in-production': 'In Production',
      'published': 'Published',
    };
    
    return statusTexts[status as keyof typeof statusTexts] || status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleViewScore = (review: Review) => {
    setSelectedReview(review);
    setShowScoreModal(true);
  };

  const closeScoreModal = () => {
    setShowScoreModal(false);
    setSelectedReview(null);
  };

  const getOverallScore = (ratings?: Review['ratings']) => {
    if (!ratings) return 'N/A';
    
    const scores = [
      ratings.technicalQuality,
      ratings.novelty,
      ratings.significance,
      ratings.clarity,
      ratings.overall
    ].filter(score => score !== undefined && score !== null) as number[];
    
    if (scores.length === 0) return 'N/A';
    
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return average.toFixed(1);
  };

  const getStatusDisplayText = (review: Review) => {
    // If review is completed and has a recommendation, show that
    if (review.status === 'completed' && review.recommendation) {
      const recommendationMap: Record<string, string> = {
        'accept': 'Accept',
        'reject': 'Reject',
        'major-revision': 'Major Revision',
        'minor-revision': 'Minor Revision',
        'major_revision': 'Major Revision',
        'minor_revision': 'Minor Revision'
      };
      
      return recommendationMap[review.recommendation] || review.recommendation.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Otherwise show the status
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'in-progress': 'In Progress', 
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'declined': 'Declined'
    };
    
    return statusMap[review.status] || review.status.replace('-', ' ').replace('_', ' ').toUpperCase();
  };

  const getStatusClass = (review: Review) => {
    // If review is completed and has a recommendation, use recommendation class
    if (review.status === 'completed' && review.recommendation) {
      return review.recommendation.replace(/[-_]/g, '');
    }
    
    // Otherwise use status class
    return review.status.replace(/[-_]/g, '');
  };

  const getStageClass = (stage: string, currentStage?: string) => {
    if (!currentStage) return '';
    
    const stages = [
      'copy-editing',
      'author-review', 
      'proofreading',
      'typesetting',
      'final-review',
      'ready-for-publication'
    ];
    
    const currentIndex = stages.indexOf(currentStage);
    const stageIndex = stages.indexOf(stage);
    
    if (currentIndex === -1) return '';
    
    if (stageIndex < currentIndex) return styles.completed;
    if (stageIndex === currentIndex) return styles.active;
    return styles.upcoming;
  };

  const downloadFile = (file: any) => {
    // Use originalName for the API call, or extract filename from the path
    const filename = file.originalName || file.filename.split('/').pop();
    window.open(`/api/manuscripts/${params.id}/download/${filename}`, '_blank');
  };

  const handleDraftApproval = (approval: 'approved' | 'needs_changes') => {
    setDraftApprovalType(approval);
    setShowDraftModal(true);
    setDraftComments('');
  };

  const submitDraftApproval = async () => {
    if (!manuscript) return;
    
    // Validate that comments are required for change requests
    if (draftApprovalType === 'needs_changes' && !draftComments.trim()) {
      alert('Please provide comments explaining the changes needed');
      return;
    }
    
    setDraftApprovalLoading(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscript._id}/copy-editing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'author-review',
          approval: draftApprovalType,
          comments: draftComments
        }),
      });

      if (response.ok) {
        setShowDraftModal(false);
        await fetchManuscript();
        alert('Your feedback has been submitted successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit draft feedback');
      }
    } catch (error) {
      console.error('Error submitting draft feedback:', error);
      if (error instanceof Error) {
        alert(`Failed to submit feedback: ${error.message}`);
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } finally {
      setDraftApprovalLoading(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    setReviewsLoading(true);
    await Promise.all([fetchManuscript(), fetchReviews()]);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorPage}>
        <div className="container">
          <div className={styles.errorContent}>
            <h1>Error</h1>
            <p>{error}</p>
            <Link href="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !manuscript) {
    return null;
  }

  return (
    <div className={styles.manuscriptDetailPage}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <Link href="/dashboard/manuscripts" className={styles.backButton}>
            <FiArrowLeft />
            Back to Manuscripts
          </Link>
          
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1>{manuscript.title}</h1>
              <span className={getStatusBadge(manuscript.status)}>
                {getManuscriptStatusDisplayText(manuscript.status)}
              </span>
            </div>
            
            <div className={styles.headerActions}>
              <button 
                onClick={() => {
                  setIsLoading(true);
                  fetchManuscript();
                  fetchReviews();
                }}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                <FiClock />
                {isLoading ? 'Refreshing...' : 'Refresh Status'}
              </button>
              <button 
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const response = await fetch(`/api/manuscripts/${params.id}/update-status`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const result = await response.json();
                    console.log('Status update result:', result);
                    
                    if (response.ok) {
                      // Refresh the manuscript data
                      await fetchManuscript();
                      await fetchReviews();
                      
                      if (result.updated) {
                        alert(`Status updated from "${result.previousStatus}" to "${result.currentStatus}"`);
                      } else {
                        alert('Status is already up to date');
                      }
                    } else {
                      alert(`Error: ${result.error}`);
                    }
                  } catch (error) {
                    console.error('Error updating status:', error);
                    alert('Failed to update status');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="btn btn-warning"
                disabled={isLoading}
              >
                <FiFileText />
                {isLoading ? 'Updating...' : 'Update Status'}
              </button>
              {(manuscript.status === 'revision-requested' || 
                manuscript.status === 'major-revision-requested' || 
                manuscript.status === 'minor-revision-requested') && (
                <Link 
                  href={`/dashboard/manuscripts/${manuscript._id}/revise`}
                  className="btn btn-success"
                >
                  <FiFileText />
                  Submit Revision
                </Link>
              )}
              {manuscript.copyEditingStage === 'author-review' && (
                <Link 
                  href={`/dashboard/manuscripts/${manuscript._id}/review-copy-edit`}
                  className="btn btn-warning"
                >
                  <FiFileText />
                  Review Copy-Edited Version
                </Link>
              )}
              {manuscript.files.length > 0 && (
                <button 
                  onClick={() => window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank')}
                  className="btn btn-primary"
                >
                  <FiDownload />
                  Download All Files
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Main Content */}
          <div className={styles.mainContent}>
            {/* Abstract */}
            <section className={styles.section}>
              <h2>
                <FiFileText />
                Abstract
              </h2>
              <div className={styles.abstractContent}>
                <p>{manuscript.abstract}</p>
              </div>
            </section>

            {/* Keywords */}
            <section className={styles.section}>
              <h2>
                <FiTag />
                Keywords
              </h2>
              <div className={styles.keywordsList}>
                {manuscript.keywords.map((keyword, index) => (
                  <span key={index} className={styles.keyword}>
                    {keyword}
                  </span>
                ))}
              </div>
            </section>

            {/* Authors */}
            <section className={styles.section}>
              <h2>
                <FiUser />
                Authors
              </h2>
              <div className={styles.authorsList}>
                {manuscript.authors.map((author, index) => (
                  <div key={index} className={styles.authorCard}>
                    <div className={styles.authorInfo}>
                      <h4>
                        {author.name}
                        {author.isCorresponding && (
                          <span className={styles.correspondingBadge}>Corresponding</span>
                        )}
                      </h4>
                      <p className={styles.affiliation}>{author.affiliation}</p>
                      <div className={styles.authorContact}>
                        <FiMail />
                        <span>{author.email}</span>
                      </div>
                      {author.orcid && (
                        <div className={styles.orcid}>
                          ORCID: {author.orcid}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Files */}
            {manuscript.files.length > 0 && (
              <section className={styles.section}>
                <h2>
                  <FiDownload />
                  Files
                </h2>
                <div className={styles.filesList}>
                  {manuscript.files.map((file, index) => (
                    <div key={index} className={styles.fileCard}>
                      <div className={styles.fileInfo}>
                        <h4>{file.originalName}</h4>
                        <p>
                          {file.type} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button 
                        onClick={() => downloadFile(file)}
                        className="btn btn-secondary btn-sm"
                      >
                        <FiDownload />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Additional Information */}
            {(manuscript.funding || manuscript.conflictOfInterest || manuscript.ethicsStatement || manuscript.dataAvailability) && (
              <section className={styles.section}>
                <h2>Additional Information</h2>
                
                {manuscript.funding && (
                  <div className={styles.additionalInfo}>
                    <h4>Funding</h4>
                    <p>{manuscript.funding}</p>
                  </div>
                )}
                
                {manuscript.conflictOfInterest && (
                  <div className={styles.additionalInfo}>
                    <h4>Conflict of Interest</h4>
                    <p>{manuscript.conflictOfInterest}</p>
                  </div>
                )}
                
                {manuscript.ethicsStatement && (
                  <div className={styles.additionalInfo}>
                    <h4>Ethics Statement</h4>
                    <p>{manuscript.ethicsStatement}</p>
                  </div>
                )}
                
                {manuscript.dataAvailability && (
                  <div className={styles.additionalInfo}>
                    <h4>Data Availability</h4>
                    <p>{manuscript.dataAvailability}</p>
                  </div>
                )}
              </section>
            )}

            {/* Copy-Edited Draft Review Section */}
            {manuscript.copyEditingStage === 'author-review' && (
              <section className={styles.section}>
                <h2>
                  <FiFileText />
                  Copy-Edited Draft Review
                </h2>
                
                <div className={styles.draftReview}>
                  <div className={styles.draftInfo}>
                    <p>The copy-edited version of your manuscript is ready for review. Please carefully review the changes made by the copy editor and provide your approval or feedback.</p>
                    
                    {manuscript.authorCopyEditReview ? (
                      <div className={styles.reviewStatus}>
                        <h4>Your Review Status:</h4>
                        <div className={styles.reviewDetails}>
                          <div className={`${styles.approvalStatus} ${manuscript.authorCopyEditReview.approval === 'approved' ? styles.approved : styles.needsChanges}`}>
                            Status: {manuscript.authorCopyEditReview.approval === 'approved' ? 'Approved' : 'Needs Changes'}
                          </div>
                          {manuscript.authorCopyEditReview.comments && (
                            <div className={styles.reviewComments}>
                              <strong>Your Comments:</strong>
                              <p>{manuscript.authorCopyEditReview.comments}</p>
                            </div>
                          )}
                          {manuscript.authorCopyEditReview.reviewDate && (
                            <div className={styles.reviewDate}>
                              Reviewed on: {new Date(manuscript.authorCopyEditReview.reviewDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.draftActions}>
                        <button 
                          onClick={() => handleDraftApproval('approved')}
                          className="btn btn-success"
                          disabled={draftApprovalLoading}
                        >
                          <FiFileText />
                          Approve Draft
                        </button>
                        <button 
                          onClick={() => handleDraftApproval('needs_changes')}
                          className="btn btn-warning"
                          disabled={draftApprovalLoading}
                        >
                          <FiFileText />
                          Request Changes
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Reviews Section */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>
                  <FiBookOpen />
                  Reviews & Editorial Status
                </h2>
                <button 
                  onClick={refreshData}
                  className={styles.refreshBtn}
                  disabled={reviewsLoading || isLoading}
                  title="Refresh reviews and manuscript status"
                >
                  <FiClock />
                  {(reviewsLoading || isLoading) ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              
              {reviewsLoading ? (
                <div className={styles.loadingReviews}>
                  <div className="spinner" />
                  <p>Loading reviews...</p>
                </div>
              ) : reviews.length > 0 ? (
                <div className={styles.reviewsTable}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Review No.</th>
                        <th>Reviewer Name</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((review, index) => (
                        <tr key={review._id}>
                          <td data-label="Review No">#{index + 1}</td>
                          <td data-label="Reviewer Name">
                            {review.reviewerId?.name || 'Anonymous Reviewer'}
                          </td>
                          <td data-label="Score">
                            <span className={styles.scoreCell}>
                              {getOverallScore(review.ratings)}
                              {review.ratings && (
                                <span className={styles.outOf}>/10</span>
                              )}
                            </span>
                          </td>
                          <td data-label="Status">
                            <span className={`${styles.reviewStatus} ${styles[getStatusClass(review)]}`}>
                              {getStatusDisplayText(review)}
                            </span>
                          </td>
                          <td data-label="Action">
                            {review.ratings && (
                              <button
                                className={styles.viewScoreBtn}
                                onClick={() => handleViewScore(review)}
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.noReviews}>
                  <p>No reviews have been assigned yet.</p>
                  {manuscript.status === 'submitted' && (
                    <p className={styles.hint}>Your manuscript is currently being processed by the editorial team.</p>
                  )}
                </div>
              )}
            </section>

            {/* Payment Section for Accepted Manuscripts */}
            {manuscript.status === 'accepted' && (
              <section className={styles.section}>
                <h2>
                  <FiDollarSign />
                  Publication Fee Payment
                </h2>
                
                <div className={styles.paymentSection}>
                  <div className={styles.paymentInfo}>
                    <div className={styles.paymentHeader}>
                      <h3>🎉 Congratulations! Your manuscript has been accepted for publication.</h3>
                      <p>To proceed with publication, please complete the payment process below.</p>
                    </div>

                    {paymentLoading ? (
                      <div className={styles.loadingPayment}>
                        <div className="spinner" />
                        <p>Calculating publication fee...</p>
                      </div>
                    ) : paymentInfo ? (
                      <div className={styles.feeDetails}>
                        <div className={styles.feeCard}>
                          <div className={styles.feeBreakdown}>
                            <div className={styles.baseFeeInfo}>
                              <h4>Base Publication Fee</h4>
                              <div className={styles.baseFeeAmount}>
                                <span className={styles.currency}>{paymentInfo.currency || 'USD'}</span>
                                <span className={styles.amount}>
                                  {paymentInfo.baseFee ? paymentInfo.baseFee.toFixed(2) : paymentInfo.originalAmount ? paymentInfo.originalAmount.toFixed(2) : '0.00'}
                                </span>
                              </div>
                              <p className={styles.articleType}>
                                Article Type: {paymentInfo.articleType || manuscript.category || 'Research'}
                              </p>
                              {paymentInfo.userCountry && (
                                <p className={styles.countryInfo}>
                                  Author Country: {paymentInfo.userCountry}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className={styles.finalAmount}>
                            <h4>Amount Due</h4>
                            <div className={styles.feeAmount}>
                              <span className={styles.currency}>{paymentInfo.currency || 'USD'}</span>
                              <span className={styles.amount}>
                                {paymentInfo.finalAmount ? paymentInfo.finalAmount.toFixed(2) : '0.00'}
                              </span>
                            </div>
                          </div>
                          
                          {paymentInfo.discountApplied && paymentInfo.originalAmount && paymentInfo.discountAmount && (
                            <div className={styles.discountInfo}>
                              <h4>💰 Discount Applied</h4>
                              <p className={styles.originalAmount}>
                                Original: {paymentInfo.currency || 'USD'} {paymentInfo.originalAmount ? paymentInfo.originalAmount.toFixed(2) : '0.00'}
                              </p>
                              <p className={styles.discount}>
                                Discount: -{paymentInfo.currency || 'USD'} {paymentInfo.discountAmount ? paymentInfo.discountAmount.toFixed(2) : '0.00'}
                                {paymentInfo.discountReason && (
                                  <span className={styles.discountReason}>
                                    ({paymentInfo.discountReason})
                                  </span>
                                )}
                              </p>
                            </div>
                          )}

                          {paymentInfo.isWaiver ? (
                            <div className={styles.waiverInfo}>
                              <h4>✅ Fee Waiver Applied</h4>
                              <p>Your publication fee has been waived.</p>
                              {paymentInfo.waiverReason && (
                                <p className={styles.waiverReason}>
                                  Reason: {paymentInfo.waiverReason}
                                </p>
                              )}
                              <button 
                                onClick={() => router.push(`/dashboard/manuscripts`)}
                                className="btn btn-success"
                              >
                                Continue to Publication
                              </button>
                            </div>
                          ) : (
                            <div className={styles.paymentActions}>
                              <div className={styles.paymentDeadline}>
                                <FiCalendar />
                                <span>Payment Due: {new Date(Date.now() + (paymentInfo.paymentDeadlineDays * 24 * 60 * 60 * 1000)).toLocaleDateString()}</span>
                              </div>
                              
                              <div className={styles.paymentButtons}>
                                <button 
                                  onClick={handlePaymentClick}
                                  className="btn btn-primary"
                                >
                                  <FiCreditCard />
                                  Proceed to Payment
                                </button>
                                
                                <button 
                                  onClick={() => router.push('/publication-fees')}
                                  className="btn btn-secondary"
                                >
                                  View Fee Information
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.paymentError}>
                        <p>Unable to calculate publication fee. Please contact support.</p>
                        <button 
                          onClick={fetchPaymentInfo}
                          className="btn btn-secondary"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Manuscript Info */}
            <div className={styles.infoCard}>
              <h3>Manuscript Information</h3>
              
              <div className={styles.infoItem}>
                <FiBookOpen />
                <div>
                  <span className={styles.label}>Category</span>
                  <span className={styles.value}>{manuscript.category}</span>
                </div>
              </div>
              
              <div className={styles.infoItem}>
                <FiCalendar />
                <div>
                  <span className={styles.label}>Submitted</span>
                  <span className={styles.value}>
                    {new Date(manuscript.submissionDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className={styles.infoItem}>
                <FiClock />
                <div>
                  <span className={styles.label}>Last Modified</span>
                  <span className={styles.value}>
                    {new Date(manuscript.lastModified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Copy-Editing Progress */}
            {(manuscript.status === 'accepted' || 
              manuscript.status === 'accepted-awaiting-copy-edit' || 
              manuscript.status === 'in-copy-editing' || 
              manuscript.status === 'copy-editing-complete' || 
              manuscript.status === 'in-production' || 
              manuscript.copyEditingStage) && (
              <div className={styles.infoCard}>
                <h3>Copy-Editing Progress</h3>
                
                <div className={styles.copyEditingStages}>
                  <div className={`${styles.stage} ${getStageClass('copy-editing', manuscript.copyEditingStage)}`}>
                    <div className={styles.stageMarker}></div>
                    <div className={styles.stageInfo}>
                      <span className={styles.stageName}>Copy Editing</span>
                      <span className={styles.stageDesc}>Language and style editing</span>
                    </div>
                  </div>
                  
                  <div className={`${styles.stage} ${getStageClass('author-review', manuscript.copyEditingStage)}`}>
                    <div className={styles.stageMarker}></div>
                    <div className={styles.stageInfo}>
                      <span className={styles.stageName}>Author Review</span>
                      <span className={styles.stageDesc}>Authors review changes</span>
                    </div>
                  </div>
                  
                  <div className={`${styles.stage} ${getStageClass('proofreading', manuscript.copyEditingStage)}`}>
                    <div className={styles.stageMarker}></div>
                    <div className={styles.stageInfo}>
                      <span className={styles.stageName}>Proofreading</span>
                      <span className={styles.stageDesc}>Final text corrections</span>
                    </div>
                  </div>
                  
                  <div className={`${styles.stage} ${getStageClass('typesetting', manuscript.copyEditingStage)}`}>
                    <div className={styles.stageMarker}></div>
                    <div className={styles.stageInfo}>
                      <span className={styles.stageName}>Typesetting</span>
                      <span className={styles.stageDesc}>Layout and design</span>
                    </div>
                  </div>
                  
                  <div className={`${styles.stage} ${getStageClass('final-review', manuscript.copyEditingStage)}`}>
                    <div className={styles.stageMarker}></div>
                    <div className={styles.stageInfo}>
                      <span className={styles.stageName}>Final Review</span>
                      <span className={styles.stageDesc}>Quality assurance</span>
                    </div>
                  </div>
                  
                  <div className={`${styles.stage} ${getStageClass('ready-for-publication', manuscript.copyEditingStage)}`}>
                    <div className={styles.stageMarker}></div>
                    <div className={styles.stageInfo}>
                      <span className={styles.stageName}>Ready to Publish</span>
                      <span className={styles.stageDesc}>Publication ready</span>
                    </div>
                  </div>
                </div>
                
                {manuscript.authorCopyEditReview && (
                  <div className={styles.authorReviewInfo}>
                    <h4>Author Review Status</h4>
                    <div className={`${styles.reviewStatus} ${manuscript.authorCopyEditReview.approval === 'approved' ? styles.approved : styles.revisionRequested}`}>
                      {manuscript.authorCopyEditReview.approval === 'approved' ? '✓ Approved' : '⚠ Revisions Requested'}
                    </div>
                    {manuscript.authorCopyEditReview.comments && (
                      <div className={styles.authorComments}>
                        <strong>Comments:</strong> {manuscript.authorCopyEditReview.comments}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            {manuscript.timeline && manuscript.timeline.length > 0 && (
              <div className={styles.timelineCard}>
                <h3>Timeline</h3>
                <div className={styles.timeline}>
                  {manuscript.timeline.map((event, index) => (
                    <div key={index} className={styles.timelineEvent}>
                      <div className={styles.timelineMarker}></div>
                      <div className={styles.timelineContent}>
                        <h4>{event.event}</h4>
                        <p>{event.description}</p>
                        <span className={styles.timelineDate}>
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score Details Modal */}
      {showScoreModal && selectedReview && (
        <div className={styles.modalOverlay} onClick={closeScoreModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Review Score Details</h3>
              <button className={styles.closeModal} onClick={closeScoreModal}>
                &times;
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.reviewerInfo}>
                <h4>Reviewer: {selectedReview.reviewerId?.name || 'Anonymous'}</h4>
                <p className={styles.reviewType}>
                  {selectedReview.type?.replace('_', ' ').toUpperCase() || 'SINGLE BLIND'} Review
                </p>
              </div>

              {selectedReview.ratings && (
                <div className={styles.scoresGrid}>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Technical Quality</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.technicalQuality || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.technicalQuality || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Novelty</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.novelty || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.novelty || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Significance</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.significance || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.significance || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Clarity</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.clarity || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.clarity || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Overall Score</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.overall || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.overall || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.averageScore}>
                    <span className={styles.averageLabel}>Average Score:</span>
                    <span className={styles.averageValue}>
                      {getOverallScore(selectedReview.ratings)}/10
                    </span>
                  </div>
                </div>
              )}

              {selectedReview.recommendation && (
                <div className={styles.recommendation}>
                  <h4>Recommendation</h4>
                  <span className={`${styles.recommendationBadge} ${styles[selectedReview.recommendation.replace('-', '')]}`}>
                    {selectedReview.recommendation.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              )}

              {selectedReview.comments?.forAuthors && (
                <div className={styles.comments}>
                  <h4>Comments for Authors</h4>
                  <div className={styles.commentText}>
                    {selectedReview.comments.forAuthors}
                  </div>
                </div>
              )}

              {selectedReview.comments?.detailedReview && (
                <div className={styles.comments}>
                  <h4>Detailed Review</h4>
                  <div className={styles.commentText}>
                    {selectedReview.comments.detailedReview}
                  </div>
                </div>
              )}

              <div className={styles.reviewTimeline}>
                <h4>Review Timeline</h4>
                <div className={styles.timelineInfo}>
                  <div className={styles.timelineItem}>
                    <span className={styles.label}>Assigned:</span>
                    <span>{new Date(selectedReview.assignedDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.timelineItem}>
                    <span className={styles.label}>Due:</span>
                    <span>{new Date(selectedReview.dueDate).toLocaleDateString()}</span>
                  </div>
                  {selectedReview.completedDate && (
                    <div className={styles.timelineItem}>
                      <span className={styles.label}>Completed:</span>
                      <span>{new Date(selectedReview.completedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draft Approval Modal */}
      {showDraftModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{draftApprovalType === 'approved' ? 'Approve Draft' : 'Request Changes'}</h3>
              <button 
                onClick={() => setShowDraftModal(false)}
                className={styles.closeBtn}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                {draftApprovalType === 'approved' ? 
                  'Please provide any comments or feedback about the copy-edited draft before approval:' : 
                  'Please explain what changes are needed to the copy-edited draft:'}
              </p>
              <textarea
                value={draftComments}
                onChange={(e) => setDraftComments(e.target.value)}
                placeholder="Enter your comments here (optional for approval, required for change requests)"
                className={styles.modalTextarea}
                rows={6}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowDraftModal(false)}
                className="btn btn-secondary"
                disabled={draftApprovalLoading}
              >
                Cancel
              </button>
              <button
                onClick={submitDraftApproval}
                className="btn btn-primary"
                disabled={draftApprovalLoading || (draftApprovalType === 'needs_changes' && !draftComments.trim())}
              >
                {draftApprovalLoading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Complete Payment</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className={styles.closeBtn}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {paymentInfo && (
                <div className={styles.paymentSummary}>
                  <h4>Payment Summary</h4>
                  <div className={styles.summaryItem}>
                    <span>Article Processing Charge:</span>
                    <span>{paymentInfo.currency || 'USD'} {paymentInfo.finalAmount ? paymentInfo.finalAmount.toFixed(2) : '0.00'}</span>
                  </div>
                  {paymentInfo.discountApplied && paymentInfo.originalAmount && paymentInfo.discountAmount && (
                    <>
                      <div className={styles.summaryItem}>
                        <span>Original Amount:</span>
                        <span>{paymentInfo.currency || 'USD'} {paymentInfo.originalAmount.toFixed(2)}</span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span>Discount Applied:</span>
                        <span>-{paymentInfo.currency || 'USD'} {paymentInfo.discountAmount ? paymentInfo.discountAmount.toFixed(2) : '0.00'}</span>
                      </div>
                    </>
                  )}
                  <hr />
                  <div className={styles.summaryTotal}>
                    <span>Total Amount Due:</span>
                    <span>{paymentInfo.currency || 'USD'} {paymentInfo.finalAmount ? paymentInfo.finalAmount.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              )}
              
              <div className={styles.paymentOptions}>
                <h4>Payment Methods</h4>
                <p>You will be redirected to our secure payment portal to complete the transaction.</p>
                
                <div className={styles.paymentMethods}>
                  <div className={styles.methodItem}>
                    <FiCreditCard />
                    <span>Credit/Debit Cards</span>
                  </div>
                  <div className={styles.methodItem}>
                    <FiDollarSign />
                    <span>PayPal</span>
                  </div>
                  <div className={styles.methodItem}>
                    <FiDollarSign />
                    <span>Bank Transfer</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={proceedToPayment}
                className="btn btn-primary"
              >
                <FiCreditCard />
                Proceed to Payment Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
