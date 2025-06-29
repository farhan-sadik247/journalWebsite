'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import styles from './ReviewPage.module.scss';

interface ReviewData {
  _id: string;
  manuscriptId: {
    _id: string;
    title: string;
    abstract: string;
    authors: Array<{ name: string; email: string; affiliation: string }>;
    keywords: string[];
    submissionDate: string;
    files: Array<{ url: string; filename: string; type: string }>;
  };
  type: string;
  status: string;
  assignedDate: string;
  dueDate: string;
  recommendation?: string;
  confidentialComments?: string;
  publicComments?: string;
  scores?: {
    technicalQuality: number;
    novelty: number;
    significance: number;
    clarity: number;
    overall: number;
  };
  detailedComments?: string;
}

export default function ReviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const reviewId = params?.id as string;

  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    recommendation: '',
    confidentialComments: '',
    publicComments: '',
    technicalQuality: 5,
    novelty: 5,
    significance: 5,
    clarity: 5,
    overallScore: 5,
    detailedComments: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (reviewId) {
      fetchReview();
    }
  }, [session, status, reviewId, router]);

  const fetchReview = async () => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`);
      if (response.ok) {
        const data = await response.json();
        setReview(data.review);
        
        // Pre-fill form if review already has data
        if (data.review.recommendation) {
          setFormData({
            recommendation: data.review.recommendation || '',
            confidentialComments: data.review.comments?.confidentialToEditor || '',
            publicComments: data.review.comments?.forAuthors || '',
            technicalQuality: data.review.ratings?.technicalQuality || 5,
            novelty: data.review.ratings?.novelty || 5,
            significance: data.review.ratings?.significance || 5,
            clarity: data.review.ratings?.clarity || 5,
            overallScore: data.review.ratings?.overall || 5,
            detailedComments: data.review.comments?.detailedReview || ''
          });
        }
      } else {
        router.push('/dashboard/reviewer');
      }
    } catch (error) {
      console.error('Error fetching review:', error);
      router.push('/dashboard/reviewer');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard/reviewer');
      } else {
        alert('Error submitting review. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <div className={styles.loading}>Loading review...</div>;
  }

  if (!review) {
    return <div className={styles.error}>Review not found</div>;
  }

  const isCompleted = review.status === 'completed';
  const isOverdue = new Date(review.dueDate) < new Date() && !isCompleted;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/dashboard/reviewer')}
        >
          ← Back to Dashboard
        </button>
        <div className={styles.reviewStatus}>
          <span className={`${styles.status} ${isOverdue ? styles.overdue : styles[review.status]}`}>
            {isOverdue ? 'Overdue' : review.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className={styles.type}>{review.type} Review</span>
        </div>
      </div>

      <div className={styles.manuscript}>
        <h1>{review.manuscriptId.title}</h1>
        <div className={styles.authors}>
          by {review.manuscriptId.authors.map((a: any) => a.name).join(', ')}
        </div>
        <div className={styles.metadata}>
          <span>Submitted: {new Date(review.manuscriptId.submissionDate).toLocaleDateString()}</span>
          <span>Due: {new Date(review.dueDate).toLocaleDateString()}</span>
        </div>

        <div className={styles.abstract}>
          <h3>Abstract</h3>
          <p>{review.manuscriptId.abstract}</p>
        </div>

        {review.manuscriptId.keywords && review.manuscriptId.keywords.length > 0 && (
          <div className={styles.keywords}>
            <h3>Keywords</h3>
            <div className={styles.keywordList}>
              {review.manuscriptId.keywords.map((keyword: any, index: any) => (
                <span key={index} className={styles.keyword}>{keyword}</span>
              ))}
            </div>
          </div>
        )}

        <div className={styles.files}>
          <h3>Files</h3>
          {review.manuscriptId.files.map((file: any, index: any) => {
            // Ensure filename ends with .pdf for display
            const displayName = file.filename.toLowerCase().endsWith('.pdf') 
              ? file.filename 
              : `${file.filename}.pdf`;
            
            // Use the manuscript download API instead of direct Cloudinary URL
            const downloadUrl = `/api/manuscripts/${review.manuscriptId._id}/download/${encodeURIComponent(file.filename)}`;
            
            return (
              <a
                key={index}
                href={downloadUrl}
                className={styles.fileLink}
                download={displayName}
              >
                📄 {displayName}
              </a>
            );
          })}
        </div>
      </div>

      <form className={styles.reviewForm} onSubmit={handleSubmit}>
        <h2>Review Form</h2>

        <div className={styles.formGroup}>
          <label>Overall Recommendation *</label>
          <select
            value={formData.recommendation}
            onChange={(e) => handleInputChange('recommendation', e.target.value)}
            required
            disabled={isCompleted}
          >
            <option value="">Select recommendation</option>
            <option value="accept">Accept</option>
            <option value="minor-revision">Minor Revisions</option>
            <option value="major-revision">Major Revisions</option>
            <option value="reject">Reject</option>
          </select>
        </div>

        <div className={styles.scores}>
          <h3>Evaluation Scores (1-10 scale)</h3>
          
          <div className={styles.scoreGroup}>
            <label>Technical Quality</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.technicalQuality}
              onChange={(e) => handleInputChange('technicalQuality', parseInt(e.target.value))}
              disabled={isCompleted}
            />
            <span>{formData.technicalQuality}/10</span>
          </div>

          <div className={styles.scoreGroup}>
            <label>Novelty</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.novelty}
              onChange={(e) => handleInputChange('novelty', parseInt(e.target.value))}
              disabled={isCompleted}
            />
            <span>{formData.novelty}/10</span>
          </div>

          <div className={styles.scoreGroup}>
            <label>Significance</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.significance}
              onChange={(e) => handleInputChange('significance', parseInt(e.target.value))}
              disabled={isCompleted}
            />
            <span>{formData.significance}/10</span>
          </div>

          <div className={styles.scoreGroup}>
            <label>Clarity</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.clarity}
              onChange={(e) => handleInputChange('clarity', parseInt(e.target.value))}
              disabled={isCompleted}
            />
            <span>{formData.clarity}/10</span>
          </div>

          <div className={styles.scoreGroup}>
            <label>Overall Score</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.overallScore}
              onChange={(e) => handleInputChange('overallScore', parseInt(e.target.value))}
              disabled={isCompleted}
            />
            <span>{formData.overallScore}/10</span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Detailed Comments for Authors *</label>
          <textarea
            value={formData.publicComments}
            onChange={(e) => handleInputChange('publicComments', e.target.value)}
            rows={6}
            placeholder="Provide detailed feedback that will be shared with the authors..."
            required
            disabled={isCompleted}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Confidential Comments for Editor</label>
          <textarea
            value={formData.confidentialComments}
            onChange={(e) => handleInputChange('confidentialComments', e.target.value)}
            rows={4}
            placeholder="Comments for the editor only (optional)..."
            disabled={isCompleted}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Additional Detailed Comments</label>
          <textarea
            value={formData.detailedComments}
            onChange={(e) => handleInputChange('detailedComments', e.target.value)}
            rows={8}
            placeholder="Provide detailed technical feedback, suggestions for improvement, etc..."
            disabled={isCompleted}
          />
        </div>

        {!isCompleted && (
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        )}

        {isCompleted && (
          <div className={styles.completedNotice}>
            ✓ This review has been completed and submitted.
          </div>
        )}
      </form>
    </div>
  );
}
