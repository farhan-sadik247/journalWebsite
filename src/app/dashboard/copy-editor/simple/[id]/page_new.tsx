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
  FiUpload,
  FiFile,
  FiTrash2,
  FiSend
} from 'react-icons/fi';
import styles from './CopyEditorWork.module.scss';

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

interface FileToUpload {
  file: File;
  type: 'galley-proof' | 'typeset-manuscript' | 'final-pdf';
  description?: string;
}

export default function CopyEditorWorkPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Galley proof submission states
  const [showGalleyForm, setShowGalleyForm] = useState(false);
  const [galleyFiles, setGalleyFiles] = useState<FileToUpload[]>([]);
  const [galleyNotes, setGalleyNotes] = useState('');
  const [isSubmittingGalley, setIsSubmittingGalley] = useState(false);
  
  // Copy editor confirmation states
  const [showConfirmationForm, setShowConfirmationForm] = useState(false);
  const [reportToEditor, setReportToEditor] = useState('');
  const [finalNotes, setFinalNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

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
        setNotes(data.manuscript.copyEditorAssignment?.notes || '');
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

  const handleSaveNotes = async () => {
    if (!manuscript) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscript._id}/copy-edit-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes,
        }),
      });

      if (response.ok) {
        alert('Notes saved successfully!');
        await fetchManuscript(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      file,
      type: 'galley-proof' as const,
      description: ''
    }));
    setGalleyFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setGalleyFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileType = (index: number, type: 'galley-proof' | 'typeset-manuscript' | 'final-pdf') => {
    setGalleyFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, type } : file
    ));
  };

  const updateFileDescription = (index: number, description: string) => {
    setGalleyFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, description } : file
    ));
  };

  const uploadToStorage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'galley-proofs');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to storage');
    }

    return await response.json();
  };

  const handleSubmitGalleyProofs = async () => {
    if (!manuscript || galleyFiles.length === 0) return;

    setIsSubmittingGalley(true);
    try {
      // Upload files to storage
      const uploadPromises = galleyFiles.map(async ({ file, type, description }) => {
        const uploadResult = await uploadToStorage(file);
        return {
          filename: uploadResult.public_id,
          originalName: file.name,
          storageId: uploadResult.public_id, // Use storageId for new system
          cloudinaryId: uploadResult.public_id, // Keep for backward compatibility
          url: uploadResult.secure_url,
          type: type,
          description: description,
          uploadedAt: new Date().toISOString(),
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Submit galley proofs
      const response = await fetch(`/api/manuscripts/${manuscript._id}/submit-galley-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          galleyProofs: uploadedFiles,
          notes: galleyNotes,
        }),
      });

      if (response.ok) {
        alert('Galley proofs submitted successfully! The author will be notified.');
        setGalleyFiles([]);
        setGalleyNotes('');
        setShowGalleyForm(false);
        await fetchManuscript(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit galley proofs');
      }
    } catch (error) {
      console.error('Error submitting galley proofs:', error);
      alert('Failed to submit galley proofs. Please try again.');
    } finally {
      setIsSubmittingGalley(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!manuscript) return;
    
    if (!reportToEditor.trim()) {
      alert('Please provide a report to the editor.');
      return;
    }

    setIsConfirming(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscript._id}/copy-editor-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportToEditor: reportToEditor,
          finalNotes: finalNotes,
        }),
      });

      if (response.ok) {
        alert('Confirmation sent successfully! The editor will be notified.');
        setReportToEditor('');
        setFinalNotes('');
        setShowConfirmationForm(false);
        await fetchManuscript(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send confirmation');
      }
    } catch (error) {
      console.error('Error sending confirmation:', error);
      alert('Failed to send confirmation. Please try again.');
    } finally {
      setIsConfirming(false);
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
          <Link href="/dashboard/copy-editor/simple" className="btn btn-primary">
            Back to Assignments
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
          <Link href="/dashboard/copy-editor/simple" className="btn btn-primary">
            Back to Assignments
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is the assigned copy editor
  const userEmail = session?.user?.email;
  const isAssignedCopyEditor = manuscript.copyEditorAssignment?.copyEditorEmail === userEmail ||
                               manuscript.copyEditorAssignment?.copyEditorId?.email === userEmail;

  if (!isAssignedCopyEditor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2>Access Denied</h2>
          <p>You are not the assigned copy editor for this manuscript.</p>
          <Link href="/dashboard/copy-editor/simple" className="btn btn-primary">
            Back to Assignments
          </Link>
        </div>
      </div>
    );
  }

  const assignment = manuscript.copyEditorAssignment;
  const hasGalleyProofs = assignment?.galleyProofs && assignment.galleyProofs.length > 0;
  const authorApproved = manuscript.authorCopyEditReview?.approved;
  const copyEditorConfirmed = assignment?.copyEditorConfirmed;

  return (
    <div className={styles.workPage}>
      <div className="container">
        <h1>Copy Editor Workspace</h1>
        <p>Work on manuscript: {manuscript.title}</p>
        <p>Status: {assignment?.status || 'No assignment'}</p>
        
        {/* Manuscript Info */}
        <section>
          <h2>Manuscript Information</h2>
          <p><strong>Title:</strong> {manuscript.title}</p>
          <p><strong>Abstract:</strong> {manuscript.abstract}</p>
          <p><strong>Authors:</strong> {manuscript.authors.map(a => a.name).join(', ')}</p>
        </section>

        {/* Notes */}
        <section>
          <h2>Copy Editing Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your copy editing notes..."
            rows={6}
            style={{ width: '100%', padding: '10px' }}
          />
          <button onClick={handleSaveNotes} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Notes'}
          </button>
        </section>

        {/* Galley Proofs */}
        <section>
          <h2>Galley Proofs</h2>
          {hasGalleyProofs ? (
            <div>
              <h3>Submitted Galley Proofs</h3>
              {assignment?.galleyProofs?.map((proof, index) => (
                <div key={index}>
                  <p>{proof.originalName} ({proof.type})</p>
                  <a href={proof.url} target="_blank" rel="noopener noreferrer">View</a>
                </div>
              ))}
              
              {authorApproved && !copyEditorConfirmed && (
                <div>
                  <h3>Author Approved - Send Confirmation</h3>
                  <textarea
                    value={reportToEditor}
                    onChange={(e) => setReportToEditor(e.target.value)}
                    placeholder="Report to editor..."
                    rows={4}
                    style={{ width: '100%', padding: '10px' }}
                  />
                  <button onClick={handleConfirmCompletion} disabled={isConfirming}>
                    {isConfirming ? 'Sending...' : 'Send Confirmation'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <button onClick={() => setShowGalleyForm(true)}>
                Upload Galley Proofs
              </button>
              
              {showGalleyForm && (
                <div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                  <textarea
                    value={galleyNotes}
                    onChange={(e) => setGalleyNotes(e.target.value)}
                    placeholder="Notes to author..."
                    rows={4}
                    style={{ width: '100%', padding: '10px' }}
                  />
                  <button 
                    onClick={handleSubmitGalleyProofs} 
                    disabled={isSubmittingGalley || galleyFiles.length === 0}
                  >
                    {isSubmittingGalley ? 'Uploading...' : 'Submit Galley Proofs'}
                  </button>
                  <button onClick={() => setShowGalleyForm(false)}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
