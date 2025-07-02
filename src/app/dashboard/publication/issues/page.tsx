'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  FiPlus, 
  FiEdit3, 
  FiEye, 
  FiFileText,
  FiCalendar,
  FiBook,
  FiUsers,
  FiDownload,
  FiCheckCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import QuickAssignModal from '@/components/QuickAssignModal';
import styles from './IssueManagement.module.scss';

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
}

interface Issue {
  _id: string;
  number: number;
  title: string;
  description: string;
  volume: Volume;
  isPublished: boolean;
  publishedDate?: string;
  manuscripts: Manuscript[];
  status: 'draft' | 'open' | 'published';
}

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{
    name: string;
  }>;
  status: string;
  pages?: string;
}

export default function IssueManagementPage() {
  const { data: session } = useSession();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [quickAssignModal, setQuickAssignModal] = useState<{
    isOpen: boolean;
    issueId: string;
    issueTitle: string;
    currentManuscripts: string[];
  }>({
    isOpen: false,
    issueId: '',
    issueTitle: '',
    currentManuscripts: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [issuesResponse, volumesResponse] = await Promise.all([
        fetch('/api/issues'),
        fetch('/api/volumes')
      ]);

      if (issuesResponse.ok) {
        const issuesData = await issuesResponse.json();
        setIssues(issuesData.issues || []);
      }

      if (volumesResponse.ok) {
        const volumesData = await volumesResponse.json();
        setVolumes(volumesData.volumes || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishIssue = async (issueId: string, issueTitle: string) => {
    const articleCount = issues.find(issue => issue._id === issueId)?.manuscripts?.length || 0;
    const articleText = articleCount === 1 ? '1 article' : `${articleCount} articles`;
    
    if (!confirm(`Are you sure you want to publish "${issueTitle}"? This will publish ${articleText} and make them publicly available.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/issues/${issueId}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to publish issue');
      }
    } catch (error) {
      console.error('Error publishing issue:', error);
      toast.error('Failed to publish issue');
    }
  };

  const handleOpenQuickAssign = (issue: Issue) => {
    setQuickAssignModal({
      isOpen: true,
      issueId: issue._id,
      issueTitle: `${issue.title} (Volume ${issue.volume.number}, Issue ${issue.number})`,
      currentManuscripts: issue.manuscripts?.map(ms => ms._id) || []
    });
  };

  const handleCloseQuickAssign = () => {
    setQuickAssignModal({
      isOpen: false,
      issueId: '',
      issueTitle: '',
      currentManuscripts: []
    });
  };

  const handleQuickAssignSuccess = () => {
    fetchData(); // Refresh the data to show updated assignments
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: styles.statusDraft,
      open: styles.statusOpen,
      published: styles.statusPublished,
    };

    return (
      <span className={`${styles.statusBadge} ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredIssues = selectedVolume 
    ? issues.filter(issue => issue.volume._id === selectedVolume)
    : issues;

  if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1>Access Denied</h1>
          <p>You don't have permission to manage issues.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading issues...</p>
      </div>
    );
  }

  return (
    <div className={styles.issueManagement}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1>Issue Management</h1>
            <p>Manage journal issues and their articles</p>
          </div>
          <div className={styles.headerActions}>
            <select 
              value={selectedVolume} 
              onChange={(e) => setSelectedVolume(e.target.value)}
              className={styles.volumeFilter}
            >
              <option value="">All Volumes</option>
              {volumes.map(volume => (
                <option key={volume._id} value={volume._id}>
                  Volume {volume.number} ({volume.year})
                </option>
              ))}
            </select>
            <Link href="/dashboard/publication/assign-articles" className="btn btn-secondary">
              <FiUsers />
              Assign Articles
            </Link>
            <Link href="/dashboard/publication/issues/new" className="btn btn-primary">
              <FiPlus />
              Create New Issue
            </Link>
          </div>
        </div>

        <div className={styles.issuesGrid}>
          {filteredIssues.length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText className={styles.emptyIcon} />
              <h3>No Issues Yet</h3>
              <p>Create your first journal issue to get started</p>
              <Link href="/dashboard/publication/issues/new" className="btn btn-primary">
                <FiPlus />
                Create First Issue
              </Link>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div key={issue._id} className={styles.issueCard}>
                <div className={styles.issueHeader}>
                  <div className={styles.issueInfo}>
                    <h3>Issue {issue.number}</h3>
                    <p className={styles.volumeInfo}>
                      Volume {issue.volume.number} ({issue.volume.year})
                    </p>
                    {getStatusBadge(issue.status)}
                  </div>
                  <div className={styles.issueActions}>
                    <Link 
                      href={`/dashboard/publication/issues/${issue._id}/edit`}
                      className={styles.actionButton}
                      title="Edit Issue"
                    >
                      <FiEdit3 />
                    </Link>
                    <Link 
                      href={`/dashboard/publication/issues/${issue._id}`}
                      className={styles.actionButton}
                      title="View Details"
                    >
                      <FiEye />
                    </Link>
                    <Link 
                      href={`/dashboard/publication/issues/${issue._id}/articles`}
                      className={styles.actionButton}
                      title="Manage Articles"
                    >
                      <FiBook />
                    </Link>
                    <button
                      onClick={() => handleOpenQuickAssign(issue)}
                      className={styles.actionButton}
                      title="Quick Assign Articles"
                    >
                      <FiUsers />
                    </button>
                  </div>
                </div>

                <div className={styles.issueContent}>
                  <h4>{issue.title}</h4>
                  {issue.description && (
                    <p className={styles.issueDescription}>{issue.description}</p>
                  )}
                </div>

                <div className={styles.issueStats}>
                  <div className={styles.stat}>
                    <FiFileText />
                    <span>{issue.manuscripts?.length || 0} Articles</span>
                  </div>
                  <div className={styles.stat}>
                    <FiUsers />
                    <span>{issue.manuscripts?.reduce((acc, ms) => acc + (ms.authors?.length || 0), 0) || 0} Authors</span>
                  </div>
                  {issue.publishedDate && (
                    <div className={styles.stat}>
                      <FiCalendar />
                      <span>Published {new Date(issue.publishedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className={styles.articlesPreview}>
                  <h5>Articles in this Issue</h5>
                  {issue.manuscripts && issue.manuscripts.length > 0 ? (
                    <div className={styles.articlesList}>
                      {issue.manuscripts.slice(0, 3).map((manuscript) => (
                        <div key={manuscript._id} className={styles.articleItem}>
                          <div className={styles.articleInfo}>
                            <span className={styles.articleTitle}>{manuscript.title}</span>
                            <span className={styles.articleAuthors}>
                              {manuscript.authors?.map(a => a.name).join(', ') || 'Unknown Authors'}
                            </span>
                          </div>
                          {manuscript.pages && (
                            <span className={styles.articlePages}>pp. {manuscript.pages}</span>
                          )}
                        </div>
                      ))}
                      {issue.manuscripts.length > 3 && (
                        <div className={styles.moreArticles}>
                          +{issue.manuscripts.length - 3} more articles
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.noArticles}>
                      <p>No articles assigned yet</p>
                      <small>
                        Use the <Link href="/dashboard/publication/assign-articles">Article Assignment</Link> page 
                        or quick assign to add "Author Approved" manuscripts to this issue.
                      </small>
                      <div className={styles.assignButtonGroup}>
                        <button
                          onClick={() => handleOpenQuickAssign(issue)}
                          className={styles.quickAssignButton}
                        >
                          <FiUsers />
                          Quick Assign
                        </button>
                        <Link 
                          href="/dashboard/publication/assign-articles"
                          className={styles.assignArticlesButton}
                        >
                          <FiPlus />
                          Assign Articles
                        </Link>
                      </div>
                    </div>
                  )}
                  <Link 
                    href="/dashboard/publication/assign-articles"
                    className={styles.manageArticlesButton}
                  >
                    <FiUsers />
                    Manage Article Assignment
                  </Link>
                </div>

                <div className={styles.issueFooter}>
                  {!issue.isPublished && (
                    <button
                      onClick={() => handlePublishIssue(issue._id, issue.title)}
                      className="btn btn-primary btn-sm"
                      disabled={!issue.manuscripts || issue.manuscripts.length === 0}
                      title={
                        !issue.manuscripts || issue.manuscripts.length === 0 
                          ? "No articles assigned to this issue" 
                          : issue.manuscripts.length === 1
                            ? "Publish issue with 1 article"
                            : `Publish issue with ${issue.manuscripts.length} articles`
                      }
                    >
                      <FiCheckCircle />
                      Publish Issue & Articles
                    </button>
                  )}
                  <Link 
                    href={`/volumes/${issue.volume.number}/issues/${issue.number}`}
                    className="btn btn-secondary btn-sm"
                    target="_blank"
                  >
                    <FiEye />
                    View Public Page
                  </Link>
                  {issue.isPublished && (
                    <button className="btn btn-outline btn-sm">
                      <FiDownload />
                      Download PDF
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <QuickAssignModal
        issueId={quickAssignModal.issueId}
        issueTitle={quickAssignModal.issueTitle}
        currentManuscripts={quickAssignModal.currentManuscripts}
        isOpen={quickAssignModal.isOpen}
        onClose={handleCloseQuickAssign}
        onSuccess={handleQuickAssignSuccess}
      />
    </div>
  );
}
