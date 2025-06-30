'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiFileText, 
  FiClock, 
  FiCheck, 
  FiEdit3, 
  FiSend,
  FiUser,
  FiCalendar 
} from 'react-icons/fi';
import styles from './SimpleCopyEditorDashboard.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  status: string;
  category: string;
  submissionDate: string;
  lastModified: string;
  authors: Array<{
    name: string;
    email: string;
    affiliation: string;
  }>;
  copyEditingStage?: string;
  assignment: {
    assignedDate: string;
    dueDate?: string;
    status: string;
    notes?: string;
    assignedBy: {
      name: string;
      email: string;
    };
    completedDate?: string;
    authorApprovalDate?: string;
  };
  copyEditReview?: any;
  authorCopyEditReview?: {
    approved: boolean;
    reviewedAt: string;
  };
}

export default function SimpleCopyEditorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'completed'>('all');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user?.role !== 'copy-editor') {
      router.push('/dashboard');
      return;
    }

    fetchManuscripts();
  }, [session, status, router]);

  const fetchManuscripts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/copy-editor/manuscripts');
      if (response.ok) {
        const data = await response.json();
        setManuscripts(data.manuscripts || []);
      } else {
        console.error('Failed to fetch manuscripts');
      }
    } catch (error) {
      console.error('Error fetching manuscripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStageDisplay = (assignmentStatus?: string) => {
    switch (assignmentStatus) {
      case 'assigned':
        return { text: 'Assignment Received', color: 'orange', icon: FiFileText };
      case 'in-progress':
        return { text: 'Copy Editing in Progress', color: 'blue', icon: FiEdit3 };
      case 'completed':
        return { text: 'Awaiting Author Review', color: 'purple', icon: FiClock };
      case 'approved-by-author':
        return { text: 'Approved by Author', color: 'green', icon: FiCheck };
      default:
        return { text: 'Not Started', color: 'gray', icon: FiFileText };
    }
  };

  const filteredManuscripts = manuscripts.filter(manuscript => {
    if (filter === 'all') return true;
    if (filter === 'assigned') return ['assigned', 'in-progress'].includes(manuscript.assignment.status);
    if (filter === 'completed') return ['completed', 'approved-by-author'].includes(manuscript.assignment.status);
    return true;
  });

  const stats = {
    total: manuscripts.length,
    assigned: manuscripts.filter(m => ['assigned', 'in-progress'].includes(m.assignment.status)).length,
    completed: manuscripts.filter(m => ['completed', 'approved-by-author'].includes(m.assignment.status)).length,
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Copy Editor Dashboard</h1>
            <p>Simplified copy-editing workflow</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiFileText />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>Total Assigned</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiEdit3 />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.assigned}</div>
              <div className={styles.statLabel}>In Progress</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiCheck />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.completed}</div>
              <div className={styles.statLabel}>Completed</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button
            className={`${styles.filterTab} ${filter === 'assigned' ? styles.active : ''}`}
            onClick={() => setFilter('assigned')}
          >
            In Progress ({stats.assigned})
          </button>
          <button
            className={`${styles.filterTab} ${filter === 'completed' ? styles.active : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({stats.completed})
          </button>
        </div>

        {/* Manuscripts List */}
        <div className={styles.manuscriptsList}>
          {filteredManuscripts.length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText />
              <h3>No manuscripts found</h3>
              <p>
                {filter === 'all' 
                  ? 'No manuscripts have been assigned to you yet.'
                  : `No manuscripts in ${filter} status.`
                }
              </p>
            </div>
          ) : (
            filteredManuscripts.map((manuscript) => {
              const stage = getStageDisplay(manuscript.assignment.status);
              const StageIcon = stage.icon;
              
              return (
                <div key={manuscript._id} className={styles.manuscriptCard}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.manuscriptTitle}>
                      <Link href={`/dashboard/copy-editor/simple/${manuscript._id}`}>
                        {manuscript.title}
                      </Link>
                    </h3>
                    <div className={`${styles.stageTag} ${styles[stage.color]}`}>
                      <StageIcon />
                      {stage.text}
                    </div>
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.manuscriptInfo}>
                      <div className={styles.infoItem}>
                        <FiUser />
                        <span>Authors: {manuscript.authors.map(a => a.name).join(', ')}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <FiCalendar />
                        <span>Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
                      </div>
                      {manuscript.assignment.assignedDate && (
                        <div className={styles.infoItem}>
                          <FiClock />
                          <span>Assigned: {new Date(manuscript.assignment.assignedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {manuscript.assignment.dueDate && (
                        <div className={styles.infoItem}>
                          <FiClock />
                          <span>Due: {new Date(manuscript.assignment.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      <Link
                        href={`/dashboard/copy-editor/simple/${manuscript._id}`}
                        className="btn btn-primary"
                      >
                        <FiEdit3 />
                        {['assigned', 'in-progress'].includes(manuscript.assignment.status) ? 'Continue Editing' : 'View Details'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
