'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './CopyEditingAssignment.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{ name: string; email: string }>;
  status: string;
  submissionDate: string;
  lastModified: string;
  assignedCopyEditor?: {
    _id: string;
    name: string;
    email: string;
  };
  copyEditingStage?: string;
  copyEditingDueDate?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  specializations?: string[];
}

export default function CopyEditingAssignmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [copyEditors, setCopyEditors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedManuscript, setSelectedManuscript] = useState<string>('');
  const [selectedCopyEditor, setSelectedCopyEditor] = useState<string>('');
  const [copyEditorDueDate, setCopyEditorDueDate] = useState<string>('');
  const [copyEditorNotes, setCopyEditorNotes] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check if user has admin access
    const hasAdminAccess = session.user.roles?.includes('admin') || 
                          session.user.currentActiveRole === 'admin' || 
                          session.user.role === 'admin';

    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch manuscripts
      const manuscriptsResponse = await fetch('/api/manuscripts?editor=true');
      const manuscriptsData = await manuscriptsResponse.json();
      setManuscripts(manuscriptsData.manuscripts || []);

      // Fetch copy editors
      const copyEditorsResponse = await fetch('/api/users?role=copy-editor');
      const copyEditorsData = await copyEditorsResponse.json();
      setCopyEditors(copyEditorsData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCopyEditor = async () => {
    if (!selectedManuscript || !selectedCopyEditor) return;

    setAssignmentLoading(true);
    try {
      const response = await fetch(`/api/manuscripts/${selectedManuscript}/assign-copy-editor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          copyEditorId: selectedCopyEditor,
          dueDate: copyEditorDueDate || null,
          notes: copyEditorNotes || null,
        }),
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedManuscript('');
        setSelectedCopyEditor('');
        setCopyEditorDueDate('');
        setCopyEditorNotes('');
        fetchData(); // Refresh data
        alert('Copy editor assigned successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error assigning copy editor:', error);
      alert('Error assigning copy editor');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return '#27ae60';
      case 'accepted-awaiting-copy-edit':
        return '#f39c12';
      case 'in-copy-editing':
        return '#3498db';
      case 'copy-editing-completed':
        return '#9b59b6';
      default:
        return '#95a5a6';
    }
  };

  const getAssignableManuscripts = () => {
    return manuscripts.filter(m => 
      ['accepted', 'accepted-awaiting-copy-edit', 'in-copy-editing'].includes(m.status)
    );
  };

  const getAssignedManuscripts = () => {
    return manuscripts.filter(m => m.assignedCopyEditor);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Copy Editor Assignment</h1>
        <p>Assign copy editors to accepted manuscripts ready for copy-editing and typesetting</p>
        <button
          className={styles.backButton}
          onClick={() => router.push('/dashboard/admin')}
        >
          ← Back to Admin Dashboard
        </button>
      </div>

      {/* Stats Cards */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h3>{getAssignableManuscripts().length}</h3>
          <p>Manuscripts Ready for Copy Editing</p>
        </div>
        <div className={styles.statCard}>
          <h3>{getAssignedManuscripts().length}</h3>
          <p>Copy Editors Assigned</p>
        </div>
        <div className={styles.statCard}>
          <h3>{copyEditors.length}</h3>
          <p>Available Copy Editors</p>
        </div>
      </div>

      {/* Assignment Form */}
      <div className={styles.assignmentSection}>
        <div className={styles.sectionHeader}>
          <h2>Assign Copy Editor</h2>
        </div>

        <div className={styles.assignForm}>
          <div className={styles.formGroup}>
            <label>Select Manuscript</label>
            <select
              value={selectedManuscript}
              onChange={(e) => setSelectedManuscript(e.target.value)}
              className={styles.select}
            >
              <option value="">Choose a manuscript...</option>
              {getAssignableManuscripts().map((manuscript) => (
                <option key={manuscript._id} value={manuscript._id}>
                  {manuscript.title} - {manuscript.authors.map(a => a.name).join(', ')} ({manuscript.status === 'published' ? 'Published' : manuscript.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Select Copy Editor</label>
            <select
              value={selectedCopyEditor}
              onChange={(e) => setSelectedCopyEditor(e.target.value)}
              className={styles.select}
            >
              <option value="">Choose a copy editor...</option>
              {copyEditors.map((editor) => (
                <option key={editor._id} value={editor._id}>
                  {editor.name} ({editor.email})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Due Date (Optional)</label>
            <input
              type="date"
              value={copyEditorDueDate}
              onChange={(e) => setCopyEditorDueDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Assignment Notes (Optional)</label>
            <textarea
              value={copyEditorNotes}
              onChange={(e) => setCopyEditorNotes(e.target.value)}
              placeholder="Enter any special instructions or notes for the copy editor..."
              rows={4}
              className={styles.textarea}
            />
          </div>

          <button
            className={styles.assignButton}
            onClick={() => setShowAssignModal(true)}
            disabled={!selectedManuscript || !selectedCopyEditor || assignmentLoading}
          >
            {assignmentLoading ? 'Assigning...' : 'Assign Copy Editor'}
          </button>
        </div>
      </div>

      {/* Assigned Copy Editors List */}
      <div className={styles.assignedSection}>
        <div className={styles.sectionHeader}>
          <h2>Currently Assigned Copy Editors</h2>
        </div>

        {getAssignedManuscripts().length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No copy editors assigned yet</h3>
            <p>Assign copy editors to accepted manuscripts to begin the copy-editing process.</p>
          </div>
        ) : (
          <div className={styles.assignmentsList}>
            {getAssignedManuscripts().map((manuscript) => (
              <div key={manuscript._id} className={styles.assignmentCard}>
                <div className={styles.manuscriptInfo}>
                  <h3>{manuscript.title}</h3>
                  <p>Authors: {manuscript.authors.map(a => a.name).join(', ')}</p>
                  <div className={styles.metadata}>
                    <span style={{ color: getStatusColor(manuscript.status) }}>
                      {manuscript.status === 'published' ? 'Published' : manuscript.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span>Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
                    {manuscript.copyEditingStage && (
                      <span>Stage: {manuscript.copyEditingStage}</span>
                    )}
                  </div>
                </div>
                <div className={styles.copyEditorInfo}>
                  <div className={styles.assignedTo}>
                    <strong>Copy Editor:</strong>
                    <p>{manuscript.assignedCopyEditor?.name}</p>
                    <p>{manuscript.assignedCopyEditor?.email}</p>
                  </div>
                  {manuscript.copyEditingDueDate && (
                    <div className={styles.dueDate}>
                      <strong>Due Date:</strong>
                      <p>{new Date(manuscript.copyEditingDueDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.viewButton}
                    onClick={() => router.push(`/dashboard/manuscripts/${manuscript._id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Confirmation Modal */}
      {showAssignModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Confirm Copy Editor Assignment</h3>
            <p>Are you sure you want to assign this copy editor to the selected manuscript?</p>
            <div className={styles.modalDetails}>
              <p><strong>Manuscript:</strong> {manuscripts.find(m => m._id === selectedManuscript)?.title}</p>
              <p><strong>Copy Editor:</strong> {copyEditors.find(e => e._id === selectedCopyEditor)?.name}</p>
              {copyEditorDueDate && <p><strong>Due Date:</strong> {new Date(copyEditorDueDate).toLocaleDateString()}</p>}
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowAssignModal(false)} disabled={assignmentLoading}>
                Cancel
              </button>
              <button onClick={handleAssignCopyEditor} disabled={assignmentLoading}>
                {assignmentLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
