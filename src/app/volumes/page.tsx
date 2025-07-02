'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiBook, FiCalendar, FiFileText, FiEye } from 'react-icons/fi';
import styles from './VolumesListing.module.scss';

interface Issue {
  _id: string;
  number: number;
  title: string;
  description: string;
  isPublished: boolean;
  publishedDate?: string;
  manuscriptCount: number;
}

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  description: string;
  isPublished: boolean;
  publishedDate?: string;
  issues: Issue[];
  manuscriptCount: number;
}

export default function VolumesListingPage() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVolumes();
  }, []);

  const fetchVolumes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/public/volumes');
      
      if (response.ok) {
        const data = await response.json();
        setVolumes(data);
      } else {
        console.error('Failed to fetch volumes');
      }
    } catch (error) {
      console.error('Error fetching volumes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading volumes...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <FiBook className={styles.titleIcon} />
            Journal Volumes & Issues
          </h1>
          <p className={styles.subtitle}>
            Browse all published volumes and issues of our journal
          </p>
        </div>
      </header>

      <main className={styles.main}>
        {volumes.length === 0 ? (
          <div className={styles.emptyState}>
            <FiBook className={styles.emptyIcon} />
            <h3>No Published Volumes</h3>
            <p>There are no published volumes available at this time.</p>
          </div>
        ) : (
          <div className={styles.volumesGrid}>
            {volumes.map((volume) => (
              <div key={volume._id} className={styles.volumeCard}>
                <div className={styles.volumeHeader}>
                  <h2 className={styles.volumeTitle}>
                    <Link href={`/volumes/${volume.number}`}>
                      Volume {volume.number} ({volume.year})
                    </Link>
                  </h2>
                  <div className={styles.volumeMeta}>
                    <span className={styles.metaItem}>
                      <FiCalendar />
                      {volume.publishedDate 
                        ? new Date(volume.publishedDate).toLocaleDateString()
                        : volume.year
                      }
                    </span>
                    <span className={styles.metaItem}>
                      <FiFileText />
                      {volume.manuscriptCount} Articles
                    </span>
                  </div>
                </div>

                <div className={styles.volumeContent}>
                  <h3 className={styles.volumeSubtitle}>{volume.title}</h3>
                  {volume.description && (
                    <p className={styles.volumeDescription}>
                      {volume.description}
                    </p>
                  )}
                </div>

                <div className={styles.issuesSection}>
                  <h4 className={styles.issuesTitle}>
                    Issues ({volume.issues.filter(issue => issue.isPublished).length})
                  </h4>
                  
                  {volume.issues.filter(issue => issue.isPublished).length === 0 ? (
                    <p className={styles.noIssues}>No published issues yet.</p>
                  ) : (
                    <div className={styles.issuesList}>
                      {volume.issues
                        .filter(issue => issue.isPublished)
                        .sort((a, b) => a.number - b.number)
                        .map((issue) => (
                          <div key={issue._id} className={styles.issueItem}>
                            <Link 
                              href={`/volumes/${volume.number}/issues/${issue.number}`}
                              className={styles.issueLink}
                            >
                              <div className={styles.issueInfo}>
                                <h5 className={styles.issueNumber}>
                                  Issue {issue.number}
                                </h5>
                                <p className={styles.issueTitle}>
                                  {issue.title || `Issue ${issue.number}`}
                                </p>
                                <div className={styles.issueMeta}>
                                  <span className={styles.articleCount}>
                                    <FiFileText />
                                    {issue.manuscriptCount} articles
                                  </span>
                                  {issue.publishedDate && (
                                    <span className={styles.publishDate}>
                                      <FiCalendar />
                                      {new Date(issue.publishedDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <FiEye className={styles.viewIcon} />
                            </Link>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className={styles.volumeActions}>
                  <Link 
                    href={`/volumes/${volume.number}`}
                    className={styles.viewVolumeBtn}
                  >
                    <FiEye />
                    View Volume
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
