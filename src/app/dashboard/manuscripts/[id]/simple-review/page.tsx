'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiFileText, 
  FiUser, 
  FiCalendar, 
  FiCheck,
  FiArrowLeft,
  FiClock,
  FiMessageSquare,
  FiDownload,
  FiFile
} from 'react-icons/fi';
import styles from './SimpleAuthorReview.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  status: string;
  category: string;
  submissionDate: string;
  authors: Array<{
    name: string;
    email: string;
    affiliation: string;
  }>;
  copyEditingStage?: string;
  copyEditingNotes?: string;
  copyEditingCompletedDate?: string;
  // Updated to use new assignment structure
  copyEditorAssignment?: {
    copyEditorId?: {
      _id: string;
      name: string;
      email: string;
    };
    copyEditorName?: string;
    copyEditorEmail?: string;
    assignedBy?: {
      _id: string;
      name: string;
      email: string;
    };
    assignedByName?: string;
    assignedDate?: string;
    dueDate?: string;
    status?: 'assigned' | 'in-progress' | 'completed' | 'approved-by-author';
    notes?: string;
    completedDate?: string;
    authorApprovalDate?: string;
    // Galley proof files submitted by copy editor
    galleyProofs?: Array<{
      filename: string;
      originalName: string;
      cloudinaryId: string;
      url: string;
      type: 'galley-proof' | 'typeset-manuscript' | 'final-pdf';
      uploadedAt: string;
      description?: string;
    }>;
    galleyProofSubmittedAt?: string;
    galleyProofNotes?: string;
    copyEditorConfirmed?: boolean;
    copyEditorConfirmationDate?: string;
    copyEditorConfirmationNotes?: string;
  };
  authorCopyEditReview?: {
    approved: boolean;
    reviewedAt: string;
    reviewedBy: string;
    comments?: string;
  };
}

