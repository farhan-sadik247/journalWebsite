'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiBookOpen, 
  FiEye, 
  FiDownload, 
  FiSearch,
  FiFilter,
  FiArrowLeft
} from 'react-icons/fi';
import styles from './Manuscripts.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  status: string;
  category: string;
  submissionDate: string;
  files: any[];
  keywords: string[];
  authors: any[];
}

export default function ManuscriptsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [filteredManuscripts, setFilteredManuscripts] = useState<Manuscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchManuscripts();
    }
  }, [session, status, router]);

  useEffect(() => {
    filterManuscripts();
  }, [manuscripts, searchTerm, statusFilter, categoryFilter]);

  const fetchManuscripts = async () => {
    try {
      const response = await fetch('/api/manuscripts');
      if (response.ok) {
        const data = await response.json();
        setManuscripts(data.manuscripts);
      }
    } catch (error) {
      console.error('Error fetching manuscripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterManuscripts = () => {
    let filtered = manuscripts;

    if (searchTerm) {
      filtered = filtered.filter(manuscript =>
        manuscript.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manuscript.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(manuscript => manuscript.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(manuscript => manuscript.category === categoryFilter);
    }

    setFilteredManuscripts(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'submitted': 'status-submitted',
      'under-review': 'status-under-review',
      'revision-requested': 'status-revision-requested',
      'major-revision-requested': 'status-major-revision',
      'minor-revision-requested': 'status-minor-revision',
      'under-editorial-review': 'status-under-editorial-review',
      'reviewed': 'status-reviewed',
      'accepted': 'status-accepted',
      'accepted-awaiting-copy-edit': 'status-accepted',
      'in-copy-editing': 'status-in-production',
      'copy-editing-complete': 'status-in-production',
      'rejected': 'status-rejected',
      'payment-required': 'status-payment-required',
      'in-production': 'status-in-production',
      'published': 'status-published',
    };
    
    return `status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-submitted'}`;
  };

  const getStatusDisplayText = (status: string) => {
    const statusTexts = {
      'submitted': 'Submitted',
      'under-review': 'Under Review',
      'revision-requested': 'Revision Requested',
      'major-revision-requested': 'Major Revision Required',
      'minor-revision-requested': 'Minor Revision Required',
      'under-editorial-review': 'Under Editorial Review',
      'reviewed': 'Reviewed',
      'accepted': 'Accepted',
      'accepted-awaiting-copy-edit': 'Accepted - Awaiting Copy Edit',
      'in-copy-editing': 'In Copy Editing',
      'copy-editing-complete': 'Copy Editing Complete',
      'rejected': 'Rejected',
      'payment-required': 'Payment Required',
      'in-production': 'In Production',
      'published': 'Published',
    };
    
    return statusTexts[status as keyof typeof statusTexts] || status.replace('-', ' ').toUpperCase();
  };

  const uniqueStatuses = Array.from(new Set(manuscripts.map(m => m.status)));
  const uniqueCategories = Array.from(new Set(manuscripts.map(m => m.category)));

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
    <div className={styles.manuscriptsPage}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <Link href="/dashboard" className={styles.backButton}>
              <FiArrowLeft />
              Back to Dashboard
            </Link>
            <h1 style={{ color: 'white' }}>My Manuscripts</h1>
            <p>Manage all your submitted manuscripts</p>
          </div>
          <div className={styles.headerRight}>
            <Link href="/submit" className="btn btn-primary">
              <FiBookOpen />
              Submit New Manuscript
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.searchBox}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search manuscripts by title or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <span>{filteredManuscripts.length} manuscript(s) found</span>
          </div>

          {filteredManuscripts.length > 0 ? (
            <div className={styles.manuscriptsList}>
              {filteredManuscripts.map((manuscript) => (
                <div key={manuscript._id} className={styles.manuscriptCard}>
                  <div className={styles.manuscriptHeader}>
                    <h3>
                      <Link href={`/dashboard/manuscripts/${manuscript._id}`}>
                        {manuscript.title}
                      </Link>
                    </h3>
                    <span className={getStatusBadge(manuscript.status)}>
                      {getStatusDisplayText(manuscript.status)}
                    </span>
                  </div>

                  <div className={styles.manuscriptMeta}>
                    <span>Category: {manuscript.category}</span>
                    <span>Authors: {manuscript.authors.length}</span>
                    <span>Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
                    {(manuscript.status === 'under-review' || 
                      manuscript.status === 'reviewed' ||
                      manuscript.status === 'under-editorial-review') && (
                      <span className={styles.reviewStatus}>
                        📋 Reviews in progress
                      </span>
                    )}
                    {(manuscript.status === 'major-revision-requested' || 
                      manuscript.status === 'minor-revision-requested') && (
                      <span className={styles.revisionStatus}>
                        ✏️ Revision required
                      </span>
                    )}
                    {manuscript.status === 'accepted' && (
                      <span className={styles.acceptedStatus}>
                        ✅ Accepted for publication
                      </span>
                    )}
                    {manuscript.status === 'accepted-awaiting-copy-edit' && (
                      <span className={styles.productionStatus}>
                        🔄 Awaiting copy editing
                      </span>
                    )}
                    {manuscript.status === 'in-copy-editing' && (
                      <span className={styles.productionStatus}>
                        ✏️ In copy editing process
                      </span>
                    )}
                    {manuscript.status === 'copy-editing-complete' && (
                      <span className={styles.productionStatus}>
                        📝 Copy editing complete
                      </span>
                    )}
                    {manuscript.status === 'in-production' && (
                      <span className={styles.productionStatus}>
                        🏭 In production pipeline
                      </span>
                    )}
                  </div>

                  <div className={styles.manuscriptKeywords}>
                    {manuscript.keywords.slice(0, 3).map((keyword, index) => (
                      <span key={index} className={styles.keyword}>
                        {keyword}
                      </span>
                    ))}
                    {manuscript.keywords.length > 3 && (
                      <span className={styles.moreKeywords}>
                        +{manuscript.keywords.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className={styles.manuscriptActions}>
                    <Link 
                      href={`/dashboard/manuscripts/${manuscript._id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <FiEye />
                      View Details
                    </Link>
                    {manuscript.files?.length > 0 && (
                      <button 
                        onClick={() => window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank')}
                        className="btn btn-primary btn-sm"
                      >
                        <FiDownload />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FiBookOpen />
              <h3>No manuscripts found</h3>
              <p>
                {manuscripts.length === 0 
                  ? "You haven't submitted any manuscripts yet."
                  : "No manuscripts match your current filters."
                }
              </p>
              {manuscripts.length === 0 && (
                <Link href="/submit" className="btn btn-primary">
                  Submit Your First Manuscript
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
