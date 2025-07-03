'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  FiArrowLeft, 
  FiEye, 
  FiDownload, 
  FiCalendar,
  FiBook,
  FiUsers,
  FiEdit3,
  FiTrash2
} from 'react-icons/fi';
import styles from './IssueDetails.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{
    name: string;
    email: string;
  }>;
  status: string;
  category: string;
  doi?: string;
  pages?: string;
  publishedDate?: string;
  submissionDate: string;
}

interface Issue {
  _id: string;
  number: number;
  title: string;
  description: string;
  editorialNote: string;
  isPublished: boolean;
  publishedDate?: string;
  manuscripts: Manuscript[];
  volume: {
    _id: string;
    number: number;
    year: number;
    title: string;
  };
  coverImage?: {
    url: string;
    publicId: string;
    originalName: string;
  };
}

export default function IssueDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const issueId = params?.id as string;

  useEffect(() => {
    if (session && issueId) {
      fetchIssueDetails();
    }
  }, [session, issueId]);

  const fetchIssueDetails = async () => {
    try {
      const response = await fetch(`/api/issues/${issueId}`);
      
      if (response.ok) {
        const data = await response.json();
        setIssue(data.issue);
      } else {
        setError('Failed to load issue details');
      }
    } catch (error) {
      console.error('Error fetching issue details:', error);
      setError('Error loading issue details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveManuscript = async (manuscriptId: string, manuscriptTitle: string) => {
    if (!confirm(`Are you sure you want to remove "${manuscriptTitle}" from this issue?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/issues/${issueId}/remove-manuscript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptId
        }),
      });

      if (response.ok) {
        alert(`✅ Manuscript "${manuscriptTitle}" has been removed from the issue successfully!`);
        fetchIssueDetails(); // Refresh the data
      } else {
        const error = await response.json();
        alert(`❌ Error removing manuscript: ${error.error}`);
      }
    } catch (error) {
      console.error('Error removing manuscript:', error);
      alert('❌ Failed to remove manuscript');
    }
  };

  if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1>Access Denied</h1>
          <p>You don't have permission to view issue details.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading issue details...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className={styles.errorContainer}>
        <h1>Error</h1>
        <p>{error || 'Issue not found'}</p>
        <Link href="/dashboard/publication" className="btn btn-primary">
          Back to Publication Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.issueDetails}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Link 
              href="/dashboard/publication" 
              className={styles.backButton}
            >
              <FiArrowLeft />
              Back to Publication Dashboard
            </Link>
            <div className={styles.issueInfo}>
              <h1>Volume {issue.volume.number}, Issue {issue.number}</h1>
              <h2>{issue.title}</h2>
              <p className={styles.volumeTitle}>{issue.volume.title} ({issue.volume.year})</p>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <Link
              href={`/volumes/${issue.volume.number}/issues/${issue.number}`}
              className="btn btn-secondary"
              target="_blank"
            >
              <FiEye />
              View Public Page
            </Link>
            <Link
              href={`/dashboard/publication/issues/${issue._id}/edit`}
              className="btn btn-primary"
            >
              <FiEdit3 />
              Edit Issue
            </Link>
          </div>
        </div>

        {/* Issue Info Card */}
        <div className={styles.issueCard}>
          <div className={styles.issueContent}>
            <div className={styles.issueInfo}>
              <div className={styles.basicInfo}>
                <h3>Issue Information</h3>
                {issue.description && (
                  <div className={styles.field}>
                    <label>Description:</label>
                    <p>{issue.description}</p>
                  </div>
                )}
                {issue.editorialNote && (
                  <div className={styles.field}>
                    <label>Editorial Note:</label>
                    <p>{issue.editorialNote}</p>
                  </div>
                )}
                <div className={styles.field}>
                  <label>Status:</label>
                  <span className={`${styles.statusBadge} ${issue.isPublished ? styles.published : styles.draft}`}>
                    {issue.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                {issue.publishedDate && (
                  <div className={styles.field}>
                    <label>Published Date:</label>
                    <span className={styles.publishedDate}>
                      <FiCalendar />
                      {new Date(issue.publishedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Issue Statistics */}
        <div className={styles.statisticsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiBook />
            </div>
            <div className={styles.statInfo}>
              <h3>{issue.manuscripts?.length || 0}</h3>
              <p>Articles</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiUsers />
            </div>
            <div className={styles.statInfo}>
              <h3>{issue.manuscripts?.reduce((acc, ms) => acc + ms.authors.length, 0) || 0}</h3>
              <p>Authors</p>
            </div>
          </div>
        </div>

        {/* Articles in this Issue */}
        <div className={styles.articlesSection}>
          <div className={styles.sectionHeader}>
            <h3>Articles in this Issue</h3>
            <span className={styles.articleCount}>
              {issue.manuscripts?.length || 0} article{(issue.manuscripts?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>
          
          {!issue.manuscripts || issue.manuscripts.length === 0 ? (
            <div className={styles.emptyState}>
              <FiBook />
              <h4>No articles in this issue</h4>
              <p>This issue doesn't contain any articles yet.</p>
            </div>
          ) : (
            <div className={styles.articlesGrid}>
              {issue.manuscripts.map((manuscript, index) => (
                <div key={manuscript._id} className={styles.articleCard}>
                  <div className={styles.articleHeader}>
                    <span className={styles.articleNumber}>Article {index + 1}</span>
                    <span className={styles.category}>{manuscript.category}</span>
                  </div>
                  
                  <div className={styles.articleContent}>
                    <h4 className={styles.articleTitle}>{manuscript.title}</h4>
                    <div className={styles.authors}>
                      <FiUsers />
                      <span>
                        {manuscript.authors.map(author => author.name).join(', ')}
                      </span>
                    </div>
                    
                    <div className={styles.articleMeta}>
                      {manuscript.pages && (
                        <span className={styles.pages}>Pages: {manuscript.pages}</span>
                      )}
                      {manuscript.doi && (
                        <span className={styles.doi}>DOI: {manuscript.doi}</span>
                      )}
                      {manuscript.publishedDate && (
                        <span className={styles.publishDate}>
                          <FiCalendar />
                          {new Date(manuscript.publishedDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.articleActions}>
                    <Link
                      href={`/dashboard/manuscripts/${manuscript._id}`}
                      className={styles.actionButton}
                      title="View Details"
                    >
                      <FiEye />
                    </Link>
                    <button
                      onClick={() => handleRemoveManuscript(manuscript._id, manuscript.title)}
                      className={`${styles.actionButton} ${styles.removeButton}`}
                      title="Remove from Issue"
                    >
                      <FiTrash2 />
                    </button>
                    <button
                      onClick={() => window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank')}
                      className={styles.actionButton}
                      title="Download Files"
                    >
                      <FiDownload />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