export default function SimpleAuthorReviewPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [comments, setComments] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);

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

  const handleApproval = async () => {
    if (!manuscript) return;

    setIsApproving(true);
    try {
      console.log('Submitting approval for manuscript:', manuscript._id);
      const response = await fetch(`/api/manuscripts/${manuscript._id}/author-approve-copy-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: true,
          comments: comments || 'Approved by author'
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Success result:', result);
        alert('Manuscript approved successfully! It will now proceed to production.');
        await fetchManuscript(); // Refresh data
        router.push(`/dashboard/manuscripts/${manuscript._id}`);
      } else {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          // If not JSON, get text
          const errorText = await response.text();
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to approve manuscript');
      }
    } catch (error) {
      console.error('Error approving manuscript:', error);
      alert(`Failed to approve manuscript: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRevisionRequest = async () => {
    if (!manuscript || !comments.trim()) {
      alert('Please provide comments for the revision request.');
      return;
    }

    setIsRequesting(true);
    try {
      console.log('Submitting revision request for manuscript:', manuscript._id);
      const response = await fetch(`/api/manuscripts/${manuscript._id}/author-approve-copy-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: false,
          comments: comments
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Success result:', result);
        alert('Revision request sent successfully. The copy editor will be notified.');
        await fetchManuscript(); // Refresh data
        setShowRevisionForm(false);
        setComments('');
      } else {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          // If not JSON, get text
          const errorText = await response.text();
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to send revision request');
      }
    } catch (error) {
      console.error('Error sending revision request:', error);
      alert(`Failed to send revision request: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsRequesting(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2>Error</h2>
          <p>{error}</p>
          <Link href="/dashboard/manuscripts" className="btn btn-primary">
            Back to Manuscripts
          </Link>
        </div>
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2>Manuscript not found</h2>
          <Link href="/dashboard/manuscripts" className="btn btn-primary">
            Back to Manuscripts
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is the author
  const isAuthor = manuscript.authors.some(author => author.email === session?.user?.email);
  if (!isAuthor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2>Access Denied</h2>
          <p>You are not authorized to review this manuscript.</p>
          <Link href="/dashboard/manuscripts" className="btn btn-primary">
            Back to Manuscripts
          </Link>
        </div>
      </div>
    );
  }

  // Allow multiple valid stages for author review
  const validStagesForAuthorReview = ['author-review', 'copy-editing-complete', 'awaiting-author-review'];
  const currentStage = manuscript.copyEditingStage || '';
  const hasGalleyProofs = manuscript.copyEditorAssignment?.galleyProofs && manuscript.copyEditorAssignment.galleyProofs.length > 0;
  const galleyProofsSubmitted = manuscript.copyEditorAssignment?.galleyProofSubmittedAt;
  const canApprove = validStagesForAuthorReview.includes(currentStage) && 
                     hasGalleyProofs && 
                     galleyProofsSubmitted && 
                     !manuscript.authorCopyEditReview?.approved;
  const isAlreadyApproved = manuscript.authorCopyEditReview?.approved;

  console.log('Approval check:', {
    copyEditingStage: manuscript.copyEditingStage,
    validStages: validStagesForAuthorReview,
    isValidStage: validStagesForAuthorReview.includes(currentStage),
    alreadyApproved: manuscript.authorCopyEditReview?.approved,
    canApprove,
    isAlreadyApproved
  });

  return (
    <div className={styles.reviewPage}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.breadcrumb}>
              <Link href={`/dashboard/manuscripts/${manuscript._id}`}>
                <FiArrowLeft />
                Back to Manuscript
              </Link>
            </div>
            <h1>Review Copy-Edited Manuscript</h1>
            <div className={styles.statusInfo}>
              {isAlreadyApproved ? (
                <div className={styles.approvedBadge}>
                  <FiCheck />
                  Approved for Production
                </div>
              ) : canApprove ? (
                <div className={styles.pendingBadge}>
                  <FiClock />
                  Awaiting Your Approval
                </div>
              ) : (
                <div className={styles.infoBadge}>
                  <FiFileText />
                  Review Complete
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Instructions */}
          <section className={styles.instructions}>
            <h2>Review Instructions</h2>
            <div className={styles.instructionContent}>
              <p>
                Your manuscript has been copy-edited and is ready for your final review. 
                Please carefully review the edited content below and approve it if you&apos;re satisfied with the changes.
              </p>
              <ul>
                <li>Check that the meaning and intent of your work has been preserved</li>
                <li>Verify that all technical terms and citations are correct</li>
                <li>Ensure that the edited text maintains your academic voice</li>
                <li>Once approved, the manuscript will proceed to production</li>
              </ul>
            </div>
          </section>

          {/* Copy Editor Info */}
          {manuscript.copyEditorAssignment?.copyEditorId && (
            <section className={styles.section}>
              <h2>
                <FiUser />
                Copy Editor Information
              </h2>
              <div className={styles.copyEditorInfo}>
                <div className={styles.editorCard}>
                  <div className={styles.editorName}>
                    {manuscript.copyEditorAssignment.copyEditorId.name || manuscript.copyEditorAssignment.copyEditorName}
                  </div>
                  <div className={styles.editorEmail}>
                    {manuscript.copyEditorAssignment.copyEditorId.email || manuscript.copyEditorAssignment.copyEditorEmail}
                  </div>
                  {manuscript.copyEditorAssignment.completedDate && (
                    <div className={styles.completionDate}>
                      <FiCalendar />
                      Completed: {new Date(manuscript.copyEditorAssignment.completedDate).toLocaleDateString()}
                    </div>
                  )}
                  {manuscript.copyEditorAssignment.assignedDate && (
                    <div className={styles.completionDate}>
                      <FiCalendar />
                      Assigned: {new Date(manuscript.copyEditorAssignment.assignedDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Copy Editing Notes */}
          {manuscript.copyEditorAssignment?.notes && (
            <section className={styles.section}>
              <h2>
                <FiMessageSquare />
                Copy Editor Notes
              </h2>
              <div className={styles.notesContent}>
                <p>{manuscript.copyEditorAssignment.notes}</p>
              </div>
            </section>
          )}

          {/* Galley Proofs Section */}
          {manuscript.copyEditorAssignment?.galleyProofs && manuscript.copyEditorAssignment.galleyProofs.length > 0 && (
            <section className={styles.section}>
              <h2>
                <FiFile />
                Galley Proofs & Edited Files
              </h2>
              <div className={styles.galleyProofsSection}>
                {manuscript.copyEditorAssignment.galleyProofNotes && (
                  <div className={styles.galleyProofNotes}>
                    <h4>Copy Editor&apos;s Notes:</h4>
                    <p>{manuscript.copyEditorAssignment.galleyProofNotes}</p>
                  </div>
                )}
                <div className={styles.galleyProofsList}>
                  {manuscript.copyEditorAssignment.galleyProofs.map((proof, index) => (
                    <div key={index} className={styles.galleyProofItem}>
                      <div className={styles.proofInfo}>
                        <div className={styles.proofIcon}>
                          <FiFile />
                        </div>
                        <div className={styles.proofDetails}>
                          <div className={styles.proofName}>{proof.originalName}</div>
                          <div className={styles.proofMeta}>
                            <span className={styles.proofType}>
                              {proof.type === 'galley-proof' ? 'Galley Proof' : 
                               proof.type === 'typeset-manuscript' ? 'Typeset Manuscript' : 'Final PDF'}
                            </span>
                            {proof.uploadedAt && (
                              <span className={styles.proofDate}>
                                {new Date(proof.uploadedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {proof.description && (
                            <div className={styles.proofDescription}>{proof.description}</div>
                          )}
                        </div>
                      </div>
                      <div className={styles.proofActions}>
                        <a
                          href={proof.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-small"
                        >
                          <FiDownload />
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                {manuscript.copyEditorAssignment.galleyProofSubmittedAt && (
                  <div className={styles.submissionInfo}>
                    <FiCheck />
                    Galley proofs submitted on {new Date(manuscript.copyEditorAssignment.galleyProofSubmittedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Edited Content */}
          <section className={styles.section}>
            <h2>
              <FiFileText />
              Edited Manuscript Content
            </h2>
            
            <div className={styles.contentSection}>
              <h3>Title</h3>
              <div className={styles.editedContent}>
                {manuscript.title}
              </div>
            </div>

            <div className={styles.contentSection}>
              <h3>Abstract</h3>
              <div className={styles.editedContent}>
                {manuscript.abstract}
              </div>
            </div>
          </section>

          {/* Manuscript Info */}
          <section className={styles.section}>
            <h2>Manuscript Information</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Category:</span>
                <span className={styles.value}>{manuscript.category}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Submitted:</span>
                <span className={styles.value}>
                  {new Date(manuscript.submissionDate).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Authors:</span>
                <span className={styles.value}>
                  {manuscript.authors.map(a => a.name).join(', ')}
                </span>
              </div>
            </div>
          </section>

          {/* Approval Actions */}
          <section className={styles.approvalSection}>
            {isAlreadyApproved ? (
              <div className={styles.approvedMessage}>
                <FiCheck />
                <div>
                  <h3>Manuscript Approved</h3>
                  <p>
                    You approved this manuscript on{' '}
                    {manuscript.authorCopyEditReview?.reviewedAt && 
                      new Date(manuscript.authorCopyEditReview.reviewedAt).toLocaleDateString()}.
                    It has been sent to production.
                  </p>
                  {manuscript.authorCopyEditReview?.comments && (
                    <div className={styles.approvalComments}>
                      <strong>Your Comments:</strong> {manuscript.authorCopyEditReview.comments}
                    </div>
                  )}
                </div>
              </div>
            ) : canApprove ? (
              <div className={styles.approvalActions}>
                <h3>Final Approval</h3>
                <p>
                  Please review the galley proofs and copy-edited content above. Once you approve, 
                  the copy editor will be notified to send a confirmation report to the editor for publication.
                </p>
                
                {/* Comments Field */}
                <div className={styles.commentsField}>
                  <label htmlFor="comments">Comments (optional):</label>
                  <textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any comments about the copy editing..."
                    rows={3}
                    className={styles.commentsTextarea}
                  />
                </div>

                <div className={styles.actionButtons}>
                  {/* Approve Button */}
                  <button
                    onClick={handleApproval}
                    disabled={isApproving || isRequesting}
                    className="btn btn-success btn-large"
                  >
                    <FiCheck />
                    {isApproving ? 'Approving...' : 'Approve for Production'}
                  </button>

                  {/* Request Revision Button */}
                  {!showRevisionForm ? (
                    <button
                      onClick={() => setShowRevisionForm(true)}
                      disabled={isApproving || isRequesting}
                      className="btn btn-warning btn-large"
                    >
                      <FiMessageSquare />
                      Request Revisions
                    </button>
                  ) : (
                    <div className={styles.revisionForm}>
                      <h4>Request Revisions</h4>
                      <p>Please specify what changes you would like the copy editor to make:</p>
                      <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Describe the revisions needed..."
                        rows={4}
                        className={styles.commentsTextarea}
                        required
                      />
                      <div className={styles.revisionButtons}>
                        <button
                          onClick={handleRevisionRequest}
                          disabled={isRequesting || !comments.trim()}
                          className="btn btn-warning"
                        >
                          {isRequesting ? 'Sending...' : 'Send Revision Request'}
                        </button>
                        <button
                          onClick={() => {
                            setShowRevisionForm(false);
                            setComments('');
                          }}
                          disabled={isRequesting}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.notReadyMessage}>
                <FiClock />
                <div>
                  <h3>Not Ready for Review</h3>
                  <p>
                    {!hasGalleyProofs || !galleyProofsSubmitted 
                      ? 'The copy editor has not yet submitted the galley proofs for your review.'
                      : 'This manuscript is not yet ready for your review.'}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
