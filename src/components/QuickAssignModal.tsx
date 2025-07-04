'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiPlus, FiMinus, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './QuickAssignModal.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{
    name: string;
    email: string;
    affiliation?: string;
  }>;
  status: string;
  submittedDate: string;
}

interface QuickAssignModalProps {
  issueId: string;
  issueTitle: string;
  currentManuscripts: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickAssignModal({
  issueId,
  issueTitle,
  currentManuscripts,
  isOpen,
  onClose,
  onSuccess
}: QuickAssignModalProps) {
  const { data: session } = useSession();
  const [availableManuscripts, setAvailableManuscripts] = useState<Manuscript[]>([]);
  const [assignedManuscripts, setAssignedManuscripts] = useState<Manuscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchManuscripts();
    }
  }, [isOpen, issueId]);

  const fetchManuscripts = async () => {
    try {
      const [allResponse, currentResponse] = await Promise.all([
        fetch('/api/manuscripts?copyEditingStage=author-approved&unassigned=true'),
        fetch(`/api/issues/${issueId}`)
      ]);

      if (allResponse.ok && currentResponse.ok) {
        const allData = await allResponse.json();
        const currentData = await currentResponse.json();
        
        const allManuscripts = allData.manuscripts || [];
        const currentIssueManuscriptIds = currentData.issue?.manuscripts || [];
        
        // Get currently assigned manuscripts
        const currentlyAssigned = await Promise.all(
          currentIssueManuscriptIds.map(async (id: string) => {
            const response = await fetch(`/api/manuscripts/${id}`);
            if (response.ok) {
              const data = await response.json();
              return data.manuscript;
            }
            return null;
          })
        );
        
        setAssignedManuscripts(currentlyAssigned.filter(Boolean));
        setAvailableManuscripts(allManuscripts);
      }
    } catch (error) {
      console.error('Error fetching manuscripts:', error);
      toast.error('Error loading manuscripts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = (manuscript: Manuscript) => {
    setAvailableManuscripts(prev => prev.filter(ms => ms._id !== manuscript._id));
    setAssignedManuscripts(prev => [...prev, manuscript]);
  };

  const handleUnassign = (manuscript: Manuscript) => {
    setAssignedManuscripts(prev => prev.filter(ms => ms._id !== manuscript._id));
    setAvailableManuscripts(prev => [...prev, manuscript]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/assign-manuscripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptIds: assignedManuscripts.map(ms => ms._id)
        }),
      });

      if (response.ok) {
        toast.success('Articles assigned successfully');
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to assign articles');
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Error saving assignments');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Assign Articles to {issueTitle}</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <FiX />
          </button>
        </div>

        <div className={styles.modalContent}>
          {isLoading ? (
            <div className={styles.loading}>Loading manuscripts...</div>
          ) : (
            <div className={styles.manuscriptColumns}>
              <div className={styles.column}>
                <h4>Available Articles ({availableManuscripts.length})</h4>
                <div className={styles.manuscriptList}>
                  {availableManuscripts.length === 0 ? (
                    <div className={styles.emptyState}>
                      No available &quot;Author Approved&quot; articles
                    </div>
                  ) : (
                    availableManuscripts.map((manuscript) => (
                      <div key={manuscript._id} className={styles.manuscriptCard}>
                        <div className={styles.manuscriptInfo}>
                          <h5>{manuscript.title}</h5>
                          <p>{manuscript.authors.map(a => a.name).join(', ')}</p>
                        </div>
                        <button
                          onClick={() => handleAssign(manuscript)}
                          className={styles.assignButton}
                        >
                          <FiPlus />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={styles.column}>
                <h4>Assigned Articles ({assignedManuscripts.length})</h4>
                <div className={styles.manuscriptList}>
                  {assignedManuscripts.length === 0 ? (
                    <div className={styles.emptyState}>
                      No articles assigned yet
                    </div>
                  ) : (
                    assignedManuscripts.map((manuscript) => (
                      <div key={manuscript._id} className={styles.manuscriptCard}>
                        <div className={styles.manuscriptInfo}>
                          <h5>{manuscript.title}</h5>
                          <p>{manuscript.authors.map(a => a.name).join(', ')}</p>
                        </div>
                        <button
                          onClick={() => handleUnassign(manuscript)}
                          className={styles.unassignButton}
                        >
                          <FiMinus />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            <FiSave />
            {isSaving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}
