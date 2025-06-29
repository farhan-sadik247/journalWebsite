'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import styles from './CorrectionsManagement.module.scss';

interface Correction {
  _id: string;
  manuscriptId: {
    _id: string;
    title: string;
    doi: string;
  };
  type: 'correction' | 'retraction' | 'expression-of-concern' | 'erratum';
  title: string;
  description: string;
  status: 'pending' | 'under-review' | 'approved' | 'rejected' | 'published';
  submittedBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  publishedDate?: string;
  doi?: string;
}

export default function CorrectionsManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    // Check if user has corrections management permissions
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      router.push('/dashboard');
      return;
    }

    fetchCorrections();
  }, [session, router, filter]);

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/corrections?filter=${filter}`);
      if (!response.ok) throw new Error('Failed to fetch corrections');
      
      const data = await response.json();
      setCorrections(data);
    } catch (error) {
      console.error('Error fetching corrections:', error);
      toast.error('Failed to load corrections');
    } finally {
      setLoading(false);
    }
  };

  const updateCorrectionStatus = async (correctionId: string, status: string, reviewNotes?: string) => {
    try {
      const response = await fetch(`/api/corrections/${correctionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, reviewNotes }),
      });

      if (!response.ok) throw new Error('Failed to update correction');

      toast.success('Correction status updated successfully');
      fetchCorrections();
    } catch (error) {
      console.error('Error updating correction:', error);
      toast.error('Failed to update correction status');
    }
  };

  const publishCorrection = async (correctionId: string) => {
    try {
      const response = await fetch(`/api/corrections/${correctionId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to publish correction');

      toast.success('Correction published successfully');
      fetchCorrections();
    } catch (error) {
      console.error('Error publishing correction:', error);
      toast.error('Failed to publish correction');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'correction':
        return '#3498db';
      case 'retraction':
        return '#e74c3c';
      case 'expression-of-concern':
        return '#f39c12';
      case 'erratum':
        return '#9b59b6';
      default:
        return '#95a5a6';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'under-review':
        return '#3498db';
      case 'approved':
        return '#27ae60';
      case 'rejected':
        return '#e74c3c';
      case 'published':
        return '#2ecc71';
      default:
        return '#95a5a6';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading corrections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Corrections & Retractions Management</h1>
        <Link href="/dashboard/corrections/new" className={styles.newBtn}>
          New Correction
        </Link>
      </div>

      <div className={styles.filters}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Corrections</option>
          <option value="pending">Pending Review</option>
          <option value="under-review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="correction">Corrections Only</option>
          <option value="retraction">Retractions Only</option>
        </select>
      </div>

      <div className={styles.correctionsList}>
        {corrections.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No corrections found</h3>
            <p>No corrections match the current filter criteria.</p>
          </div>
        ) : (
          corrections.map((correction) => (
            <div key={correction._id} className={styles.correctionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.titleSection}>
                  <h3>{correction.title}</h3>
                  <div className={styles.metadata}>
                    <span
                      className={styles.type}
                      style={{ backgroundColor: getTypeColor(correction.type) }}
                    >
                      {correction.type.replace('-', ' ')}
                    </span>
                    <span
                      className={styles.status}
                      style={{ backgroundColor: getStatusColor(correction.status) }}
                    >
                      {correction.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Link
                    href={`/dashboard/corrections/${correction._id}`}
                    className={styles.viewBtn}
                  >
                    View Details
                  </Link>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.manuscriptInfo}>
                  <h4>Related Article:</h4>
                  <p>{correction.manuscriptId.title}</p>
                  {correction.manuscriptId.doi && (
                    <small>DOI: {correction.manuscriptId.doi}</small>
                  )}
                </div>

                <div className={styles.description}>
                  <p>{correction.description}</p>
                </div>

                <div className={styles.submissionInfo}>
                  <small>
                    Submitted by {correction.submittedBy.name} on{' '}
                    {new Date(correction.createdAt).toLocaleDateString()}
                  </small>
                  {correction.publishedDate && (
                    <small>
                      Published on {new Date(correction.publishedDate).toLocaleDateString()}
                    </small>
                  )}
                </div>
              </div>

              <div className={styles.cardFooter}>
                {correction.status === 'pending' && (
                  <div className={styles.statusActions}>
                    <button
                      onClick={() => updateCorrectionStatus(correction._id, 'under-review')}
                      className={styles.reviewBtn}
                    >
                      Start Review
                    </button>
                    <button
                      onClick={() => updateCorrectionStatus(correction._id, 'rejected', 'Rejected after initial review')}
                      className={styles.rejectBtn}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {correction.status === 'under-review' && (
                  <div className={styles.statusActions}>
                    <button
                      onClick={() => updateCorrectionStatus(correction._id, 'approved')}
                      className={styles.approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateCorrectionStatus(correction._id, 'rejected', 'Rejected after review')}
                      className={styles.rejectBtn}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {correction.status === 'approved' && (
                  <div className={styles.statusActions}>
                    <button
                      onClick={() => publishCorrection(correction._id)}
                      className={styles.publishBtn}
                    >
                      Publish Correction
                    </button>
                  </div>
                )}

                {correction.status === 'published' && correction.doi && (
                  <div className={styles.doiInfo}>
                    <small>DOI: {correction.doi}</small>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
