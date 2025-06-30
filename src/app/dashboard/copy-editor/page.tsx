'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiFileText,
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiEdit3,
  FiEye,
  FiDownload,
  FiUser
} from 'react-icons/fi';
import styles from './CopyEditorDashboard.module.scss';

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
  productionStage?: string;
  assignedCopyEditor?: string;
  copyEditingDueDate?: string;
  proofreadingDueDate?: string;
}

export default function CopyEditorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user && !session.user.roles?.includes('copy-editor') && !session.user.roles?.includes('admin') && session.user.currentActiveRole !== 'copy-editor') {
      router.push('/dashboard');
      return;
    }

    if (session) {
      fetchManuscripts();
    }
  }, [session, status, router]);

  const fetchManuscripts = async () => {
    try {
      const response = await fetch('/api/manuscripts?copyEditing=true');
      if (response.ok) {
        const data = await response.json();
        setManuscripts(data.manuscripts || []);
      }
    } catch (error) {
      console.error('Error fetching manuscripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStageDisplayText = (stage?: string) => {
    const stageMap: Record<string, string> = {
      'copy-editing': 'Copy Editing',
      'author-review': 'Author Review',
      'proofreading': 'Proofreading',
      'typesetting': 'Typesetting',
      'final-review': 'Final Review',
      'ready-for-publication': 'Ready for Publication'
    };
    return stageMap[stage || ''] || 'Not Assigned';
  };

  const getStageBadgeClass = (stage?: string) => {
    const classMap: Record<string, string> = {
      'copy-editing': 'editing',
      'author-review': 'review',
      'proofreading': 'proof',
      'typesetting': 'typeset',
      'final-review': 'final',
      'ready-for-publication': 'ready'
    };
    return classMap[stage || ''] || 'default';
  };

  const filteredManuscripts = manuscripts.filter(manuscript => {
    // All manuscripts shown are already assigned to this copy editor from the API
    if (filter === 'all') return true;
    if (filter === 'pending') return !manuscript.copyEditingStage || manuscript.copyEditingStage === 'copy-editing';
    if (filter === 'in-progress') return manuscript.copyEditingStage === 'author-review' || manuscript.copyEditingStage === 'proofreading';
    if (filter === 'completed') return manuscript.copyEditingStage === 'ready-for-publication';
    return true;
  });

  const stats = {
    total: manuscripts.length,
    assigned: manuscripts.length, // All shown manuscripts are assigned to this copy editor
    pending: manuscripts.filter(m => !m.copyEditingStage || m.copyEditingStage === 'copy-editing').length,
    completed: manuscripts.filter(m => m.copyEditingStage === 'ready-for-publication').length,
    overdue: manuscripts.filter(m => 
      m.copyEditingDueDate && new Date(m.copyEditingDueDate) < new Date() && 
      m.copyEditingStage !== 'ready-for-publication'
    ).length
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
    <div className={styles.copyEditorDashboard}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Copy Editor Dashboard</h1>
            <p>Manage your assigned manuscripts in the copy editing workflow</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiFileText />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.total}</h3>
              <p>Assigned Manuscripts</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiClock />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.pending}</h3>
              <p>Pending Review</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiCheck />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.completed}</h3>
              <p>Completed</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiAlertCircle />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.overdue}</h3>
              <p>Overdue</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterButtons}>
            <button
              className={filter === 'all' ? styles.active : ''}
              onClick={() => setFilter('all')}
            >
              All My Manuscripts
            </button>
            <button
              className={filter === 'pending' ? styles.active : ''}
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button
              className={filter === 'in-progress' ? styles.active : ''}
              onClick={() => setFilter('in-progress')}
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
        </div>

        {/* Manuscripts Table */}
        <div className={styles.manuscriptsSection}>
          <div className={styles.sectionHeader}>
            <h2>My Assigned Manuscripts</h2>
          </div>

          {filteredManuscripts.length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText />
              <h3>No assigned manuscripts found</h3>
              <p>{manuscripts.length === 0 ? 'You have no manuscripts assigned to you yet.' : 'No manuscripts match your current filter.'}</p>
            </div>
          ) : (
            <div className={styles.manuscriptsTable}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Authors</th>
                    <th>Copy Editing Stage</th>
                    <th>Due Date</th>
                    <th>Status</th>
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
                          {manuscript.authors && manuscript.authors.length > 0 ? (
                            <>
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
                            </>
                          ) : (
                            <span className={styles.noAuthors}>No authors listed</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Stage">
                        <span className={`${styles.stageBadge} ${styles[getStageBadgeClass(manuscript.copyEditingStage)]}`}>
                          {getStageDisplayText(manuscript.copyEditingStage)}
                        </span>
                      </td>
                      <td data-label="Due Date">
                        {manuscript.copyEditingDueDate ? (
                          <span className={
                            new Date(manuscript.copyEditingDueDate) < new Date() 
                              ? styles.overdue 
                              : styles.dueDate
                          }>
                            {new Date(manuscript.copyEditingDueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className={styles.noDueDate}>Not set</span>
                        )}
                      </td>
                      <td data-label="Status">
                        <span className={`${styles.statusBadge} ${styles[manuscript.status.replace('-', '')]}`}>
                          {manuscript.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className={styles.actionButtons}>
                          <Link
                            href={`/dashboard/copy-editor/manuscripts/${manuscript._id}`}
                            className={styles.actionButton}
                            title="View Details"
                          >
                            <FiEye />
                          </Link>
                          <Link
                            href={`/dashboard/copy-editor/manuscripts/${manuscript._id}/edit`}
                            className={styles.actionButton}
                            title="Copy Edit"
                          >
                            <FiEdit3 />
                          </Link>
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
      </div>
    </div>
  );
}
