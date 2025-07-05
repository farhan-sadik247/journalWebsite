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
  volume?: number;
  issue?: number;
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
  const [preservedManuscriptIds, setPreservedManuscriptIds] = useState<string[]>([]); // Track all assigned IDs
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
        fetch('/api/manuscripts?copyEditingStage=author-approved&editor=true'),
        fetch(`/api/issues/${issueId}`)
      ]);

      if (allResponse.ok && currentResponse.ok) {
        const allData = await allResponse.json();
        const currentData = await currentResponse.json();
        
        const allManuscripts = allData.manuscripts || [];
        const currentIssueManuscriptIds = currentData.issue?.manuscripts || [];
        
        // Store all current manuscript IDs to preserve them
        setPreservedManuscriptIds(currentIssueManuscriptIds);
        
        console.log('🔍 QuickAssignModal - fetchManuscripts DEBUG:', {
          'Step 1 - currentIssueManuscriptIds': currentIssueManuscriptIds,
          'Step 2 - allManuscriptsCount': allManuscripts.length,
          'Step 3 - allManuscriptIds': allManuscripts.map((ms: Manuscript) => ms._id),
          'Step 4 - PRESERVED IDS SET TO': currentIssueManuscriptIds
        });
        
        // Try to get details for currently assigned manuscripts from the allManuscripts list
        const currentlyAssigned = currentIssueManuscriptIds
          .map((id: string) => allManuscripts.find((ms: Manuscript) => ms._id === id))
          .filter(Boolean); // Remove any undefined entries
        
        console.log('QuickAssignModal - Currently assigned manuscript lookup:', {
          requestedIds: currentIssueManuscriptIds,
          foundInAllManuscripts: currentlyAssigned.length,
          foundManuscripts: currentlyAssigned.map((ms: Manuscript) => ({ id: ms._id, title: ms.title }))
        });
        
        // For manuscripts we couldn't find details for, create placeholder entries
        const missingIds = currentIssueManuscriptIds.filter((id: string) => 
          !allManuscripts.find((ms: Manuscript) => ms._id === id)
        );
        
        console.log('QuickAssignModal - Missing manuscripts:', {
          missingIds,
          missingCount: missingIds.length
        });
        
        // Try to fetch missing manuscripts individually
        const fetchedMissingManuscripts: Manuscript[] = [];
        for (const missingId of missingIds) {
          try {
            console.log('Fetching individual manuscript:', missingId);
            const individualResponse = await fetch(`/api/manuscripts/${missingId}`);
            if (individualResponse.ok) {
              const individualData = await individualResponse.json();
              fetchedMissingManuscripts.push(individualData.manuscript);
              console.log('Successfully fetched:', individualData.manuscript.title);
            } else {
              console.warn('Failed to fetch manuscript:', missingId, 'Status:', individualResponse.status);
            }
          } catch (error) {
            console.error('Error fetching individual manuscript:', missingId, error);
          }
        }
        
        // Create placeholders for manuscripts we still couldn't fetch
        const stillMissingIds = missingIds.filter((id: string) => 
          !fetchedMissingManuscripts.find((ms: Manuscript) => ms._id === id)
        );
        const placeholderManuscripts = stillMissingIds.map((id: string) => ({
          _id: id,
          title: 'Previously assigned manuscript (details not accessible)',
          authors: [{ name: 'Unknown', email: '' }],
          status: 'assigned',
          submittedDate: ''
        }));
        
        const allAssignedManuscripts = [...currentlyAssigned, ...fetchedMissingManuscripts, ...placeholderManuscripts];
        
        console.log('QuickAssignModal - Final assigned manuscripts:', {
          totalAssigned: allAssignedManuscripts.length,
          fromAllList: currentlyAssigned.length,
          fetchedIndividually: fetchedMissingManuscripts.length,
          placeholders: placeholderManuscripts.length,
          manuscripts: allAssignedManuscripts.map((ms: Manuscript) => ({ id: ms._id, title: ms.title }))
        });
        
        // Filter available manuscripts - exclude those already assigned to this issue
        // Don't rely on manuscript.issue field as it might be out of sync
        const available = allManuscripts.filter((ms: Manuscript) => 
          !currentIssueManuscriptIds.includes(ms._id)
        );
        
        setAssignedManuscripts(allAssignedManuscripts);
        setAvailableManuscripts(available);
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
    // Only allow unassigning if this manuscript is not in the preserved list
    // or explicitly confirm the action
    setAssignedManuscripts(prev => prev.filter(ms => ms._id !== manuscript._id));
    setAvailableManuscripts(prev => [...prev, manuscript]);
    
    // If this was a preserved manuscript, remove it from preserved list too
    setPreservedManuscriptIds(prev => prev.filter(id => id !== manuscript._id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('🔍 QuickAssignModal - handleSave DEBUG:', {
        'Step 1 - preservedManuscriptIds': preservedManuscriptIds,
        'Step 2 - assignedManuscripts': assignedManuscripts.map(ms => ({ id: ms._id, title: ms.title })),
        'Step 3 - assignedManuscriptIds': assignedManuscripts.map(ms => ms._id)
      });

      // Combine preserved manuscript IDs with currently assigned manuscripts
      // This ensures we never lose existing assignments even if we couldn't fetch their details
      const allAssignedIds = [
        ...preservedManuscriptIds, // Always include original assignments
        ...assignedManuscripts.map(ms => ms._id) // Add current UI selections
      ];
      
      console.log('🔍 Step 4 - allAssignedIds (before dedup):', allAssignedIds);
      
      // Remove duplicates
      const uniqueAssignedIds = Array.from(new Set(allAssignedIds));
      
      console.log('🔍 Step 5 - FINAL uniqueAssignedIds:', uniqueAssignedIds);
      console.log('🚀 SENDING TO API:', { manuscriptIds: uniqueAssignedIds });
      
      const response = await fetch(`/api/issues/${issueId}/assign-manuscripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptIds: uniqueAssignedIds,
          replaceAll: true // Complete replacement for quick assign modal
        }),
      });
      
      if (response.ok) {
        const responseData = await response.json();
        toast.success('Articles assigned successfully');
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Assignment API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        toast.error(`Failed to assign articles: ${errorData.details || errorData.error || 'Unknown error'}`);
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
