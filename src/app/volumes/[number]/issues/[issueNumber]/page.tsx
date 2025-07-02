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
  FiUsers,
  FiArrowLeft
} from 'react-icons/fi';
import styles from './IssuePublic.module.scss';

interface Issue {
  _id: string;
  number: number;
  title: string;
  description: string;
  publishedDate: string;
  volume: {
    _id: string;
    number: number;
    year: number;
    title: string;
  };
  manuscripts: Manuscript[];
}

interface Manuscript {
  _id: string;
  title: string;
  authors: Array<{ name: string }>;
  abstract: string;
  pages?: string;
  doi?: string;
  publishedDate: string;
  metrics?: {
    views: number;
    downloads: number;
    citations: number;
  };
}

export default function IssuePublicPage({ 
  params 
}: { 
  params: { number: string; issueNumber: string } 
}) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssue();
  }, [params.number, params.issueNumber]);

  const fetchIssue = async () => {
    try {
      const response = await fetch(`/api/public/volumes/${params.number}/issues/${params.issueNumber}`);
      if (response.ok) {
        const data = await response.json();
        setIssue(data.issue);
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching issue:', error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading issue...</p>
      </div>
    );
  }

  if (!issue) {
    return notFound();
  }

  return (
    <div className={styles.issuePage}>
      <div className="container">
        {/* Navigation */}
        <div className={styles.navigation}>
          <Link href={`/volumes/${issue.volume.number}`} className={styles.backLink}>
            <FiArrowLeft />
            Back to Volume {issue.volume.number}
          </Link>
          <Link href="/volumes" className={styles.navLink}>
            All Volumes
          </Link>
        </div>

        {/* Issue Header */}
        <div className={styles.issueHeader}>
          <div className={styles.issueInfo}>
            <div className={styles.breadcrumb}>
              <Link href={`/volumes/${issue.volume.number}`}>
                Volume {issue.volume.number} ({issue.volume.year})
              </Link>
              <span>→</span>
              <span>Issue {issue.number}</span>
            </div>
            <h1>{issue.title}</h1>
            {issue.description && (
              <p className={styles.description}>{issue.description}</p>
            )}
          </div>
          
          <div className={styles.issueMeta}>
            <div className={styles.metaItem}>
              <FiCalendar />
              <span>Published: {new Date(issue.publishedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            <div className={styles.metaItem}>
              <FiBook />
              <span>{issue.manuscripts.length} Articles</span>
            </div>
            <div className={styles.metaItem}>
              <FiUsers />
              <span>{issue.manuscripts.reduce((acc, ms) => acc + (ms.authors?.length || 0), 0)} Authors</span>
            </div>
          </div>

          <div className={styles.issueActions}>
            <button className="btn btn-primary">
              <FiDownload />
              Download Full Issue PDF
            </button>
          </div>
        </div>

        {/* Table of Contents */}
        <div className={styles.tableOfContents}>
          <h2>Table of Contents</h2>
          
          {issue.manuscripts.length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText className={styles.emptyIcon} />
              <p>No articles published in this issue yet.</p>
            </div>
          ) : (
            <div className={styles.articlesGrid}>
              {issue.manuscripts.map((manuscript, index) => (
                <article key={manuscript._id} className={styles.articleCard}>
                  <div className={styles.articleHeader}>
                    <div className={styles.articleNumber}>
                      Article {index + 1}
                    </div>
                    {manuscript.pages && (
                      <div className={styles.articlePages}>
                        pp. {manuscript.pages}
                      </div>
                    )}
                  </div>

                  <div className={styles.articleContent}>
                    <h3>
                      <Link href={`/articles/${manuscript._id}`}>
                        {manuscript.title}
                      </Link>
                    </h3>
                    
                    <div className={styles.articleAuthors}>
                      <FiUsers />
                      <span>
                        {manuscript.authors?.map(a => a.name).join(', ') || 'Unknown Authors'}
                      </span>
                    </div>

                    <p className={styles.articleAbstract}>
                      {manuscript.abstract.length > 300 
                        ? `${manuscript.abstract.substring(0, 300)}...` 
                        : manuscript.abstract
                      }
                    </p>

                    {manuscript.doi && (
                      <div className={styles.articleDoi}>
                        <strong>DOI:</strong> 
                        <a 
                          href={`https://doi.org/${manuscript.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {manuscript.doi}
                        </a>
                      </div>
                    )}

                    {manuscript.metrics && (
                      <div className={styles.articleMetrics}>
                        <div className={styles.metric}>
                          <FiEye />
                          <span>{manuscript.metrics.views || 0} views</span>
                        </div>
                        <div className={styles.metric}>
                          <FiDownload />
                          <span>{manuscript.metrics.downloads || 0} downloads</span>
                        </div>
                        <div className={styles.metric}>
                          <FiFileText />
                          <span>{manuscript.metrics.citations || 0} citations</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.articleFooter}>
                    <span className={styles.publishedDate}>
                      Published: {new Date(manuscript.publishedDate).toLocaleDateString()}
                    </span>
                    <div className={styles.articleActions}>
                      <Link 
                        href={`/articles/${manuscript._id}`}
                        className="btn btn-outline btn-sm"
                      >
                        <FiEye />
                        View Article
                      </Link>
                      <Link 
                        href={`/articles/${manuscript._id}`}
                        className="btn btn-primary btn-sm"
                      >
                        <FiDownload />
                        Download PDF
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Issue Footer */}
        <div className={styles.issueFooter}>
          <div className={styles.citation}>
            <h3>How to Cite This Issue</h3>
            <div className={styles.citationText}>
              <em>{issue.volume.title}</em>, Volume {issue.volume.number}, Issue {issue.number} ({issue.volume.year}). 
              Published {new Date(issue.publishedDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
