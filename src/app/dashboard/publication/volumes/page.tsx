'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  FiPlus, 
  FiEdit3, 
  FiArchive, 
  FiEye, 
  FiBook,
  FiCalendar,
  FiFileText,
  FiDownload,
  FiSettings
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './VolumeManagement.module.scss';

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  description: string;
  status: 'draft' | 'open' | 'closed' | 'published';
  isPublished: boolean;
  publishedDate?: string;
  issues: Issue[];
  manuscriptCount: number;
  publishedManuscriptCount: number;
}

interface Issue {
  _id: string;
  number: number;
  title: string;
  description: string;
  isPublished: boolean;
  publishedDate?: string;
  manuscripts: string[];
}

export default function VolumeManagementPage() {
  const { data: session } = useSession();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);

  useEffect(() => {
    fetchVolumes();
  }, []);

  const fetchVolumes = async () => {
    try {
      const response = await fetch('/api/volumes');
      if (response.ok) {
        const data = await response.json();
        setVolumes(data.volumes || []);
      } else {
        toast.error('Failed to fetch volumes');
      }
    } catch (error) {
      console.error('Error fetching volumes:', error);
      toast.error('Error loading volumes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveVolume = async (volumeId: string, volumeTitle: string) => {
    if (!confirm(`Are you sure you want to archive "${volumeTitle}"? This will mark it as complete.`)) {
      return;
    }

    setIsArchiving(volumeId);
    try {
      const response = await fetch(`/api/volumes/${volumeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'closed',
          closedDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Volume archived successfully');
        fetchVolumes();
      } else {
        toast.error('Failed to archive volume');
      }
    } catch (error) {
      console.error('Error archiving volume:', error);
      toast.error('Error archiving volume');
    } finally {
      setIsArchiving(null);
    }
  };

  const handlePublishVolume = async (volumeId: string, volumeTitle: string) => {
    if (!confirm(`Are you sure you want to publish "${volumeTitle}"? This will make all its issues publicly available.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/volumes/${volumeId}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Volume published successfully');
        fetchVolumes();
      } else {
        toast.error('Failed to publish volume');
      }
    } catch (error) {
      console.error('Error publishing volume:', error);
      toast.error('Error publishing volume');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: styles.statusDraft,
      open: styles.statusOpen,
      closed: styles.statusClosed,
      published: styles.statusPublished,
    };

    return (
      <span className={`${styles.statusBadge} ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Check if user has editor or admin role in either role or roles array
  const userRole = session?.user?.role;
  const userRoles = session?.user?.roles || [];
  const isEditor = userRole === 'editor' || userRoles.includes('editor');
  const isAdmin = userRole === 'admin' || userRoles.includes('admin');

  if (!session || (!isEditor && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1>Access Denied</h1>
          <p>You don't have permission to manage volumes.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading volumes...</p>
      </div>
    );
  }

  return (
    <div className={styles.volumeManagement}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1>Volume Management</h1>
            <p>Manage journal volumes and their issues</p>
          </div>
          <Link href="/dashboard/publication/volumes/new" className="btn btn-primary">
            <FiPlus />
            Create New Volume
          </Link>
        </div>

        <div className={styles.volumesGrid}>
          {volumes.length === 0 ? (
            <div className={styles.emptyState}>
              <FiBook className={styles.emptyIcon} />
              <h3>No Volumes Yet</h3>
              <p>Create your first journal volume to get started</p>
              <Link href="/dashboard/publication/volumes/new" className="btn btn-primary">
                <FiPlus />
                Create First Volume
              </Link>
            </div>
          ) : (
            volumes.map((volume) => (
              <div key={volume._id} className={styles.volumeCard}>
                <div className={styles.volumeHeader}>
                  <div className={styles.volumeInfo}>
                    <h3>Volume {volume.number}</h3>
                    <p className={styles.volumeYear}>{volume.year}</p>
                    {getStatusBadge(volume.status)}
                  </div>
                  <div className={styles.volumeActions}>
                    <Link 
                      href={`/dashboard/publication/volumes/${volume._id}/edit`}
                      className={styles.actionButton}
                      title="Edit Volume"
                    >
                      <FiEdit3 />
                    </Link>
                    <Link 
                      href={`/dashboard/publication/volumes/${volume._id}`}
                      className={styles.actionButton}
                      title="View Details"
                    >
                      <FiEye />
                    </Link>
                    {volume.status !== 'closed' && (
                      <button
                        onClick={() => handleArchiveVolume(volume._id, volume.title)}
                        className={styles.actionButton}
                        title="Archive Volume"
                        disabled={isArchiving === volume._id}
                      >
                        <FiArchive />
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.volumeContent}>
                  <h4>{volume.title}</h4>
                  {volume.description && (
                    <p className={styles.volumeDescription}>{volume.description}</p>
                  )}
                </div>

                <div className={styles.volumeStats}>
                  <div className={styles.stat}>
                    <FiFileText />
                    <span>{volume.issues?.length || 0} Issues</span>
                  </div>
                  <div className={styles.stat}>
                    <FiBook />
                    <span>{volume.publishedManuscriptCount || 0} Published Articles</span>
                  </div>
                  {volume.publishedDate && (
                    <div className={styles.stat}>
                      <FiCalendar />
                      <span>Published {new Date(volume.publishedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className={styles.issuesPreview}>
                  <h5>Issues in this Volume</h5>
                  {volume.issues && volume.issues.length > 0 ? (
                    <div className={styles.issuesList}>
                      {volume.issues.slice(0, 3).map((issue) => (
                        <div key={issue._id} className={styles.issueItem}>
                          <span className={styles.issueNumber}>Issue {issue.number}</span>
                          <span className={styles.issueTitle}>{issue.title}</span>
                          {issue.isPublished && (
                            <span className={styles.publishedTag}>Published</span>
                          )}
                        </div>
                      ))}
                      {volume.issues.length > 3 && (
                        <div className={styles.moreIssues}>
                          +{volume.issues.length - 3} more issues
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={styles.noIssues}>No issues created yet</p>
                  )}
                  <Link 
                    href={`/dashboard/publication/issues/new?volumeId=${volume._id}`}
                    className={styles.addIssueButton}
                  >
                    <FiPlus />
                    Add Issue
                  </Link>
                </div>

                <div className={styles.volumeFooter}>
                  {volume.status === 'draft' && (
                    <button
                      onClick={() => handlePublishVolume(volume._id, volume.title)}
                      className="btn btn-primary btn-sm"
                    >
                      Publish Volume
                    </button>
                  )}
                  <Link 
                    href={`/volumes/${volume.number}`}
                    className="btn btn-secondary btn-sm"
                    target="_blank"
                  >
                    <FiEye />
                    View Public Page
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
