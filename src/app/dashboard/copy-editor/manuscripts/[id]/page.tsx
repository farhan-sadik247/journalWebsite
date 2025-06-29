'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  FiEdit3,
  FiCheck,
  FiSend
} from 'react-icons/fi';
import styles from './CopyEditorManuscriptDetail.module.scss';

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
  copyEditingStage?: string;
  productionStage?: string;
  assignedCopyEditor?: string;
  copyEditingDueDate?: string;
  copyEditingNotes?: string;
  typesettingNotes?: string;
  proofreadingNotes?: string;
}

export default function CopyEditorManuscriptDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStageUpdateModal, setShowStageUpdateModal] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== 'copy-editor' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (session && params.id) {
      fetchManuscript();
    }
  }, [session, status, router, params.id]);

  const fetchManuscript = async () => {
    try {
      const response = await fetch(`/api/manuscripts/${params.id}`);
      if (response.ok) {
        const data = await response.json();
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

  const handleStageUpdate = async () => {
    if (!newStage || !manuscript) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscript._id}/copy-editing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: newStage,
          notes: notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setManuscript(data.manuscript);
        setShowStageUpdateModal(false);
        setNewStage('');
        setNotes('');
      } else {
        throw new Error('Failed to update stage');
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Failed to update stage. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadFile = (file: any) => {
    const filename = file.originalName || file.filename.split('/').pop();
    window.open(`/api/manuscripts/${params.id}/download/${filename}`, '_blank');
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
            <Link href="/dashboard/copy-editor" className="btn btn-primary">
              Back to Copy Editor Dashboard
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
    <div className={styles.copyEditorManuscriptDetail}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <Link href="/dashboard/copy-editor" className={styles.backButton}>
            <FiArrowLeft />
            Back to Copy Editor Dashboard
          </Link>
          
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1>{manuscript.title}</h1>
              <div className={styles.statusBadges}>
                <span className={`status-badge status-${manuscript.status.replace('-', '')}`}>
                  {manuscript.status.replace('-', ' ')}
                </span>
                <span className={`${styles.stageBadge} ${styles[getStageBadgeClass(manuscript.copyEditingStage)]}`}>
                  {getStageDisplayText(manuscript.copyEditingStage)}
                </span>
              </div>
            </div>
            
            <div className={styles.headerActions}>
              <button 
                onClick={() => setShowStageUpdateModal(true)}
                className="btn btn-primary"
              >
                <FiEdit3 />
                Update Stage
              </button>
              <Link
                href={`/dashboard/copy-editor/manuscripts/${manuscript._id}/edit`}
                className="btn btn-secondary"
              >
                <FiFileText />
                Copy Edit
              </Link>
              {manuscript.files.length > 0 && (
                <button 
                  onClick={() => window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank')}
                  className="btn btn-outline"
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
            {/* Production Progress */}
            <section className={styles.section}>
              <h2>
                <FiClock />
                Production Progress
              </h2>
              <div className={styles.progressTracker}>
                <div className={`${styles.progressStep} ${manuscript.copyEditingStage === 'copy-editing' ? styles.active : manuscript.copyEditingStage ? styles.completed : ''}`}>
                  <div className={styles.stepIcon}>
                    <FiEdit3 />
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Copy Editing</h4>
                    <p>Language, grammar, and style editing</p>
                  </div>
                </div>

                <div className={`${styles.progressStep} ${manuscript.copyEditingStage === 'author-review' ? styles.active : (manuscript.copyEditingStage === 'proofreading' || manuscript.copyEditingStage === 'typesetting' || manuscript.copyEditingStage === 'final-review' || manuscript.copyEditingStage === 'ready-for-publication') ? styles.completed : ''}`}>
                  <div className={styles.stepIcon}>
                    <FiUser />
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Author Review</h4>
                    <p>Authors review copy-edited version</p>
                  </div>
                </div>

                <div className={`${styles.progressStep} ${manuscript.copyEditingStage === 'proofreading' ? styles.active : (manuscript.copyEditingStage === 'typesetting' || manuscript.copyEditingStage === 'final-review' || manuscript.copyEditingStage === 'ready-for-publication') ? styles.completed : ''}`}>
                  <div className={styles.stepIcon}>
                    <FiBookOpen />
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Proofreading</h4>
                    <p>Final text corrections and formatting</p>
                  </div>
                </div>

                <div className={`${styles.progressStep} ${manuscript.copyEditingStage === 'typesetting' ? styles.active : (manuscript.copyEditingStage === 'final-review' || manuscript.copyEditingStage === 'ready-for-publication') ? styles.completed : ''}`}>
                  <div className={styles.stepIcon}>
                    <FiFileText />
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Typesetting</h4>
                    <p>Layout and design formatting</p>
                  </div>
                </div>

                <div className={`${styles.progressStep} ${manuscript.copyEditingStage === 'final-review' ? styles.active : manuscript.copyEditingStage === 'ready-for-publication' ? styles.completed : ''}`}>
                  <div className={styles.stepIcon}>
                    <FiCheck />
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Final Review</h4>
                    <p>Quality assurance and final checks</p>
                  </div>
                </div>

                <div className={`${styles.progressStep} ${manuscript.copyEditingStage === 'ready-for-publication' ? styles.completed : ''}`}>
                  <div className={styles.stepIcon}>
                    <FiSend />
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Ready for Publication</h4>
                    <p>Ready to be published online</p>
                  </div>
                </div>
              </div>
            </section>

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

            {/* Production Notes */}
            <section className={styles.section}>
              <h2>Production Notes</h2>
              <div className={styles.notesGrid}>
                {manuscript.copyEditingNotes && (
                  <div className={styles.noteCard}>
                    <h4>Copy Editing Notes</h4>
                    <p>{manuscript.copyEditingNotes}</p>
                  </div>
                )}
                
                {manuscript.typesettingNotes && (
                  <div className={styles.noteCard}>
                    <h4>Typesetting Notes</h4>
                    <p>{manuscript.typesettingNotes}</p>
                  </div>
                )}
                
                {manuscript.proofreadingNotes && (
                  <div className={styles.noteCard}>
                    <h4>Proofreading Notes</h4>
                    <p>{manuscript.proofreadingNotes}</p>
                  </div>
                )}
                
                {!manuscript.copyEditingNotes && !manuscript.typesettingNotes && !manuscript.proofreadingNotes && (
                  <div className={styles.emptyNotes}>
                    <p>No production notes available yet.</p>
                  </div>
                )}
              </div>
            </section>
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
              
              {manuscript.copyEditingDueDate && (
                <div className={styles.infoItem}>
                  <FiClock />
                  <div>
                    <span className={styles.label}>Copy Editing Due</span>
                    <span className={styles.value}>
                      {new Date(manuscript.copyEditingDueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className={styles.actionsCard}>
              <h3>Quick Actions</h3>
              <div className={styles.actionsList}>
                <button 
                  onClick={() => setShowStageUpdateModal(true)}
                  className={styles.actionItem}
                >
                  <FiEdit3 />
                  Update Production Stage
                </button>
                
                <Link
                  href={`/dashboard/copy-editor/manuscripts/${manuscript._id}/edit`}
                  className={styles.actionItem}
                >
                  <FiFileText />
                  Open Copy Editor
                </Link>
                
                <button
                  onClick={() => window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank')}
                  className={styles.actionItem}
                >
                  <FiDownload />
                  Download All Files
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Update Modal */}
      {showStageUpdateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowStageUpdateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Update Production Stage</h3>
              <button 
                className={styles.closeModal} 
                onClick={() => setShowStageUpdateModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="stage">New Stage</label>
                <select
                  id="stage"
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className={styles.formControl}
                >
                  <option value="">Select stage...</option>
                  <option value="copy-editing">Copy Editing</option>
                  <option value="author-review">Author Review</option>
                  <option value="proofreading">Proofreading</option>
                  <option value="typesetting">Typesetting</option>
                  <option value="final-review">Final Review</option>
                  <option value="ready-for-publication">Ready for Publication</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={styles.formControl}
                  rows={4}
                  placeholder="Add any notes about this stage update..."
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowStageUpdateModal(false)}
                  className="btn btn-secondary"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStageUpdate}
                  className="btn btn-primary"
                  disabled={!newStage || isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Stage'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
