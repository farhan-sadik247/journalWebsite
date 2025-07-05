'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiUsers, FiBook, FiPlus, FiMinus, FiSave, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './ArticleAssignment.module.scss';

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
}

interface Issue {
  _id: string;
  number: number;
  title: string;
  volume: Volume;
  manuscripts: string[];
}

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
  abstract: string;
  volume?: number;
  issue?: number;
}

export default function ArticleAssignmentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [availableManuscripts, setAvailableManuscripts] = useState<Manuscript[]>([]);
  const [assignedManuscripts, setAssignedManuscripts] = useState<Manuscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Check if user has permission to assign articles
  const userRoles = session?.user?.roles || [];
  const hasPermission = userRoles.includes('admin') || userRoles.includes('editor');

  useEffect(() => {
    if (!hasPermission && !isLoading) {
      router.push('/dashboard');
      return;
    }
    fetchInitialData();
  }, [hasPermission, router]);

  useEffect(() => {
    if (selectedVolume) {
      fetchIssues(selectedVolume);
    }
  }, [selectedVolume]);

  useEffect(() => {
    if (selectedIssue) {
      fetchManuscriptsForIssue(selectedIssue);
    }
  }, [selectedIssue]);

  const fetchInitialData = async () => {
    try {
      const [volumesResponse, manuscriptsResponse] = await Promise.all([
        fetch('/api/volumes'),
        fetch('/api/manuscripts?copyEditingStage=author-approved&editor=true')
      ]);

      if (volumesResponse.ok) {
        const volumesData = await volumesResponse.json();
        setVolumes(volumesData.volumes || []);
      }

      if (manuscriptsResponse.ok) {
        const manuscriptsData = await manuscriptsResponse.json();
        setManuscripts(manuscriptsData.manuscripts || []);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIssues = async (volumeId: string) => {
    try {
      const response = await fetch(`/api/volumes/${volumeId}/issues`);
      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('Error loading issues');
    }
  };

  const fetchManuscriptsForIssue = async (issueId: string) => {
    try {
      const [issueResponse, allManuscriptsResponse] = await Promise.all([
        fetch(`/api/issues/${issueId}`),
        fetch('/api/manuscripts?copyEditingStage=author-approved&editor=true')
      ]);

      if (issueResponse.ok && allManuscriptsResponse.ok) {
        const issueData = await issueResponse.json();
        const allManuscriptsData = await allManuscriptsResponse.json();
        
        const allAcceptedManuscripts = allManuscriptsData.manuscripts || [];
        const currentIssueManuscriptIds = issueData.issue?.manuscripts || [];
        
        // Get manuscripts currently assigned to this issue
        const currentlyAssigned = allAcceptedManuscripts.filter((ms: Manuscript) => 
          currentIssueManuscriptIds.includes(ms._id)
        );
        
        // Get available manuscripts (not assigned to any issue, including this one temporarily)
        const available = allAcceptedManuscripts.filter((ms: Manuscript) => 
          !currentIssueManuscriptIds.includes(ms._id) && 
          (!ms.issue || ms.issue === null)
        );

        setAssignedManuscripts(currentlyAssigned);
        setAvailableManuscripts(available);
      }
    } catch (error) {
      console.error('Error fetching manuscripts for issue:', error);
      toast.error('Error loading manuscripts');
    }
  };

  const handleAssignManuscript = (manuscript: Manuscript) => {
    setAvailableManuscripts(prev => prev.filter(ms => ms._id !== manuscript._id));
    setAssignedManuscripts(prev => [...prev, manuscript]);
  };

  const handleUnassignManuscript = (manuscript: Manuscript) => {
    setAssignedManuscripts(prev => prev.filter(ms => ms._id !== manuscript._id));
    setAvailableManuscripts(prev => [...prev, manuscript]);
  };

  const handleSaveAssignments = async () => {
    if (!selectedIssue) {
      toast.error('Please select an issue');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/issues/${selectedIssue}/assign-manuscripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptIds: assignedManuscripts.map(ms => ms._id),
          replaceAll: true // Complete replacement of assignments
        }),
      });

      if (response.ok) {
        toast.success('Article assignments saved successfully');
        // Refresh data
        fetchManuscriptsForIssue(selectedIssue);
      } else {
        toast.error('Failed to save assignments');
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Error saving assignments');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Access Denied</h2>
          <p>You need admin or editor permissions to assign articles to issues.</p>
          <button onClick={() => router.push('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button 
          onClick={() => router.back()}
          className={styles.backButton}
        >
          <FiArrowLeft />
          Back
        </button>
        <h1 className={styles.title}>
          <FiUsers className={styles.titleIcon} />
          Assign Articles to Issues
        </h1>
        <p className={styles.subtitle}>
          Assign &quot;Author Approved&quot; manuscripts to issues. Issues can be published with any number of articles (including just one).
        </p>
      </header>

      <div className={styles.selectionPanel}>
        <div className={styles.selectGroup}>
          <label htmlFor="volume">Volume:</label>
          <select
            id="volume"
            value={selectedVolume}
            onChange={(e) => {
              setSelectedVolume(e.target.value);
              setSelectedIssue('');
              setAssignedManuscripts([]);
              setAvailableManuscripts([]);
            }}
            className={styles.select}
          >
            <option value="">Select Volume</option>
            {volumes.map((volume) => (
              <option key={volume._id} value={volume._id}>
                Volume {volume.number} ({volume.year}) - {volume.title}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.selectGroup}>
          <label htmlFor="issue">Issue:</label>
          <select
            id="issue"
            value={selectedIssue}
            onChange={(e) => setSelectedIssue(e.target.value)}
            className={styles.select}
            disabled={!selectedVolume}
          >
            <option value="">Select Issue</option>
            {issues.map((issue) => (
              <option key={issue._id} value={issue._id}>
                Issue {issue.number} - {issue.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedIssue && (
        <div className={styles.assignmentPanel}>
          <div className={styles.manuscriptColumns}>
            <div className={styles.column}>
              <h3 className={styles.columnTitle}>
                <FiBook />
                Available Articles ({availableManuscripts.length})
              </h3>
              <div className={styles.manuscriptList}>
                {availableManuscripts.length === 0 ? (
                  <div className={styles.emptyState}>
                    No available articles to assign
                  </div>
                ) : (
                  availableManuscripts.map((manuscript) => (
                    <div key={manuscript._id} className={styles.manuscriptCard}>
                      <div className={styles.manuscriptInfo}>
                        <h4 className={styles.manuscriptTitle}>
                          {manuscript.title}
                        </h4>
                        <p className={styles.manuscriptAuthors}>
                          By: {manuscript.authors.map(a => a.name).join(', ')}
                        </p>
                        <p className={styles.manuscriptMeta}>
                          Submitted: {new Date(manuscript.submittedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAssignManuscript(manuscript)}
                        className={styles.assignButton}
                        title="Assign to issue"
                      >
                        <FiPlus />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.column}>
              <h3 className={styles.columnTitle}>
                <FiUsers />
                Assigned Articles ({assignedManuscripts.length})
              </h3>
              <div className={styles.manuscriptList}>
                {assignedManuscripts.length === 0 ? (
                  <div className={styles.emptyState}>
                    No articles assigned to this issue
                  </div>
                ) : (
                  assignedManuscripts.map((manuscript) => (
                    <div key={manuscript._id} className={styles.manuscriptCard}>
                      <div className={styles.manuscriptInfo}>
                        <h4 className={styles.manuscriptTitle}>
                          {manuscript.title}
                        </h4>
                        <p className={styles.manuscriptAuthors}>
                          By: {manuscript.authors.map(a => a.name).join(', ')}
                        </p>
                        <p className={styles.manuscriptMeta}>
                          Submitted: {new Date(manuscript.submittedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnassignManuscript(manuscript)}
                        className={styles.unassignButton}
                        title="Remove from issue"
                      >
                        <FiMinus />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              onClick={handleSaveAssignments}
              disabled={isSaving}
              className={styles.saveButton}
            >
              <FiSave />
              {isSaving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
