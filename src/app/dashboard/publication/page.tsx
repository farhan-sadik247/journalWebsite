'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiBook,
  FiCalendar,
  FiGlobe,
  FiHash,
  FiEdit3,
  FiEye,
  FiDownload,
  FiPlus,
  FiArchive,
  FiBell
} from 'react-icons/fi';
import styles from './Publication.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  status: string;
  submissionDate: string;
  lastModified: string;
  authors: Array<{
    name: string;
    email: string;
  }>;
  copyEditingStage?: string;
  doi?: string;
  volume?: number;
  issue?: number;
  pages?: string;
  publishedDate?: string;
  category: string;
  latestManuscriptFiles?: Array<{
    originalName: string;
    filename: string;
    url: string;
    type: string;
    uploadedBy: string;
    uploadedAt: string;
    size: number;
    mimeType: string;
  }>;
  authorCopyEditReview?: {
    decision: 'approved' | 'changes-requested';
    comments: string;
    submittedAt: string;
    files: Array<{
      originalName: string;
      filename: string;
      url: string;
      uploadedAt: string;
    }>;
  };
}

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  description: string;
  coverImage?: string;
  status: string;
  publishedDate?: string;
  manuscripts: string[];
}

interface Issue {
  _id: string;
  number: number;
  title: string;
  description: string;
  isPublished: boolean;
  publishedDate?: string;
  manuscripts: string[];
  volume?: {
    _id: string;
    number: number;
    year: number;
    title: string;
  };
}

