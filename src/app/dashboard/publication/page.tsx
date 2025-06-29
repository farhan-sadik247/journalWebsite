'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiBook,
  FiCalendar,
  FiGlobe,
  FiHash,
  FiEdit3,
  FiEye,
  FiDownload,
  FiPlus,
  FiArchive
} from 'react-icons/fi';
import styles from './PublicationDashboard.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  status: string;
  submissionDate: string;
  lastModified: string;
  authors: Array<{
    name: string;
    email: string;
  }>;
  copyEditingStage?: string;
  doi?: string;
  volume?: number;
  issue?: number;
  pages?: string;
  publishedDate?: string;
  category: string;
}

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  description: string;
  coverImage?: string;
  status: string;
  publishedDate?: string;
  manuscripts: string[];
}

interface Issue {
  _id: string;
  volumeId: string;
  number: number;
  title: string;
  description: string;
  status: string;
  publishedDate?: string;
  manuscripts: string[];
}

export default function PublicationDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ready-to-publish');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== 'editor' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (session) {
      fetchData();
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [manuscriptsRes, volumesRes, issuesRes] = await Promise.all([
        fetch('/api/manuscripts?status=in-production'),
        fetch('/api/volumes'),
        fetch('/api/issues')
      ]);

      if (manuscriptsRes.ok) {
        const manuscriptsData = await manuscriptsRes.json();
        setManuscripts(manuscriptsData.manuscripts || []);
      }

      if (volumesRes.ok) {
        const volumesData = await volumesRes.json();
        setVolumes(volumesData.volumes || []);
      }

      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(issuesData.issues || []);
      }
    } catch (error) {
      console.error('Error fetching publication data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplayText = (status: string) => {
    const statusMap: Record<string, string> = {
      'in-production': 'In Production',
      'ready-for-publication': 'Ready for Publication',
      'published': 'Published',
      'draft': 'Draft',
      'scheduled': 'Scheduled'
    };
    return statusMap[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    const classMap: Record<string, string> = {
      'in-production': 'production',
      'ready-for-publication': 'ready',
      'published': 'published',
      'draft': 'draft',
      'scheduled': 'scheduled'
    };
    return classMap[status] || 'default';
  };

  const filteredManuscripts = manuscripts.filter(manuscript => {
    if (activeTab === 'ready-to-publish') {
      return manuscript.copyEditingStage === 'ready-for-publication' && !manuscript.publishedDate;
    }
    if (activeTab === 'published') {
      return manuscript.status === 'published' && manuscript.publishedDate;
    }
    if (activeTab === 'in-production') {
      return manuscript.status === 'in-production' && manuscript.copyEditingStage !== 'ready-for-publication';
    }
    return true;
  });

  const stats = {
    readyToPublish: manuscripts.filter(m => m.copyEditingStage === 'ready-for-publication' && !m.publishedDate).length,
    published: manuscripts.filter(m => m.status === 'published').length,
    inProduction: manuscripts.filter(m => m.status === 'in-production' && m.copyEditingStage !== 'ready-for-publication').length,
    totalVolumes: volumes.length,
    totalIssues: issues.length
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className={styles.publicationDashboard}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Publication Management</h1>
            <p>Manage journal volumes, issues, and publication workflow</p>
          </div>
          
          <div className={styles.headerActions}>
            <Link href="/dashboard/publication/volumes/new" className="btn btn-primary">
              <FiPlus />
              New Volume
            </Link>
            <Link href="/dashboard/publication/issues/new" className="btn btn-secondary">
              <FiPlus />
              New Issue
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiBook />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.readyToPublish}</h3>
              <p>Ready to Publish</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiGlobe />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.published}</h3>
              <p>Published Articles</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiEdit3 />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.inProduction}</h3>
              <p>In Production</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiArchive />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.totalVolumes}</h3>
              <p>Total Volumes</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={activeTab === 'ready-to-publish' ? styles.active : ''}
            onClick={() => setActiveTab('ready-to-publish')}
          >
            Ready to Publish ({stats.readyToPublish})
          </button>
          <button
            className={activeTab === 'in-production' ? styles.active : ''}
            onClick={() => setActiveTab('in-production')}
          >
            In Production ({stats.inProduction})
          </button>
          <button
            className={activeTab === 'published' ? styles.active : ''}
            onClick={() => setActiveTab('published')}
          >
            Published ({stats.published})
          </button>
        </div>

        {/* Manuscripts Table */}
        <div className={styles.manuscriptsSection}>
          {filteredManuscripts.length === 0 ? (
            <div className={styles.emptyState}>
              <FiBook />
              <h3>No manuscripts found</h3>
              <p>There are no manuscripts in the &quot;{activeTab.replace('-', ' ')}&quot; category.</p>
            </div>
          ) : (
            <div className={styles.manuscriptsTable}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Authors</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Publication Info</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManuscripts.map((manuscript) => (
                    <tr key={manuscript._id}>
                      <td data-label="Title">
                        <div className={styles.titleCell}>
                          <h4>{manuscript.title}</h4>
                          <span className={styles.submissionDate}>
                            Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td data-label="Authors">
                        <div className={styles.authorsCell}>
                          {manuscript.authors.slice(0, 2).map((author, index) => (
                            <span key={index} className={styles.authorName}>
                              {author.name}
                            </span>
                          ))}
                          {manuscript.authors.length > 2 && (
                            <span className={styles.moreAuthors}>
                              +{manuscript.authors.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Category">
                        <span className={styles.category}>{manuscript.category}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`${styles.statusBadge} ${styles[getStatusBadgeClass(manuscript.status)]}`}>
                          {getStatusDisplayText(manuscript.status)}
                        </span>
                      </td>
                      <td data-label="Publication Info">
                        <div className={styles.publicationInfo}>
                          {manuscript.doi && (
                            <span className={styles.doi}>
                              <FiHash />
                              {manuscript.doi}
                            </span>
                          )}
                          {manuscript.volume && (
                            <span className={styles.volumeIssue}>
                              Vol. {manuscript.volume}
                              {manuscript.issue && `, Issue ${manuscript.issue}`}
                            </span>
                          )}
                          {manuscript.publishedDate && (
                            <span className={styles.publishedDate}>
                              <FiCalendar />
                              {new Date(manuscript.publishedDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Actions">
                        <div className={styles.actionButtons}>
                          <Link
                            href={`/dashboard/publication/manuscripts/${manuscript._id}`}
                            className={styles.actionButton}
                            title="View Details"
                          >
                            <FiEye />
                          </Link>
                          {manuscript.copyEditingStage === 'ready-for-publication' && !manuscript.publishedDate && (
                            <Link
                              href={`/dashboard/publication/manuscripts/${manuscript._id}/publish`}
                              className={styles.actionButton}
                              title="Publish"
                            >
                              <FiGlobe />
                            </Link>
                          )}
                          <button
                            onClick={() => window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank')}
                            className={styles.actionButton}
                            title="Download Files"
                          >
                            <FiDownload />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Volumes & Issues Section */}
        <div className={styles.volumesSection}>
          <div className={styles.sectionHeader}>
            <h2>Recent Volumes & Issues</h2>
            <Link href="/dashboard/publication/volumes" className="btn btn-outline">
              View All
            </Link>
          </div>

          <div className={styles.volumesGrid}>
            {volumes.slice(0, 3).map((volume) => (
              <div key={volume._id} className={styles.volumeCard}>
                <div className={styles.volumeInfo}>
                  <h3>Volume {volume.number} ({volume.year})</h3>
                  <p>{volume.title}</p>
                  <span className={`${styles.statusBadge} ${styles[getStatusBadgeClass(volume.status)]}`}>
                    {getStatusDisplayText(volume.status)}
                  </span>
                </div>
                <div className={styles.volumeActions}>
                  <Link href={`/dashboard/publication/volumes/${volume._id}`} className={styles.actionButton}>
                    <FiEye />
                  </Link>
                  <Link href={`/dashboard/publication/volumes/${volume._id}/edit`} className={styles.actionButton}>
                    <FiEdit3 />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
