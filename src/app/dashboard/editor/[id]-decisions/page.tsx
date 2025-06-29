'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import styles from './DecisionPage.module.scss';
import { FiArrowLeft, FiSend, FiDownload, FiEye } from 'react-icons/fi';

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{
    name: string;
    email: string;
    affiliation: string;
  }>;
  status: string;
  submissionDate: string;
  category: string;
  keywords: string[];
  files: Array<{
    url: string;
    originalName: string;
    type: string;
  }>;
}

interface Review {
  _id: string;
  reviewerId: {
    name: string;
    email: string;
  };
  status: string;
  recommendation: string;
  ratings: {
    technicalQuality: number;
    novelty: number;
    significance: number;
    clarity: number;
    overall: number;
  };
  comments: {
    forAuthors: string;
    confidentialToEditor: string;
    detailedReview: string;
  };
  completedDate: string;
}

interface DecisionForm {
  decision: 'accept' | 'minor-revision' | 'major-revision' | 'reject';
  editorComments: string;
  confidentialNotes: string;
  includeReviewerComments: boolean;
  customMessage: string;
}

export default function EditorialDecisionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const manuscriptId = params?.manuscriptId as string;

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<DecisionForm>({
    decision: 'minor-revision',
    editorComments: '',
    confidentialNotes: '',
    includeReviewerComments: true,
    customMessage: ''
  });

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

    if (manuscriptId) {
      fetchManuscriptAndReviews();
    }
  }, [session, status, manuscriptId, router]);

  const fetchManuscriptAndReviews = async () => {
    try {
      // Fetch manuscript details
      const manuscriptResponse = await fetch(`/api/manuscripts/${manuscriptId}`);
      if (manuscriptResponse.ok) {
        const manuscriptData = await manuscriptResponse.json();
        setManuscript(manuscriptData.manuscript);
      }

      // Fetch reviews for this manuscript
      const reviewsResponse = await fetch(`/api/reviews?manuscriptId=${manuscriptId}`);
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews.filter((r: Review) => r.status === 'completed'));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DecisionForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manuscript) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard/editor');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      alert('Error submitting decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'accept': return '#10b981';
      case 'minor-revision': return '#f59e0b';
      case 'major-revision': return '#ef4444';
      case 'reject': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getAverageRating = (reviews: Review[]) => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + (review.ratings?.overall || 0), 0);
    return (total / reviews.length).toFixed(1);
  };

  const getRecommendationSummary = (reviews: Review[]) => {
    const counts = reviews.reduce((acc, review) => {
      acc[review.recommendation] = (acc[review.recommendation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return counts;
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!manuscript) {
    return <div className={styles.error}>Manuscript not found</div>;
  }

  const completedReviews = reviews.filter(r => r.status === 'completed');
  const recommendationSummary = getRecommendationSummary(completedReviews);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/dashboard/editor')}
        >
          <FiArrowLeft /> Back to Editor Dashboard
        </button>
        <h1>Editorial Decision</h1>
      </div>

      <div className={styles.content}>
        {/* Manuscript Info */}
        <div className={styles.manuscriptSection}>
          <h2>Manuscript Details</h2>
          <div className={styles.manuscriptCard}>
            <h3>{manuscript.title}</h3>
            <p className={styles.authors}>
              by {manuscript.authors.map(a => a.name).join(', ')}
            </p>
            <div className={styles.metadata}>
              <span>Category: {manuscript.category}</span>
              <span>Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
              <span>Status: {manuscript.status}</span>
            </div>
            <div className={styles.keywords}>
              {manuscript.keywords.map((keyword, index) => (
                <span key={index} className={styles.keyword}>{keyword}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Review Summary */}
        <div className={styles.reviewSection}>
          <h2>Review Summary</h2>
          <div className={styles.reviewSummary}>
            <div className={styles.summaryStats}>
              <div className={styles.stat}>
                <h4>{completedReviews.length}</h4>
                <p>Completed Reviews</p>
              </div>
              <div className={styles.stat}>
                <h4>{getAverageRating(completedReviews)}</h4>
                <p>Average Rating</p>
              </div>
            </div>
            
            <div className={styles.recommendations}>
              <h4>Reviewer Recommendations:</h4>
              <div className={styles.recommendationList}>
                {Object.entries(recommendationSummary).map(([rec, count]) => (
                  <span key={rec} className={styles.recommendation}>
                    {rec.replace('-', ' ')}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Individual Reviews */}
          <div className={styles.reviewsList}>
            {completedReviews.map((review, index) => (
              <div key={review._id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <h4>Review {index + 1}</h4>
                  <span 
                    className={styles.recommendationBadge}
                    style={{ backgroundColor: getDecisionColor(review.recommendation) }}
                  >
                    {review.recommendation.replace('-', ' ')}
                  </span>
                </div>
                
                <div className={styles.ratings}>
                  <span>Technical Quality: {review.ratings?.technicalQuality || 'N/A'}</span>
                  <span>Novelty: {review.ratings?.novelty || 'N/A'}</span>
                  <span>Significance: {review.ratings?.significance || 'N/A'}</span>
                  <span>Clarity: {review.ratings?.clarity || 'N/A'}</span>
                  <span>Overall: {review.ratings?.overall || 'N/A'}</span>
                </div>

                <div className={styles.comments}>
                  {review.comments?.forAuthors && (
                    <div className={styles.comment}>
                      <h5>Comments for Authors:</h5>
                      <p>{review.comments.forAuthors}</p>
                    </div>
                  )}
                  
                  {review.comments?.confidentialToEditor && (
                    <div className={styles.comment}>
                      <h5>Confidential Comments:</h5>
                      <p>{review.comments.confidentialToEditor}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Form */}
        <div className={styles.decisionSection}>
          <h2>Editorial Decision</h2>
          <form onSubmit={handleSubmitDecision} className={styles.decisionForm}>
            <div className={styles.formGroup}>
              <label>Decision *</label>
              <select
                value={formData.decision}
                onChange={(e) => handleInputChange('decision', e.target.value)}
                required
              >
                <option value="accept">Accept</option>
                <option value="minor-revision">Minor Revision</option>
                <option value="major-revision">Major Revision</option>
                <option value="reject">Reject</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Editor Comments to Authors *</label>
              <textarea
                value={formData.editorComments}
                onChange={(e) => handleInputChange('editorComments', e.target.value)}
                rows={6}
                placeholder="Provide feedback and guidance to the authors..."
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.includeReviewerComments}
                  onChange={(e) => handleInputChange('includeReviewerComments', e.target.checked)}
                />
                Include reviewer comments in author notification
              </label>
            </div>

            <div className={styles.formGroup}>
              <label>Custom Message (Optional)</label>
              <textarea
                value={formData.customMessage}
                onChange={(e) => handleInputChange('customMessage', e.target.value)}
                rows={4}
                placeholder="Additional message to include in the decision letter..."
              />
            </div>

            <div className={styles.formGroup}>
              <label>Confidential Notes (Internal Only)</label>
              <textarea
                value={formData.confidentialNotes}
                onChange={(e) => handleInputChange('confidentialNotes', e.target.value)}
                rows={3}
                placeholder="Internal notes for future reference..."
              />
            </div>

            <div className={styles.formActions}>
              <button 
                type="button" 
                onClick={() => router.push('/dashboard/editor')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                <FiSend />
                {submitting ? 'Submitting...' : 'Submit Decision'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