export default function PublicationDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available-for-issue');
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [availableIssues, setAvailableIssues] = useState<Issue[]>([]);
  const [publishedIssues, setPublishedIssues] = useState<{ volume: Volume; issue: any }[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [allVolumesData, setAllVolumesData] = useState<{ volume: Volume; issues: any[] }[]>([]);
  const [availableForPublishing, setAvailableForPublishing] = useState<Issue[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Handle assignment to issue
  const handleAssignToIssue = async (manuscriptId: string, manuscriptTitle: string) => {
    if (!selectedIssue) {
      alert('Please select an issue first');
      return;
    }

    if (!confirm(`Are you sure you want to assign "${manuscriptTitle}" to the selected issue?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/issues/${selectedIssue}/assign-manuscripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptIds: [manuscriptId],
          replaceAll: false // Add to existing assignments
        }),
      });

      if (response.ok) {
        alert(`✅ Manuscript "${manuscriptTitle}" has been assigned to the issue successfully!`);
        fetchData();
      } else {
        const error = await response.json();
        alert(`❌ Error assigning manuscript: ${error.error}`);
      }
    } catch (error) {
      console.error('Error assigning manuscript:', error);
      alert('❌ Failed to assign manuscript');
    }
  };

  // Handle delete issue
  const handleDeleteIssue = async (issueId: string, issueTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${issueTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert(`✅ Issue "${issueTitle}" has been deleted successfully!`);
        fetchData();
      } else {
        const error = await response.json();
        alert(`❌ Error deleting issue: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting issue:', error);
      alert('❌ Failed to delete issue');
    }
  };

  // Handle publish issue
  const handlePublishIssue = async (issueId: string, issueTitle: string) => {
    if (!confirm(`Are you sure you want to publish "${issueTitle}"? This will make it visible on the website.`)) {
      return;
    }

    setIsPublishing(issueId);

    try {
      const response = await fetch(`/api/issues/${issueId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert(`✅ Issue "${issueTitle}" has been published successfully!`);
        fetchData();
      } else {
        const error = await response.json();
        alert(`❌ Error publishing issue: ${error.error}`);
      }
    } catch (error) {
      console.error('Error publishing issue:', error);
      alert('❌ Failed to publish issue');
    } finally {
      setIsPublishing(null);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Check if user has editor or admin role in either role or roles array
    const userRole = session?.user?.role;
    const userRoles = session?.user?.roles || [];
    const isEditor = userRole === 'editor' || userRoles.includes('editor');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!isEditor && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (session) {
      fetchData();
    }
  }, [session, status, router]);

  useEffect(() => {
    handleNotificationCheck();
  }, [manuscripts, showNotification]);

  const fetchData = async () => {
    try {
      console.log('🔍 Fetching publication dashboard data...');
      
      const [manuscriptsRes, volumesRes, issuesRes] = await Promise.all([
        fetch('/api/manuscripts/publication-dashboard'),
        fetch('/api/volumes'),
        fetch('/api/issues')
      ]);

      console.log('📡 API Response Status:', {
        manuscripts: manuscriptsRes.status,
        volumes: volumesRes.status,
        issues: issuesRes.status
      });

      let volumesData: any = null;
      let issuesData: any = null;

      if (manuscriptsRes.ok) {
        const manuscriptsData = await manuscriptsRes.json();
        console.log('✅ Fetched publication dashboard data:', manuscriptsData);
        setManuscripts(manuscriptsData.manuscripts || []);
      }

      if (volumesRes.ok) {
        volumesData = await volumesRes.json();
        console.log('✅ Fetched volumes data:', volumesData);
        setVolumes(volumesData.volumes || []);
      }

      if (issuesRes.ok) {
        issuesData = await issuesRes.json();
        console.log('✅ Fetched issues data:', issuesData);
        setIssues(issuesData.issues || []);
        
        // Separate available and published issues
        const available = issuesData.issues.filter((issue: any) => !issue.isPublished);
        const published = issuesData.issues.filter((issue: any) => issue.isPublished);
        
        // Filter issues that are ready for publishing (unpublished but have manuscripts)
        const readyForPublishing = available.filter((issue: any) => 
          issue.manuscripts && issue.manuscripts.length > 0
        );
        
        setAvailableIssues(available);
        setAvailableForPublishing(readyForPublishing);
        
        // Group published issues by volume and year
        const publishedByVolume = published.map((issue: any) => ({
          volume: issue.volume,
          issue: issue
        }));
        
        setPublishedIssues(publishedByVolume);

        // Prepare all volumes data for the new tab (using already fetched data)
        if (volumesData && issuesData) {
          console.log('📊 Preparing All Volumes Data...');
          console.log('📊 Volumes:', volumesData.volumes);
          console.log('📊 Issues:', issuesData.issues);
          
          // Let's see the first volume and issue in detail
          if (volumesData.volumes.length > 0) {
            console.log('📊 First Volume detailed:', JSON.stringify(volumesData.volumes[0], null, 2));
          }
          if (issuesData.issues.length > 0) {
            console.log('📊 First Issue detailed:', JSON.stringify(issuesData.issues[0], null, 2));
          }
          
          const allVolumes = volumesData.volumes.map((volume: Volume) => ({
            volume,
            issues: issuesData.issues.filter((issue: any) => {
              const volumeId = volume._id?.toString();
              const issueVolumeId = issue.volume?._id?.toString();
              console.log(`🔍 Checking issue ${issue._id} volume ID "${issueVolumeId}" against volume "${volumeId}"`);
              console.log(`🔍 Issue object:`, issue);
              console.log(`🔍 Volume object:`, volume);
              return issueVolumeId === volumeId;
            })
          }));
          
          console.log('📊 All Volumes processed:', allVolumes);
          
          // Sort by year and volume number (descending)
          allVolumes.sort((a: { volume: Volume; issues: any[] }, b: { volume: Volume; issues: any[] }) => {
            if (a.volume.year !== b.volume.year) {
              return b.volume.year - a.volume.year;
            }
            return b.volume.number - a.volume.number;
          });
          
          setAllVolumesData(allVolumes);
          setTotalPages(Math.ceil(allVolumes.length / itemsPerPage));
          
          console.log('📊 Final All Volumes Data set:', allVolumes);
          console.log('📊 Total pages:', Math.ceil(allVolumes.length / itemsPerPage));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching publication data:', error);
    } finally {
      setIsLoading(false);
      handleNotificationCheck();
    }
  };

  const handleNotificationCheck = () => {
    const availableCount = manuscripts.filter(m => 
      m.copyEditingStage === 'author-approved' && 
      !m.volume && 
      !m.issue
    ).length;
    
    if (availableCount > 0 && !showNotification) {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  };

  const getStatusDisplayText = (status: string) => {
    const statusMap: Record<string, string> = {
      'in-production': 'In Production',
      'ready-for-publication': 'Ready for Publication',
      'published': 'Published',
      'draft': 'Draft',
      'scheduled': 'Scheduled'
    };
    return statusMap[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    const classMap: Record<string, string> = {
      'in-production': 'production',
      'ready-for-publication': 'ready',
      'published': 'published',
      'draft': 'draft',
      'scheduled': 'scheduled'
    };
    return classMap[status] || 'default';
  };

  const filteredManuscripts = manuscripts.filter(manuscript => {
    if (activeTab === 'available-for-issue') {
      return manuscript.copyEditingStage === 'author-approved' && !manuscript.volume && !manuscript.issue;
    }
    if (activeTab === 'published-issues') {
      return false; // This tab shows issues, not manuscripts
    }
    return true;
  });

  const stats = {
    availableForIssue: manuscripts.filter(m => 
      m.copyEditingStage === 'author-approved' && 
      !m.volume && 
      !m.issue
    ).length,
    availableForPublishing: availableForPublishing.length,
    publishedIssues: publishedIssues.length,
    totalVolumes: volumes.length,
    totalIssues: issues.length
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className={styles.publicationDashboard}>
      {/* Notification Banner */}
      {showNotification && stats.availableForIssue > 0 && (
        <div className={styles.notificationBanner}>
          <div className={styles.notificationContent}>
            <FiBell />
            <span>
              <strong>{stats.availableForIssue}</strong> manuscript{stats.availableForIssue > 1 ? 's are' : ' is'} available for issue assignment!
            </span>
          </div>
          <button 
            onClick={() => setShowNotification(false)}
            className={styles.closeNotification}
          >
            ×
          </button>
        </div>
      )}
      
      
      <div className="container">
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Publication Management</h1>
            <p>Manage journal volumes, issues, and publication workflow</p>
          </div>
          
          <div className={styles.headerActions}>
            <Link href="/dashboard/publication/volumes/new" className="btn btn-primary">
              <FiPlus />
              New Volume
            </Link>
            <Link href="/dashboard/publication/issues/new" className="btn btn-secondary">
              <FiPlus />
              New Issue
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiBook />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.availableForIssue}</h3>
              <p>Available for Issue</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiBell />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.availableForPublishing}</h3>
              <p>Ready to Publish</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiGlobe />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.publishedIssues}</h3>
              <p>Published Issues</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiArchive />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.totalVolumes}</h3>
              <p>Total Volumes</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiEdit3 />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.totalIssues}</h3>
              <p>Total Issues</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={activeTab === 'available-for-issue' ? styles.active : ''}
            onClick={() => setActiveTab('available-for-issue')}
          >
            Available for Issue ({stats.availableForIssue})
          </button>
          <button
            className={activeTab === 'available-for-publishing' ? styles.active : ''}
            onClick={() => setActiveTab('available-for-publishing')}
          >
            Available for Publishing ({stats.availableForPublishing})
          </button>
          <button
            className={activeTab === 'published-issues' ? styles.active : ''}
            onClick={() => setActiveTab('published-issues')}
          >
            Published Issues ({stats.publishedIssues})
          </button>
          <button
            className={activeTab === 'all-volumes' ? styles.active : ''}
            onClick={() => setActiveTab('all-volumes')}
          >
            All Volumes ({allVolumesData.length})
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'available-for-issue' ? (
          <div className={styles.manuscriptsSection}>
            {/* Issue Selection Dropdown */}
            <div className={styles.issueSelection}>
              <label htmlFor="issueSelect">Select Issue to Assign Articles:</label>
              <select 
                id="issueSelect"
                value={selectedIssue} 
                onChange={(e) => setSelectedIssue(e.target.value)}
                className={styles.issueDropdown}
              >
                <option value="">-- Select an Issue --</option>
                {availableIssues.map((issue) => (
                  <option key={issue._id} value={issue._id}>
                    Volume {issue.volume?.number}, Issue {issue.number}: {issue.title}
                  </option>
                ))}
              </select>
            </div>

            {filteredManuscripts.length === 0 ? (
              <div className={styles.emptyState}>
                <FiBook />
                <h3>No manuscripts available</h3>
                <p>There are no author-approved manuscripts available for issue assignment.</p>
              </div>
            ) : (
              <div className={styles.manuscriptsTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title & Files</th>
                      <th>Authors</th>
                      <th>Category</th>
                      <th>Status & Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredManuscripts.map((manuscript) => (
                      <tr key={manuscript._id}>
                        <td data-label="Title & Files">
                          <div className={styles.titleCell}>
                            <h4>{manuscript.title}</h4>
                            <span className={styles.submissionDate}>
                              Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}
                            </span>
                            {/* Latest Files Section */}
                            {manuscript.latestManuscriptFiles && manuscript.latestManuscriptFiles.length > 0 && (
                              <div className={styles.filesSection}>
                                <div className={styles.filesHeader}>
                                  <FiDownload />
                                  <span>Latest Files ({manuscript.latestManuscriptFiles.length})</span>
                                </div>
                                <div className={styles.filesList}>
                                  {manuscript.latestManuscriptFiles.slice(0, 2).map((file, index) => (
                                    <div key={index} className={styles.fileItem}>
                                      <span className={styles.fileName}>{file.originalName}</span>
                                      <span className={styles.fileSize}>
                                        {(file.size / 1024 / 1024).toFixed(1)} MB
                                      </span>
                                    </div>
                                  ))}
                                  {manuscript.latestManuscriptFiles.length > 2 && (
                                    <div className={styles.moreFiles}>
                                      +{manuscript.latestManuscriptFiles.length - 2} more files
                                    </div>
                                  )}
                                </div>
                                {manuscript.authorCopyEditReview && (
                                  <div className={styles.reviewInfo}>
                                    <span className={styles.reviewStatus}>
                                      Author Review: {manuscript.authorCopyEditReview.decision === 'approved' ? '✓ Approved' : '⚠ Changes Requested'}
                                    </span>
                                    <span className={styles.reviewDate}>
                                      {new Date(manuscript.authorCopyEditReview.submittedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Authors">
                          <div className={styles.authorsCell}>
                            {manuscript.authors.slice(0, 2).map((author, index) => (
                              <span key={index} className={styles.authorName}>
                                {author.name}
                              </span>
                            ))}
                            {manuscript.authors.length > 2 && (
                              <span className={styles.moreAuthors}>
                                +{manuscript.authors.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Category">
                          <span className={styles.category}>{manuscript.category}</span>
                        </td>
                        <td data-label="Status & Date">
                          <div className={styles.statusInfo}>
                            <span className={`${styles.statusBadge} ${styles.ready}`}>
                              Author Approved
                            </span>
                            <span className={styles.lastModified}>
                              Updated: {new Date(manuscript.lastModified).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td data-label="Actions">
                          <div className={styles.actionButtons}>
                            <Link
                              href={`/dashboard/manuscripts/${manuscript._id}`}
                              className={styles.actionButton}
                              title="View Details"
                            >
                              <FiEye />
                            </Link>
                            {selectedIssue && (
                              <button
                                onClick={() => handleAssignToIssue(manuscript._id, manuscript.title)}
                                className={`${styles.actionButton} ${styles.assignButton}`}
                                title="Assign to Issue"
                              >
                                <FiPlus />
                              </button>
                            )}
                            <button
                              onClick={() => window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank')}
                              className={styles.actionButton}
                              title="Download All Files"
                            >
                              <FiDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'available-for-publishing' ? (
          /* Available for Publishing Tab */
          <div className={styles.availableForPublishingSection}>
            {availableForPublishing.length === 0 ? (
              <div className={styles.emptyState}>
                <FiGlobe />
                <h3>No issues ready for publishing</h3>
                <p>There are no unpublished issues containing manuscripts that are ready to be published.</p>
              </div>
            ) : (
              <div className={styles.publishingIssuesList}>
                <div className={styles.sectionHeader}>
                  <h3>Issues Ready for Publishing</h3>
                  <p>These issues contain manuscripts and are ready to be published to the website.</p>
                </div>
                
                <div className={styles.publishingIssuesGrid}>
                  {availableForPublishing
                    .sort((a, b) => {
                      // Sort by volume number, then issue number (descending)
                      if (a.volume?.number !== b.volume?.number) {
                        return (b.volume?.number || 0) - (a.volume?.number || 0);
                      }
                      return b.number - a.number;
                    })
                    .map((issue) => (
                      <div key={issue._id} className={styles.publishingIssueCard}>
                        <div className={styles.issueCardHeader}>
                          <h4>
                            Volume {issue.volume?.number}, Issue {issue.number}
                          </h4>
                          <span className={styles.issueTitle}>{issue.title}</span>
                        </div>
                        
                        <div className={styles.issueCardContent}>
                          <div className={styles.issueStats}>
                            <div className={styles.statItem}>
                              <FiBook />
                              <span>{issue.manuscripts?.length || 0} articles</span>
                            </div>
                            <div className={styles.statItem}>
                              <FiCalendar />
                              <span>Volume {issue.volume?.year}</span>
                            </div>
                          </div>
                          
                          {issue.description && (
                            <p className={styles.issueDescription}>{issue.description}</p>
                          )}
                        </div>
                        
                        <div className={styles.issueCardActions}>
                          <Link
                            href={`/dashboard/publication/issues/${issue._id}/details`}
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            title="View Details"
                          >
                            <FiEye />
                            View Details
                          </Link>
                          
                          <button
                            onClick={() => handlePublishIssue(issue._id, issue.title)}
                            disabled={isPublishing === issue._id}
                            className={`${styles.actionButton} ${styles.publishButton}`}
                            title="Publish Issue"
                          >
                            {isPublishing === issue._id ? (
                              <>
                                <div className={styles.spinner} />
                                Publishing...
                              </>
                            ) : (
                              <>
                                <FiGlobe />
                                Publish Now
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'all-volumes' ? (
          /* All Volumes Tab */
          <div className={styles.allVolumesSection}>
            {allVolumesData.length === 0 ? (
              <div className={styles.emptyState}>
                <FiArchive />
                <h3>No volumes found</h3>
                <p>There are no volumes created yet.</p>
              </div>
            ) : (
              <>
                <div className={styles.allVolumesList}>
                  {/* Group by year and paginate */}
                  {Object.entries(
                    allVolumesData
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .reduce((acc: Record<string, any[]>, item) => {
                        const year = item.volume.year;
                        if (!acc[year]) acc[year] = [];
                        acc[year].push(item);
                        return acc;
                      }, {})
                  ).sort(([a], [b]) => parseInt(b) - parseInt(a)).map(([year, items]) => (
                    <div key={year} className={styles.yearGroup}>
                        <h3 className={styles.yearHeader} style={{ color: 'white' }}>{year}</h3>
                      <div className={styles.volumesForYear}>
                        {items.map((item) => (
                          <div key={item.volume._id} className={styles.volumeGroup}>
                            <h4 className={styles.volumeTitle}>
                              Volume {item.volume.number} - {item.volume.title}
                            </h4>
                            {item.issues.length === 0 ? (
                              <div className={styles.noIssues}>No issues in this volume</div>
                            ) : (
                              <div className={styles.issuesInVolume}>
                                {item.issues
                                  .sort((a: any, b: any) => b.number - a.number)
                                  .map((issue: any) => (
                                    <div key={issue._id} className={styles.issueItem}>
                                      {/* Cover Image */}
                                      <div className={styles.issueImageContainer}>
                                        {issue.coverImage?.url ? (
                                          <img 
                                            src={issue.coverImage.url} 
                                            alt={`Cover for ${issue.title}`}
                                            className={styles.issueCoverImage}
                                          />
                                        ) : (
                                          <div className={styles.defaultCover}>
                                            <FiBook />
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Issue Info */}
                                      <div className={styles.issueInfo}>
                                        <span className={styles.issueTitle}>
                                          Vol {item.volume.number}, Issue {issue.number}: {issue.title}
                                        </span>
                                        <div className={styles.issueMetadata}>
                                          <span className={styles.issueDate}>
                                            {issue.publishedDate ? 
                                              new Date(issue.publishedDate).toLocaleDateString('en-US', { 
                                                month: 'long', 
                                                year: 'numeric' 
                                              }) : 
                                              `${new Date().toLocaleDateString('en-US', { month: 'long' })}, ${year}`
                                            }
                                          </span>
                                          <span className={`${styles.issueStatus} ${issue.isPublished ? styles.published : styles.draft}`}>
                                            <span style={{ color: 'black' }}>
                                              {issue.isPublished ? '✅ Published' : '📝 Draft'}
                                            </span>
                                          </span>
                                          <span className={styles.issueArticles}>
                                            {issue.manuscripts?.length || 0} articles
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className={styles.issueActions}>
                                        <Link
                                          href={`/dashboard/publication/issues/${issue._id}/details`}
                                          className={styles.actionButton}
                                          title="View Details"
                                        >
                                          <FiEye />
                                        </Link>
                                        <button
                                          onClick={() => handleDeleteIssue(issue._id, issue.title)}
                                          className={`${styles.actionButton} ${styles.deleteButton}`}
                                          title="Delete Issue"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={styles.paginationButton}
                    >
                      Previous
                    </button>
                    <span className={styles.paginationInfo}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={styles.paginationButton}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Published Issues Tab */
          <div className={styles.publishedIssuesSection}>
            {publishedIssues.length === 0 ? (
              <div className={styles.emptyState}>
                <FiArchive />
                <h3>No published issues</h3>
                <p>There are no published issues yet.</p>
              </div>
            ) : (
              <div className={styles.publishedIssuesList}>
                {/* Group by year */}
                {Object.entries(
                  publishedIssues.reduce((acc: Record<string, any[]>, item) => {
                    const year = item.volume?.year || new Date().getFullYear();
                    if (!acc[year]) acc[year] = [];
                    acc[year].push(item);
                    return acc;
                  }, {})
                ).sort(([a], [b]) => parseInt(b) - parseInt(a)).map(([year, items]) => (
                  <div key={year} className={styles.yearGroup}>
                    <h3 className={styles.yearHeader}>{year}</h3>
                    <div className={styles.issuesForYear}>
                      {items
                        .sort((a, b) => {
                          // Sort by volume number, then issue number (descending)
                          if (a.volume.number !== b.volume.number) {
                            return b.volume.number - a.volume.number;
                          }
                          return b.issue.number - a.issue.number;
                        })
                        .map((item) => (
                          <div
                            key={item.issue._id}
                            className={styles.publishedIssueCard}
                          >
                            {/* Cover Image */}
                            <div className={styles.issueImageContainer}>
                              {item.issue.coverImage?.url ? (
                                <img 
                                  src={item.issue.coverImage.url} 
                                  alt={`Cover for ${item.issue.title}`}
                                  className={styles.issueCoverImage}
                                />
                              ) : (
                                <div className={styles.defaultCover}>
                                  <FiBook />
                                </div>
                              )}
                            </div>
                            
                            {/* Issue Info */}
                            <div className={styles.issueInfo}>
                              <h4>Vol {item.volume.number}, Issue {item.issue.number}</h4>
                              <h5>{item.issue.title}</h5>
                              <div className={styles.issueMetadata}>
                                <span className={styles.issueDate}>
                                  {item.issue.publishedDate ? 
                                    new Date(item.issue.publishedDate).toLocaleDateString('en-US', { 
                                      month: 'long', 
                                      year: 'numeric' 
                                    }) : 
                                    `${new Date().toLocaleDateString('en-US', { month: 'long' })}, ${year}`
                                  }
                                </span>
                                <span className={styles.articleCount}>
                                  {item.issue.manuscripts?.length || 0} articles
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className={styles.issueActions}>
                              <Link
                                href={`/dashboard/publication/issues/${item.issue._id}/details`}
                                className={styles.actionButton}
                                title="View Details"
                              >
                                <FiEye />
                              </Link>
                              <Link
                                href={`/volumes/${item.volume.number}/issues/${item.issue.number}`}
                                className={styles.actionButton}
                                target="_blank"
                                title="View Public Page"
                              >
                                <FiGlobe />
                              </Link>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
