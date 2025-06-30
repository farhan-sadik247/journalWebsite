'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft,
  FiCheck,
  FiX,
  FiMessageSquare,
  FiDownload,
  FiFileText,
  FiUpload,
  FiTrash2
} from 'react-icons/fi';
import styles from './ReviewCopyEdit.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  status: string;
  copyEditingStage: string;
  copyEditingNotes: string;
  authors: any[];
  files: any[];
}

export default function ReviewCopyEditPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authorComments, setAuthorComments] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'revision-requested' | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
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
        
        // Check if user is authorized to review this manuscript
        const isAuthor = data.manuscript.authors.some((author: any) => 
          author.email === session?.user?.email || author.user?._id === session?.user?.id
        );
        const isSubmitter = data.manuscript.submittedBy._id === session?.user?.id;
        
        if (!isAuthor && !isSubmitter) {
          setError('You are not authorized to review this manuscript');
        }
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

  const handleSubmitReview = async () => {
    if (!manuscript || !approvalStatus) return;

    setIsSubmitting(true);
    try {
      // First, upload any files if there are any
      let uploadedFileUrls: any[] = [];
      if (uploadedFiles.length > 0) {
        setIsUploading(true);
        const formData = new FormData();
        uploadedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch(`/api/manuscripts/${manuscript._id}/author-review-files`, {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          uploadedFileUrls = uploadResult.files;
        } else {
          throw new Error('Failed to upload files');
        }
        setIsUploading(false);
      }

      // Then submit the review
      const response = await fetch(`/api/manuscripts/${manuscript._id}/author-copy-edit-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval: approvalStatus,
          comments: authorComments,
          files: uploadedFileUrls,
        }),
      });

      if (response.ok) {
        alert('Review submitted successfully!');
        router.push(`/dashboard/manuscripts/${manuscript._id}`);
      } else {
        throw new Error('Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} is not supported. Please upload PDF, DOC, DOCX, or TXT files.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
            <Link href="/dashboard/manuscripts" className="btn btn-primary">
              Back to Manuscripts
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
    <div className={styles.reviewCopyEdit}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <Link href={`/dashboard/manuscripts/${manuscript._id}`} className={styles.backButton}>
            <FiArrowLeft />
            Back to Manuscript
          </Link>
          
          <div className={styles.headerContent}>
            <h1>Review Copy-Edited Version</h1>
            <p>Please review the copy-edited version of your manuscript and provide feedback</p>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Main Content */}
          <div className={styles.mainContent}>
            {/* Manuscript Details */}
            <section className={styles.section}>
              <h2>
                <FiFileText />
                Copy-Edited Manuscript
              </h2>
              
              <div className={styles.manuscriptInfo}>
                <h3>{manuscript.title}</h3>
                <div className={styles.abstract}>
                  <h4>Abstract</h4>
                  <p>{manuscript.abstract}</p>
                </div>
                
                {manuscript.copyEditingNotes && (
                  <div className={styles.copyEditorNotes}>
                    <h4>Copy Editor Notes</h4>
                    <div className={styles.notesBox}>
                      {manuscript.copyEditingNotes}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Files */}
            {manuscript.files && manuscript.files.length > 0 && (
              <section className={styles.section}>
                <h2>
                  <FiDownload />
                  Manuscript Files
                </h2>
                
                <div className={styles.filesList}>
                  {manuscript.files.map((file: any, index: number) => (
                    <div key={index} className={styles.fileItem}>
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>{file.originalName}</span>
                        <span className={styles.fileType}>{file.type}</span>
                      </div>
                      <button 
                        onClick={() => window.open(file.url, '_blank')}
                        className="btn btn-outline btn-sm"
                      >
                        <FiDownload />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Review Form */}
            <section className={styles.section}>
              <h2>
                <FiMessageSquare />
                Your Review
              </h2>
              
              <div className={styles.reviewForm}>
                <div className={styles.approvalOptions}>
                  <h3>Approval Status</h3>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="approval"
                        value="approved"
                        checked={approvalStatus === 'approved'}
                        onChange={(e) => setApprovalStatus(e.target.value as 'approved')}
                      />
                      <FiCheck className={styles.approveIcon} />
                      <span>Approve - Ready for next stage</span>
                    </label>
                    
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="approval"
                        value="revision-requested"
                        checked={approvalStatus === 'revision-requested'}
                        onChange={(e) => setApprovalStatus(e.target.value as 'revision-requested')}
                      />
                      <FiX className={styles.revisionIcon} />
                      <span>Request revisions</span>
                    </label>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="comments">Comments (Optional)</label>
                  <textarea
                    id="comments"
                    value={authorComments}
                    onChange={(e) => setAuthorComments(e.target.value)}
                    className={styles.textarea}
                    rows={6}
                    placeholder="Provide any comments or suggestions for the copy editor..."
                  />
                </div>

                {/* File Upload Section */}
                <div className={styles.formGroup}>
                  <label>Annotated Files (Optional)</label>
                  <p className={styles.uploadDescription}>
                    Upload annotated manuscripts, comments, or feedback files. These will be sent to the editor and copy editor for review.
                  </p>
                  <div className={styles.fileUploadSection}>
                    <div className={styles.uploadArea}>
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        className={styles.fileInput}
                      />
                      <label htmlFor="file-upload" className={styles.uploadLabel}>
                        <FiUpload />
                        <span>Upload annotated manuscript or comments</span>
                        <small>PDF, DOC, DOCX, TXT files (max 10MB each)</small>
                      </label>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className={styles.fileList}>
                        <h4>Files to upload:</h4>
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className={styles.fileItem}>
                            <div className={styles.fileInfo}>
                              <FiFileText />
                              <span className={styles.fileName}>{file.name}</span>
                              <span className={styles.fileSize}>
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className={styles.removeFileBtn}
                              title="Remove file"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.formActions}>
                  <Link 
                    href={`/dashboard/manuscripts/${manuscript._id}`}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={handleSubmitReview}
                    className="btn btn-primary"
                    disabled={!approvalStatus || isSubmitting || isUploading}
                  >
                    {isUploading ? 'Uploading files...' : isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            <div className={styles.infoCard}>
              <h3>Review Guidelines</h3>
              <ul>
                <li>Check for any errors in grammar, spelling, or formatting</li>
                <li>Verify that your work is accurately represented</li>
                <li>Ensure technical terms are correctly used</li>
                <li>Review figure and table captions for accuracy</li>
                <li>Check that references are properly formatted</li>
                <li>Upload annotated files if you have specific feedback or corrections</li>
              </ul>
              
              <div className={styles.notificationInfo}>
                <h4>What happens after submission?</h4>
                <p>Your review and any uploaded files will be sent to the editor and copy editor. If you approve the manuscript, it will be ready for publication. If you request changes, the copy editor will address your feedback.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
