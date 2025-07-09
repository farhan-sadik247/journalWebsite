'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft,
  FiGlobe,
  FiCalendar,
  FiBook,
  FiSave,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';
import styles from './PublishManuscript.module.scss';

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
  copyEditingStage?: string;
  category: string;
  volume?: number;
  issue?: number;
  pages?: string;
}

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  status: string;
}

export default function PublishManuscriptPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Publication form state
  const [selectedVolume, setSelectedVolume] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [pages, setPages] = useState('');
  const [publishedDate, setPublishedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== 'editor' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (session && params.id) {
      fetchData();
    }
  }, [session, status, router, params.id]);

  const fetchData = async () => {
    try {
      const [manuscriptRes, volumesRes] = await Promise.all([
        fetch(`/api/manuscripts/${params.id}`),
        fetch('/api/volumes?status=open')
      ]);

      if (manuscriptRes.ok) {
        const manuscriptData = await manuscriptRes.json();
        const ms = manuscriptData.manuscript;
        setManuscript(ms);
        
        // Pre-fill form with existing data if available
        if (ms.volume) setSelectedVolume(ms.volume.toString());
        if (ms.issue) setIssueNumber(ms.issue.toString());
        if (ms.pages) setPages(ms.pages);
      } else {
        setError('Manuscript not found');
      }

      if (volumesRes.ok) {
        const volumesData = await volumesRes.json();
        setVolumes(volumesData.volumes || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!manuscript || !selectedVolume) return;

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscript._id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volume: parseInt(selectedVolume),
          issue: issueNumber ? parseInt(issueNumber) : 1,
          pages,
          publishedDate,
          action: 'formal-publish'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Manuscript published successfully!');
        router.push('/dashboard/publication');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish manuscript');
      }
    } catch (error) {
      console.error('Error publishing manuscript:', error);
      alert('Failed to publish manuscript. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const canPublish = () => {
    return manuscript?.copyEditingStage === 'ready-for-publication' &&
           selectedVolume &&
           pages &&
           publishedDate;
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
            <Link href="/dashboard/publication" className="btn btn-primary">
              Back to Publication Dashboard
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
    <div className={styles.publishManuscript}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <Link href="/dashboard/publication" className={styles.backButton}>
            <FiArrowLeft />
            Back to Publication Dashboard
          </Link>
          
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1>Publish Manuscript</h1>
              {manuscript.copyEditingStage !== 'ready-for-publication' && (
                <div className={styles.warningBanner}>
                  <FiAlertCircle />
                  <span>Warning: This manuscript is not marked as ready for publication</span>
                </div>
              )}
            </div>
            
            <div className={styles.headerActions}>
              <button 
                onClick={handlePublish}
                className="btn btn-primary"
                disabled={!canPublish() || isPublishing}
              >
                <FiGlobe />
                {isPublishing ? 'Publishing...' : 'Publish Now'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Main Form */}
          <div className={styles.mainContent}>
            {/* Publication Details Form */}
            <section className={styles.section}>
              <h2>
                <FiBook />
                Publication Details
              </h2>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="volume">Volume *</label>
                  <select
                    id="volume"
                    value={selectedVolume}
                    onChange={(e) => setSelectedVolume(e.target.value)}
                    className={styles.formControl}
                    required
                  >
                    <option value="">Select Volume...</option>
                    {volumes.map((volume) => (
                      <option key={volume._id} value={volume.number}>
                        Volume {volume.number} ({volume.year}) - {volume.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="issue">Issue Number</label>
                  <input
                    type="number"
                    id="issue"
                    value={issueNumber}
                    onChange={(e) => setIssueNumber(e.target.value)}
                    className={styles.formControl}
                    placeholder="e.g., 1"
                    min="1"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="pages">Page Range *</label>
                  <input
                    type="text"
                    id="pages"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    className={styles.formControl}
                    placeholder="e.g., 123-145"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="publishedDate">Publication Date *</label>
                  <input
                    type="date"
                    id="publishedDate"
                    value={publishedDate}
                    onChange={(e) => setPublishedDate(e.target.value)}
                    className={styles.formControl}
                    required
                  />
                </div>
              </div>
            </section>

            {/* Publication Preview */}
            <section className={styles.section}>
              <h2>Publication Preview</h2>
              <div className={styles.publicationPreview}>
                <div className={styles.previewItem}>
                  <strong>Citation:</strong>
                  <p>
                    {manuscript.authors.map(author => author.name).join(', ')} ({new Date(publishedDate).getFullYear()}). 
                    {manuscript.title}. <em>Research Journal</em>
                    {selectedVolume && `, ${selectedVolume}`}
                    {issueNumber && `(${issueNumber})`}
                    {pages && `, ${pages}`}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Manuscript Info */}
            <div className={styles.infoCard}>
              <h3>Manuscript Information</h3>
              
              <div className={styles.infoItem}>
                <span className={styles.label}>Title</span>
                <span className={styles.value}>{manuscript.title}</span>
              </div>
              
              <div className={styles.infoItem}>
                <span className={styles.label}>Category</span>
                <span className={styles.value}>{manuscript.category}</span>
              </div>
              
              <div className={styles.infoItem}>
                <span className={styles.label}>Status</span>
                <span className={styles.value}>
                  {manuscript.status === 'published' ? 'Published' : manuscript.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              
              <div className={styles.infoItem}>
                <span className={styles.label}>Production Stage</span>
                <span className={styles.value}>
                  {manuscript.copyEditingStage?.replace('-', ' ') || 'Not specified'}
                </span>
              </div>
            </div>

            {/* Authors */}
            <div className={styles.infoCard}>
              <h3>Authors</h3>
              <div className={styles.authorsList}>
                {manuscript.authors.map((author, index) => (
                  <div key={index} className={styles.authorItem}>
                    <h4>{author.name}</h4>
                    <p>{author.affiliation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Publication Checklist */}
            <div className={styles.checklistCard}>
              <h3>Publication Checklist</h3>
              <div className={styles.checklist}>
                <div className={styles.checklistItem}>
                  <FiCheck className={manuscript.copyEditingStage === 'ready-for-publication' ? styles.completed : styles.pending} />
                  <span>Ready for Publication</span>
                </div>
                <div className={styles.checklistItem}>
                  <FiCheck className={selectedVolume ? styles.completed : styles.pending} />
                  <span>Volume Selected</span>
                </div>
                <div className={styles.checklistItem}>
                  <FiCheck className={pages ? styles.completed : styles.pending} />
                  <span>Page Range Set</span>
                </div>
                <div className={styles.checklistItem}>
                  <FiCheck className={publishedDate ? styles.completed : styles.pending} />
                  <span>Publication Date Set</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
