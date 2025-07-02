'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  FiBook, 
  FiCalendar, 
  FiFileText, 
  FiDownload,
  FiEye,
  FiUsers
} from 'react-icons/fi';
import styles from './VolumePublic.module.scss';

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  description: string;
  publishedDate: string;
  issues: Issue[];
}

interface Issue {
  _id: string;
  number: number;
  title: string;
  description: string;
  publishedDate: string;
  manuscripts: Manuscript[];
}

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{ name: string }>;
  abstract: string;
  pages?: string;
  doi?: string;
}

export default function VolumePublicPage({ params }: { params: { number: string } }) {
  const [volume, setVolume] = useState<Volume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVolume();
  }, [params.number]);

  const fetchVolume = async () => {
    try {
      const response = await fetch(`/api/public/volumes/${params.number}`);
      if (response.ok) {
        const data = await response.json();
        setVolume(data.volume);
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching volume:', error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading volume...</p>
      </div>
    );
  }

  if (!volume) {
    return notFound();
  }

  return (
    <div className={styles.volumePage}>
      <div className="container">
        {/* Volume Header */}
        <div className={styles.volumeHeader}>
          <div className={styles.volumeInfo}>
            <h1>Volume {volume.number} ({volume.year})</h1>
            <h2>{volume.title}</h2>
            {volume.description && (
              <p className={styles.description}>{volume.description}</p>
            )}
          </div>
          
          <div className={styles.volumeMeta}>
            <div className={styles.metaItem}>
              <FiCalendar />
              <span>Published: {new Date(volume.publishedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            <div className={styles.metaItem}>
              <FiFileText />
              <span>{volume.issues.length} Issues</span>
            </div>
            <div className={styles.metaItem}>
              <FiBook />
              <span>{volume.issues.reduce((acc, issue) => acc + (issue.manuscripts?.length || 0), 0)} Articles</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className={styles.navigation}>
          <Link href="/articles" className={styles.navLink}>
            ← Browse All Articles
          </Link>
          <Link href="/volumes" className={styles.navLink}>
            All Volumes
          </Link>
        </div>

        {/* Issues Grid */}
        <div className={styles.issuesSection}>
          <h3>Issues in this Volume</h3>
          
          {volume.issues.length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText className={styles.emptyIcon} />
              <p>No issues published yet in this volume.</p>
            </div>
          ) : (
            <div className={styles.issuesGrid}>
              {volume.issues.map((issue) => (
                <div key={issue._id} className={styles.issueCard}>
                  <div className={styles.issueHeader}>
                    <h4>Issue {issue.number}</h4>
                    <div className={styles.issueDate}>
                      <FiCalendar />
                      <span>{new Date(issue.publishedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                      })}</span>
                    </div>
                  </div>
                  
                  <div className={styles.issueContent}>
                    <h5>{issue.title}</h5>
                    {issue.description && (
                      <p className={styles.issueDescription}>{issue.description}</p>
                    )}
                  </div>

                  <div className={styles.issueStats}>
                    <div className={styles.stat}>
                      <FiBook />
                      <span>{issue.manuscripts?.length || 0} Articles</span>
                    </div>
                    <div className={styles.stat}>
                      <FiUsers />
                      <span>{issue.manuscripts?.reduce((acc, ms) => acc + (ms.authors?.length || 0), 0) || 0} Authors</span>
                    </div>
                  </div>

                  {/* Articles in Issue */}
                  {issue.manuscripts && issue.manuscripts.length > 0 && (
                    <div className={styles.articlesPreview}>
                      <h6>Articles in this Issue</h6>
                      <div className={styles.articlesList}>
                        {issue.manuscripts.slice(0, 3).map((manuscript) => (
                          <div key={manuscript._id} className={styles.articleItem}>
                            <Link href={`/articles/${manuscript._id}`} className={styles.articleLink}>
                              <span className={styles.articleTitle}>{manuscript.title}</span>
                              <span className={styles.articleAuthors}>
                                {manuscript.authors?.map(a => a.name).join(', ') || 'Unknown Authors'}
                              </span>
                              {manuscript.pages && (
                                <span className={styles.articlePages}>pp. {manuscript.pages}</span>
                              )}
                            </Link>
                          </div>
                        ))}
                        {issue.manuscripts.length > 3 && (
                          <div className={styles.moreArticles}>
                            <Link href={`/volumes/${volume.number}/issues/${issue.number}`}>
                              +{issue.manuscripts.length - 3} more articles
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={styles.issueFooter}>
                    <Link 
                      href={`/volumes/${volume.number}/issues/${issue.number}`}
                      className="btn btn-primary btn-sm"
                    >
                      <FiEye />
                      View Issue
                    </Link>
                    <button className="btn btn-outline btn-sm">
                      <FiDownload />
                      Download PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
