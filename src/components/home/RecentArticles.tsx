'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiCalendar, FiUser, FiArrowRight, FiDownload, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './RecentArticles.module.scss';

interface Article {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{
    name: string;
    affiliation: string;
  }>;
  category: string;
  publishedDate: string;
  keywords: string[];
  volume?: number;
  issue?: number;
  pages?: string;
  metrics?: {
    views: number;
    downloads: number;
    citations: number;
  };
}

export function RecentArticles() {
  const { data: session } = useSession();
  const [mostViewedArticles, setMostViewedArticles] = useState<Article[]>([]);
  const [mostDownloadedArticles, setMostDownloadedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedArticles();
  }, []);

  const fetchFeaturedArticles = async () => {
    try {
      // Fetch most viewed and most downloaded articles in parallel
      const [viewedResponse, downloadedResponse] = await Promise.all([
        fetch('/api/articles?sortBy=most-viewed&limit=3'),
        fetch('/api/articles?sortBy=most-downloaded&limit=3')
      ]);

      if (viewedResponse.ok) {
        const viewedData = await viewedResponse.json();
        setMostViewedArticles(viewedData.articles || []);
      }

      if (downloadedResponse.ok) {
        const downloadedData = await downloadedResponse.json();
        setMostDownloadedArticles(downloadedData.articles || []);
      }
    } catch (error) {
      console.error('Error fetching featured articles:', error);
      // Fallback to empty arrays if API fails
      setMostViewedArticles([]);
      setMostDownloadedArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (articleId: string) => {
    if (!session) {
      toast.error('Please sign in to download the manuscript');
      return;
    }

    try {
      // Track download count
      await fetch(`/api/articles/${articleId}/download-count`, { method: 'POST' });
      
      // Initiate download
      const response = await fetch(`/api/manuscripts/${articleId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Get the file extension from Content-Type or default to pdf
        const contentType = response.headers.get('Content-Type') || 'application/pdf';
        const ext = contentType.split('/').pop()?.split('+')[0] || 'pdf';
        a.download = `manuscript-${articleId}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download started');
        
        // Refresh the articles to update download count
        fetchFeaturedArticles();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Download failed. Please try again later.');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to connect to the server. Please check your internet connection and try again.');
    }
  };

  const displayMostViewed = mostViewedArticles.length > 0 ? mostViewedArticles : [];
  const displayMostDownloaded = mostDownloadedArticles.length > 0 ? mostDownloadedArticles : [];

  return (
    <section className={styles.recentArticles}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <div className={styles.headerContent}>
            <h2>Most Viewed Research</h2>
            <p>Discover the most popular publications from our research community</p>
          </div>
          <Link href="/articles?sortBy=most-viewed" className="btn btn-primary">
            View All
            <FiArrowRight />
          </Link>
        </div>

        <div className={styles.articlesGrid}>
          {loading ? (
            <div className={styles.loading}>Loading most viewed articles...</div>
          ) : displayMostViewed.length > 0 ? (
            displayMostViewed.map((article) => (
              <article key={article._id} className={styles.articleCard}>
                <div className={styles.articleHeader}>
                  <span className={styles.category}>{article.category}</span>
                  {(article.volume || article.issue) && (
                    <div className={styles.publication}>
                      {article.volume && `Vol. ${article.volume}`}
                      {article.volume && article.issue && ', '}
                      {article.issue && `No. ${article.issue}`}
                    </div>
                  )}
                  <div className={styles.articleMeta}>
                    <span className={styles.date}>
                      <FiCalendar />
                      {new Date(article.publishedDate).toLocaleDateString()}
                    </span>
                    <span className={styles.metrics}>
                      <FiEye /> {article.metrics?.views || 0} views
                      <FiDownload /> {article.metrics?.downloads || 0} downloads
                    </span>
                  </div>
                </div>

                <div className={styles.articleContent}>
                  <h3>
                    <Link href={`/articles/${article._id}`}>
                      {article.title}
                    </Link>
                  </h3>
                  
                  <p className={styles.abstract}>{article.abstract}</p>
                  
                  <div className={styles.authors}>
                    <span className={styles.authorsLabel}>Authors:</span>
                    {article.authors.slice(0, 2).map((author, index) => (
                      <span key={index} className={styles.author}>
                        {author.name}
                        {index < Math.min(article.authors.length, 2) - 1 && ', '}
                      </span>
                    ))}
                    {article.authors.length > 2 && (
                      <span className={styles.moreAuthors}>
                        +{article.authors.length - 2} more
                      </span>
                    )}
                  </div>

                <div className={styles.keywords}>
                  {article.keywords.slice(0, 3).map((keyword, index) => (
                    <span key={index} className={styles.keyword}>
                      {keyword}
                    </span>
                  ))}
                  {article.keywords.length > 3 && (
                    <span className={styles.moreKeywords}>
                      +{article.keywords.length - 3}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.articleFooter}>
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <FiEye />
                    <span>{article.metrics?.views?.toLocaleString() || '0'}</span>
                  </div>
                  <div className={styles.statItem}>
                    <FiDownload />
                    <span>{article.metrics?.downloads?.toLocaleString() || '0'}</span>
                  </div>
                </div>
                
                <div className={styles.actions}>
                  <Link href={`/articles/${article._id}`} className="btn btn-secondary btn-sm">
                    Read More
                  </Link>
                  <button 
                    onClick={() => handleDownload(article._id)}
                    className="btn btn-primary btn-sm"
                  >
                    <FiDownload />
                    PDF
                  </button>
                </div>
              </div>
            </article>
            ))
          ) : (
            <div className={styles.noArticles}>No articles available</div>
          )}
        </div>

        {/* Most Downloaded Articles Section */}
        <div className={styles.sectionHeader} style={{ marginTop: '4rem' }}>
          <div className={styles.headerContent}>
            <h2>Most Downloaded Research</h2>
            <p>The most downloaded manuscripts in our collection</p>
          </div>
          <Link href="/articles?sortBy=most-downloaded" className="btn btn-primary">
            View All
            <FiArrowRight />
          </Link>
        </div>

        <div className={styles.articlesGrid}>
          {loading ? (
            <div className={styles.loading}>Loading most downloaded articles...</div>
          ) : displayMostDownloaded.length > 0 ? (
            displayMostDownloaded.map((article) => (
              <article key={`downloaded-${article._id}`} className={styles.articleCard}>
                <div className={styles.articleHeader}>
                  <span className={styles.category}>{article.category}</span>
                  {(article.volume || article.issue) && (
                    <div className={styles.publication}>
                      {article.volume && `Vol. ${article.volume}`}
                      {article.volume && article.issue && ', '}
                      {article.issue && `No. ${article.issue}`}
                    </div>
                  )}
                  <div className={styles.articleMeta}>
                    <span className={styles.date}>
                      <FiCalendar />
                      {new Date(article.publishedDate).toLocaleDateString()}
                    </span>
                    <span className={styles.metrics}>
                      <FiEye /> {article.metrics?.views || 0} views
                      <FiDownload /> {article.metrics?.downloads || 0} downloads
                    </span>
                  </div>
                </div>

                <div className={styles.articleContent}>
                  <h3>
                    <Link href={`/articles/${article._id}`}>
                      {article.title}
                    </Link>
                  </h3>
                  
                  <p className={styles.abstract}>{article.abstract}</p>
                  
                  <div className={styles.authors}>
                    <span className={styles.authorsLabel}>Authors:</span>
                    {article.authors.slice(0, 2).map((author, index) => (
                      <span key={index} className={styles.author}>
                        {author.name}
                        {index < Math.min(article.authors.length, 2) - 1 && ', '}
                      </span>
                    ))}
                    {article.authors.length > 2 && (
                      <span className={styles.moreAuthors}>
                        +{article.authors.length - 2} more
                      </span>
                    )}
                  </div>

                <div className={styles.keywords}>
                  {article.keywords.slice(0, 3).map((keyword, index) => (
                    <span key={index} className={styles.keyword}>
                      {keyword}
                    </span>
                  ))}
                  {article.keywords.length > 3 && (
                    <span className={styles.moreKeywords}>
                      +{article.keywords.length - 3}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.articleFooter}>
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <FiEye />
                    <span>{article.metrics?.views?.toLocaleString() || '0'}</span>
                  </div>
                  <div className={styles.statItem}>
                    <FiDownload />
                    <span>{article.metrics?.downloads?.toLocaleString() || '0'}</span>
                  </div>
                </div>
                
                <div className={styles.actions}>
                  <Link href={`/articles/${article._id}`} className="btn btn-secondary btn-sm">
                    Read More
                  </Link>
                  <button 
                    onClick={() => handleDownload(article._id)}
                    className="btn btn-primary btn-sm"
                  >
                    <FiDownload />
                    PDF
                  </button>
                </div>
              </div>
            </article>
            ))
          ) : (
            <div className={styles.noArticles}>No articles available</div>
          )}
        </div>

        <div className={styles.browseCta}>
          <div className={styles.ctaContent}>
            <h3>Explore More Research</h3>
            <p>Browse our extensive collection of peer-reviewed articles across all scientific disciplines.</p>
            <div className={styles.ctaActions}>
              <Link href="/articles" className="btn btn-primary btn-lg">
                Browse All Articles
              </Link>
              <Link href="/search" className="btn btn-secondary btn-lg">
                Advanced Search
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
