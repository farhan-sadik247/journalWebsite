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
  FiSend,
  FiUpload
} from 'react-icons/fi';
import styles from './CopyEditorManuscriptDetail.module.scss';
import CopyEditReviewForm, { CopyEditReviewData } from '../../components/CopyEditReviewForm';

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
  copyEditWorkingFiles?: any[];
  copyEditReview?: {
    copyEditorId?: string;
    copyEditorName?: string;
    copyEditorEmail?: string;
    comments?: string;
    galleyProofUrl?: string;
    galleyProofFilename?: string;
    completionStatus?: 'completed' | 'needs-revision';
    submittedAt?: string;
  };
}

export default function CopyEditorManuscriptDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [selectedWorkingFiles, setSelectedWorkingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Use multi-role logic to check copy editor access
    const userRole = session?.user?.currentActiveRole || session?.user?.role || 'author';
    const userRoles = session?.user?.roles || [userRole];
    const isCopyEditor = userRole === 'copy-editor' || userRoles.includes('copy-editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!isCopyEditor && !isAdmin) {
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
        console.log('Fetched manuscript data:', data.manuscript); // Debug log
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

  const handleReviewSubmission = async (reviewData: CopyEditReviewData) => {
    if (!manuscript) return;

    setIsSubmittingReview(true);
    try {
      // First upload working files if any are selected
      if (selectedWorkingFiles.length > 0) {
        const workingFilesFormData = new FormData();
        selectedWorkingFiles.forEach((file) => {
          workingFilesFormData.append('workingFiles', file);
        });

        const workingFilesResponse = await fetch(`/api/manuscripts/${manuscript._id}/copy-edit-files`, {
          method: 'POST',
          body: workingFilesFormData,
        });

        if (!workingFilesResponse.ok) {
          const errorData = await workingFilesResponse.json();
          throw new Error(`Failed to upload working files: ${errorData.error || 'Unknown error'}`);
        }
      }

      // Then submit the review
      const formData = new FormData();
      formData.append('comments', reviewData.comments);
      formData.append('completionStatus', reviewData.completionStatus);
      
      if (reviewData.galleyProofFile) {
        formData.append('galleyProofFile', reviewData.galleyProofFile);
      }

      const response = await fetch(`/api/manuscripts/${manuscript._id}/copy-edit-review`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setManuscript(data.manuscript);
        setShowReviewForm(false);
        setSelectedWorkingFiles([]); // Clear selected files
        
        const workingFilesMessage = selectedWorkingFiles.length > 0 
          ? ` and ${selectedWorkingFiles.length} working file(s)` 
          : '';
        alert(`Copy editing review${workingFilesMessage} submitted successfully!`);
        
        // Optionally redirect back to dashboard
        // router.push('/dashboard/copy-editor');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(`Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const downloadFile = (file: any) => {
    const filename = file.originalName || file.filename.split('/').pop();
    window.open(`/api/manuscripts/${params.id}/download/${filename}`, '_blank');
  };

  const handleWorkingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Store files locally, they will be uploaded when review is submitted
    setSelectedWorkingFiles(Array.from(files));
  };

  const downloadWorkingFile = (file: any) => {
    window.open(`/api/manuscripts/${params.id}/copy-edit-files/${file.filename}`, '_blank');
  };

  const removeSelectedFile = (indexToRemove: number) => {
    const newFiles = selectedWorkingFiles.filter((_, index) => index !== indexToRemove);
    setSelectedWorkingFiles(newFiles);
    
    // Clear the file input if no files are selected
    if (newFiles.length === 0) {
      const fileInput = document.getElementById('workingFileUpload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
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
                  {manuscript.status === 'published' ? 'Published' : manuscript.status.replace('-', ' ')}
                </span>
                <span className={`${styles.stageBadge} ${styles[getStageBadgeClass(manuscript.copyEditingStage)]}`}>
                  {getStageDisplayText(manuscript.copyEditingStage)}
                </span>
              </div>
            </div>
            
            <div className={styles.headerActions}>
              <button 
                onClick={() => setShowReviewForm(true)}
                className="btn btn-success"
                disabled={manuscript.copyEditingStage === 'ready-for-publication' || (manuscript.copyEditReview && !!manuscript.copyEditReview.submittedAt)}
              >
                <FiSend />
                {manuscript.copyEditReview && manuscript.copyEditReview.submittedAt ? 'Review Submitted' : 'Submit Review'}
              </button>
              <Link
                href={`/dashboard/copy-editor/manuscripts/${manuscript._id}/edit`}
                className="btn btn-secondary"
              >
                <FiFileText />
                Copy Edit
              </Link>
              {manuscript.files && manuscript.files.length > 0 && (
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
                {manuscript.keywords && manuscript.keywords.length > 0 ? (
                  manuscript.keywords.map((keyword, index) => (
                    <span key={index} className={styles.keyword}>
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className={styles.noKeywords}>No keywords specified</p>
                )}
              </div>
            </section>

            {/* Authors */}
            <section className={styles.section}>
              <h2>
                <FiUser />
                Authors
              </h2>
              <div className={styles.authorsList}>
                {manuscript.authors && manuscript.authors.length > 0 ? (
                  manuscript.authors.map((author, index) => (
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
                  ))
                ) : (
                  <p className={styles.noAuthors}>No authors listed</p>
                )}
              </div>
            </section>

            {/* Files */}
            {manuscript.files && manuscript.files.length > 0 && (
              <section className={styles.section}>
                <h2>
                  <FiDownload />
                  Files
                </h2>
                <div className={styles.filesList}>
                  {manuscript.files && manuscript.files.length > 0 ? (
                    manuscript.files.map((file, index) => (
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
                    ))
                  ) : (
                    <p>No files available</p>
                  )}
                </div>
              </section>
            )}

            {/* Copy Editor Working Files */}
            <section className={styles.section}>
              <h2>
                <FiUpload />
                Copy Editor Working Files
              </h2>
              <p className={styles.sectionDescription}>
                Select working files to upload with your review submission. Files will be uploaded to cloud storage when you submit your copy editing review.
              </p>
              
              <div className={styles.workingFilesUpload}>
                <input
                  type="file"
                  id="workingFileUpload"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.rtf"
                  onChange={handleWorkingFileUpload}
                  className={styles.hiddenFileInput}
                />
                <label htmlFor="workingFileUpload" className={styles.uploadButton}>
                  <FiUpload />
                  Select Working Files
                </label>
                <p className={styles.uploadHint}>
                  Supported formats: PDF, DOC, DOCX, TXT, RTF
                </p>
              </div>

              {/* Show selected files (not yet uploaded) */}
              {selectedWorkingFiles.length > 0 && (
                <div className={styles.workingFilesList}>
                  <h4>Selected Files (Ready for Upload)</h4>
                  <div className={styles.selectedFilesNotice}>
                    <p>These files will be uploaded when you submit your review.</p>
                  </div>
                  {selectedWorkingFiles.map((file: File, index: number) => (
                    <div key={index} className={styles.workingFileCard}>
                      <div className={styles.fileInfo}>
                        <FiFileText className={styles.fileIcon} />
                        <div>
                          <h5>{file.name}</h5>
                          <p>Selected • {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <div className={styles.fileActions}>
                        <button 
                          onClick={() => removeSelectedFile(index)}
                          className="btn btn-danger btn-sm"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show already uploaded files */}
              {manuscript.copyEditWorkingFiles && manuscript.copyEditWorkingFiles.length > 0 && (
                <div className={styles.workingFilesList}>
                  <h4>Previously Uploaded Working Files</h4>
                  {manuscript.copyEditWorkingFiles.map((file: any, index: number) => (
                    <div key={index} className={styles.workingFileCard}>
                      <div className={styles.fileInfo}>
                        <FiFileText className={styles.fileIcon} />
                        <div>
                          <h5>{file.originalName}</h5>
                          <p>{file.uploadedBy} • {new Date(file.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className={styles.fileActions}>
                        <button 
                          onClick={() => downloadWorkingFile(file)}
                          className="btn btn-secondary btn-sm"
                        >
                          <FiDownload />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

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

            {/* Copy Edit Review (if submitted) */}
            {manuscript.copyEditReview && manuscript.copyEditReview.submittedAt && (
              <section className={styles.section}>
                <h2 style={{ color: 'white' }}>
                  <FiCheck />
                  Copy Editing Review
                </h2>
                <div className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewInfo}>
                      <h4 style={{ color: 'white' }}>Review by {manuscript.copyEditReview.copyEditorName}</h4>
                      <p className={styles.reviewDate} style={{ color: 'white' }}>
                        Submitted on {new Date(manuscript.copyEditReview.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles[manuscript.copyEditReview.completionStatus || 'completed']}`}>
                      {manuscript.copyEditReview.completionStatus === 'needs-revision' ? 'Needs Revision' : 'Completed'}
                    </span>
                  </div>
                  
                  <div className={styles.reviewContent}>
                    <h5 style={{ color: 'white' }}>Comments:</h5>
                    <p className={styles.reviewComments} style={{ color: 'white' }}>{manuscript.copyEditReview.comments}</p>
                    
                    {manuscript.copyEditReview.galleyProofUrl && (
                      <div className={styles.galleyProof}>
                        <h5 style={{ color: 'white' }}>Galley Proof:</h5>
                        <a 
                          href={manuscript.copyEditReview.galleyProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                        >
                          <FiDownload />
                          Download {manuscript.copyEditReview.galleyProofFilename || 'Galley Proof'}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
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

      {/* Review Submission Form */}
      {showReviewForm && manuscript && (
        <CopyEditReviewForm 
          manuscriptId={manuscript._id}
          manuscriptTitle={manuscript.title}
          onSubmit={handleReviewSubmission}
          onCancel={() => setShowReviewForm(false)}
          isSubmitting={isSubmittingReview}
        />
      )}
    </div>
  );
}
