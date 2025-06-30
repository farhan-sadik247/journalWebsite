'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft,
  FiSave,
  FiDownload,
  FiEye,
  FiAlertCircle,
  FiFileText,
  FiMessageSquare
} from 'react-icons/fi';
import styles from './CopyEditorEdit.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{
    name: string;
    email: string;
    affiliation: string;
  }>;
  files: any[];
  copyEditingStage?: string;
  copyEditingNotes?: string;
}

export default function CopyEditorEditPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editing states
  const [editedTitle, setEditedTitle] = useState('');
  const [editedAbstract, setEditedAbstract] = useState('');
  const [copyEditingNotes, setCopyEditingNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        setManuscript(data.manuscript);
        setEditedTitle(data.manuscript.title);
        setEditedAbstract(data.manuscript.abstract);
        setCopyEditingNotes(data.manuscript.copyEditingNotes || '');
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

  const handleSave = async () => {
    if (!manuscript) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscript._id}/copy-edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedTitle,
          abstract: editedAbstract,
          copyEditingNotes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setManuscript(data.manuscript);
        setHasUnsavedChanges(false);
        alert('Changes saved successfully!');
      } else {
        throw new Error('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setHasUnsavedChanges(true);
    
    switch (field) {
      case 'title':
        setEditedTitle(value);
        break;
      case 'abstract':
        setEditedAbstract(value);
        break;
      case 'notes':
        setCopyEditingNotes(value);
        break;
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
    <div className={styles.copyEditorEdit}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <Link href={`/dashboard/copy-editor/manuscripts/${manuscript._id}`} className={styles.backButton}>
            <FiArrowLeft />
            Back to Manuscript Details
          </Link>
          
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1>Copy Editing: {manuscript.title}</h1>
              {hasUnsavedChanges && (
                <div className={styles.unsavedIndicator}>
                  <FiAlertCircle />
                  You have unsaved changes
                </div>
              )}
            </div>
            
            <div className={styles.headerActions}>
              <button 
                onClick={handleSave}
                className="btn btn-primary"
                disabled={isSaving || !hasUnsavedChanges}
              >
                <FiSave />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href={`/dashboard/copy-editor/manuscripts/${manuscript._id}`}
                className="btn btn-secondary"
              >
                <FiEye />
                Preview
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Main Editing Area */}
          <div className={styles.mainContent}>
            {/* Title Editor */}
            <section className={styles.section}>
              <h2>
                <FiFileText />
                Title
              </h2>
              <div className={styles.editorArea}>
                <textarea
                  value={editedTitle}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={styles.titleEditor}
                  placeholder="Enter manuscript title..."
                  rows={3}
                />
                <div className={styles.editorHints}>
                  <p>Guidelines for title editing:</p>
                  <ul>
                    <li>Ensure clarity and conciseness</li>
                    <li>Check for proper capitalization</li>
                    <li>Verify technical terms and spellings</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Abstract Editor */}
            <section className={styles.section}>
              <h2>
                <FiFileText />
                Abstract
              </h2>
              <div className={styles.editorArea}>
                <textarea
                  value={editedAbstract}
                  onChange={(e) => handleInputChange('abstract', e.target.value)}
                  className={styles.abstractEditor}
                  placeholder="Enter manuscript abstract..."
                  rows={12}
                />
                <div className={styles.editorHints}>
                  <p>Guidelines for abstract editing:</p>
                  <ul>
                    <li>Check for grammar and spelling errors</li>
                    <li>Ensure logical flow and structure</li>
                    <li>Verify consistency in terminology</li>
                    <li>Maintain the original meaning and intent</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Copy Editing Notes */}
            <section className={styles.section}>
              <h2>
                <FiMessageSquare />
                Copy Editing Notes
              </h2>
              <div className={styles.editorArea}>
                <textarea
                  value={copyEditingNotes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className={styles.notesEditor}
                  placeholder="Add notes about your copy editing changes..."
                  rows={6}
                />
                <div className={styles.editorHints}>
                  <p>Use this section to:</p>
                  <ul>
                    <li>Document significant changes made</li>
                    <li>Note any queries for the authors</li>
                    <li>Highlight areas that need author attention</li>
                    <li>Record style decisions and corrections</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Quick Actions */}
            <div className={styles.actionsCard}>
              <h3>Quick Actions</h3>
              <div className={styles.actionsList}>
                <button 
                  onClick={handleSave}
                  className={styles.actionItem}
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  <FiSave />
                  Save Changes
                </button>
                
                <Link
                  href={`/dashboard/copy-editor/manuscripts/${manuscript._id}`}
                  className={styles.actionItem}
                >
                  <FiEye />
                  Preview Changes
                </Link>
              </div>
            </div>

            {/* Authors */}
            <div className={styles.infoCard}>
              <h3>Authors</h3>
              <div className={styles.authorsList}>
                {manuscript.authors && manuscript.authors.length > 0 ? (
                  manuscript.authors.map((author, index) => (
                    <div key={index} className={styles.authorItem}>
                      <h4>{author.name}</h4>
                      <p>{author.affiliation}</p>
                      <span>{author.email}</span>
                    </div>
                  ))
                ) : (
                  <p>No authors listed</p>
                )}
              </div>
            </div>

            {/* Files */}
            {manuscript.files && manuscript.files.length > 0 && (
              <div className={styles.infoCard}>
                <h3>Original Files</h3>
                <div className={styles.filesList}>
                  {manuscript.files.map((file, index) => (
                    <div key={index} className={styles.fileItem}>
                      <div className={styles.fileInfo}>
                        <h4>{file.originalName}</h4>
                        <p>{file.type}</p>
                      </div>
                      <button 
                        onClick={() => downloadFile(file)}
                        className={styles.downloadButton}
                      >
                        <FiDownload />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Copy Editing Guidelines */}
            <div className={styles.guidelinesCard}>
              <h3>Copy Editing Guidelines</h3>
              <div className={styles.guidelinesList}>
                <div className={styles.guidelineItem}>
                  <h4>Language & Style</h4>
                  <p>Check grammar, spelling, punctuation, and consistency in style and terminology.</p>
                </div>
                <div className={styles.guidelineItem}>
                  <h4>Structure & Flow</h4>
                  <p>Ensure logical organization and smooth transitions between sections.</p>
                </div>
                <div className={styles.guidelineItem}>
                  <h4>Accuracy</h4>
                  <p>Verify factual information, citations, and references where possible.</p>
                </div>
                <div className={styles.guidelineItem}>
                  <h4>Clarity</h4>
                  <p>Improve readability while preserving the author&apos;s voice and intent.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
