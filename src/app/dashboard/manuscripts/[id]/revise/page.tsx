'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import styles from './RevisionPage.module.scss';
import { FiArrowLeft, FiUpload, FiX, FiDownload, FiSend } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{
    name: string;
    email: string;
    affiliation: string;
  }>;
  status: string;
  submissionDate: string;
  category: string;
  keywords: string[];
  files: Array<{
    url: string;
    originalName: string;
    type: string;
  }>;
  timeline: Array<{
    event: string;
    description: string;
    date: string;
    metadata?: any;
  }>;
}

interface RevisionForm {
  responseToReviewers: string;
  summaryOfChanges: string;
  files: File[];
}

export default function RevisionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const manuscriptId = params?.id as string;

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<RevisionForm>({
    defaultValues: {
      responseToReviewers: '',
      summaryOfChanges: '',
      files: []
    }
  });

  useEffect(() => {
    console.log('Revision page useEffect - status:', status, 'manuscriptId:', manuscriptId);
    if (status === 'loading') return;
    
    if (!session) {
      console.log('No session, redirecting to signin');
      router.push('/auth/signin');
      return;
    }

    if (manuscriptId) {
      console.log('Fetching manuscript for ID:', manuscriptId);
      fetchManuscript();
    } else {
      console.log('No manuscript ID found');
    }
  }, [session, status, manuscriptId, router]);

  const fetchManuscript = async () => {
    try {
      console.log('Fetching manuscript with ID:', manuscriptId);
      const response = await fetch(`/api/manuscripts/${manuscriptId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Manuscript data received:', {
          id: data.manuscript._id,
          status: data.manuscript.status,
          title: data.manuscript.title?.substring(0, 50) + '...'
        });
        setManuscript(data.manuscript);
        
        // Check if user can submit revisions
        const validRevisionStatuses = ['revision-requested', 'major-revision-requested', 'minor-revision-requested'];
        if (!validRevisionStatuses.includes(data.manuscript.status)) {
          console.log('Invalid status for revision:', data.manuscript.status);
          router.push(`/dashboard/manuscripts/${manuscriptId}`);
        }
      } else {
        console.error('Failed to fetch manuscript:', response.status, response.statusText);
        router.push('/dashboard/manuscripts');
      }
    } catch (error) {
      console.error('Error fetching manuscript:', error);
      router.push('/dashboard/manuscripts');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    setDragActive(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: RevisionForm) => {
    if (!manuscript) return;

    if (uploadedFiles.length === 0) {
      alert('Please upload at least one revised file.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('responseToReviewers', data.responseToReviewers);
      formData.append('summaryOfChanges', data.summaryOfChanges);
      
      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/manuscripts/${manuscriptId}/revisions`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        router.push(`/dashboard/manuscripts/${manuscriptId}`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting revision:', error);
      alert('Error submitting revision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDecisionDetails = () => {
    if (!manuscript) return null;
    
    const decisionEvent = manuscript.timeline
      .filter(event => event.event === 'editorial-decision')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    return decisionEvent;
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!manuscript) {
    return <div className={styles.error}>Manuscript not found</div>;
  }

  const decisionDetails = getDecisionDetails();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => router.push(`/dashboard/manuscripts/${manuscriptId}`)}
        >
          <FiArrowLeft /> Back to Manuscript
        </button>
        <h1>Submit Revision</h1>
      </div>

      <div className={styles.content}>
        {/* Manuscript Info */}
        <div className={styles.manuscriptSection}>
          <h2>Manuscript Information</h2>
          <div className={styles.manuscriptCard}>
            <h3>{manuscript.title}</h3>
            <p className={styles.authors}>
              by {manuscript.authors.map(a => a.name).join(', ')}
            </p>
            <div className={styles.metadata}>
              <span>Category: {manuscript.category}</span>
              <span>Original Submission: {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
              <span>Status: {manuscript.status}</span>
            </div>
          </div>
        </div>

        {/* Decision Details */}
        {decisionDetails && (
          <div className={styles.decisionSection}>
            <h2>Editorial Decision</h2>
            <div className={styles.decisionCard}>
              <div className={styles.decisionHeader}>
                <span className={styles.decision}>
                  {decisionDetails.metadata?.decision?.replace('-', ' ') || 'Revision Requested'}
                </span>
                <span className={styles.date}>
                  {new Date(decisionDetails.date).toLocaleDateString()}
                </span>
              </div>
              
              {decisionDetails.metadata?.editorComments && (
                <div className={styles.comments}>
                  <h4>Editor Comments:</h4>
                  <p>{decisionDetails.metadata.editorComments}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revision Form */}
        <div className={styles.revisionSection}>
          <h2>Revision Submission</h2>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.revisionForm}>
            <div className={styles.formGroup}>
              <label>Response to Reviewers *</label>
              <textarea
                {...register('responseToReviewers', { 
                  required: 'Response to reviewers is required' 
                })}
                rows={8}
                placeholder="Provide a detailed response to each reviewer comment, explaining how you addressed their concerns or why you chose not to make suggested changes..."
              />
              {errors.responseToReviewers && (
                <span className={styles.error}>{errors.responseToReviewers.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Summary of Changes *</label>
              <textarea
                {...register('summaryOfChanges', { 
                  required: 'Summary of changes is required' 
                })}
                rows={6}
                placeholder="Provide a clear summary of all changes made to the manuscript, including page numbers and line numbers where applicable..."
              />
              {errors.summaryOfChanges && (
                <span className={styles.error}>{errors.summaryOfChanges.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Upload Revised Files *</label>
              <div 
                {...getRootProps()} 
                className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
              >
                <input {...getInputProps()} />
                <div className={styles.dropzoneContent}>
                  <FiUpload size={32} />
                  <p>Drag and drop files here, or click to select</p>
                  <small>Supported formats: PDF, DOC, DOCX, Images (max 10MB each)</small>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className={styles.filesList}>
                  <h4>Uploaded Files:</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className={styles.fileItem}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className={styles.removeButton}
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.formActions}>
              <button 
                type="button" 
                onClick={() => router.push(`/dashboard/manuscripts/${manuscriptId}`)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting || uploadedFiles.length === 0}
              >
                <FiSend />
                {submitting ? 'Submitting...' : 'Submit Revision'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
