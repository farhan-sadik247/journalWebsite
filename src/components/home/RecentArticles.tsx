'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiCalendar, FiUser, FiArrowRight, FiDownload, FiEye } from 'react-icons/fi';
import styles from './RecentArticles.module.scss';

interface Article {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{ name: string; email: string; affiliation: string }>;
  category: string;
  keywords: string[];
  publicationDate: string;
  publication: {
    volume: number;
    issue: number;
    pages: string;
    doi: string;
  };
  metrics: {
    views: number;
    downloads: number;
    citations: number;
  };
}

export function RecentArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentArticles();
  }, []);

  const fetchRecentArticles = async () => {
    try {
      const response = await fetch('/api/articles?recent=true');
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error fetching recent articles:', error);
      // Fallback to mock data if API fails
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // Mock data fallback
  const mockArticles = [
    {
      _id: '1',
      title: 'Machine Learning Applications in Predictive Healthcare Analytics',
      abstract: 'This study explores the implementation of advanced machine learning algorithms in healthcare prediction systems, demonstrating significant improvements in diagnostic accuracy and patient outcome forecasting.',
      authors: [
        { name: 'Dr. Sarah Johnson', email: '', affiliation: '' },
        { name: 'Prof. Michael Chen', email: '', affiliation: '' },
        { name: 'Dr. Emily Rodriguez', email: '', affiliation: '' }
      ],
      publicationDate: '2024-12-20',
      category: 'Medical Technology',
      keywords: ['Machine Learning', 'Healthcare', 'Predictive Analytics', 'Medical Diagnosis'],
      publication: { volume: 1, issue: 1, pages: '1-15', doi: '10.1234/rj.2024.001' },
      metrics: { views: 2847, downloads: 1234, citations: 12 }
    },
    {
      _id: '2',
      title: 'Sustainable Energy Systems: A Comprehensive Review of Solar Panel Efficiency',
      abstract: 'An extensive analysis of current solar panel technologies and their efficiency improvements over the past decade, with projections for future developments in renewable energy.',
      authors: [
        { name: 'Dr. James Wilson', email: '', affiliation: '' },
        { name: 'Prof. Lisa Zhang', email: '', affiliation: '' }
      ],
      publicationDate: '2024-12-18',
      category: 'Renewable Energy',
      keywords: ['Solar Energy', 'Renewable Resources', 'Sustainability', 'Clean Technology'],
      publication: { volume: 1, issue: 1, pages: '16-28', doi: '10.1234/rj.2024.002' },
      metrics: { views: 1923, downloads: 876, citations: 8 }
    },
    {
      _id: '3',
      title: 'Quantum Computing Advances in Cryptographic Security',
      abstract: 'Recent breakthroughs in quantum computing pose both challenges and opportunities for cryptographic security. This paper examines post-quantum cryptography solutions.',
      authors: [
        { name: 'Prof. David Kumar', email: '', affiliation: '' },
        { name: 'Dr. Anna Petrov', email: '', affiliation: '' },
        { name: 'Dr. Robert Kim', email: '', affiliation: '' }
      ],
      publicationDate: '2024-12-15',
      category: 'Computer Science',
      keywords: ['Quantum Computing', 'Cryptography', 'Security', 'Computer Science'],
      publication: { volume: 1, issue: 1, pages: '29-45', doi: '10.1234/rj.2024.003' },
      metrics: { views: 3156, downloads: 1567, citations: 15 }
    },
  ];

  const displayArticles = articles.length > 0 ? articles : mockArticles;

  return (
    <section className={styles.recentArticles}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <div className={styles.headerContent}>
            <h2>Latest Research</h2>
            <p>Discover the most recent publications from our global research community</p>
          </div>
          <Link href="/articles" className="btn btn-primary">
            View All Articles
            <FiArrowRight />
          </Link>
        </div>

        <div className={styles.articlesGrid}>
          {loading ? (
            <div className={styles.loading}>Loading recent articles...</div>
          ) : (
            displayArticles.map((article) => (
              <article key={article._id} className={styles.articleCard}>
                <div className={styles.articleHeader}>
                  <span className={styles.category}>{article.category}</span>
                  <div className={styles.articleMeta}>
                    <div className={styles.metaItem}>
                      <FiCalendar />
                      <span>{new Date(article.publicationDate).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <FiUser />
                      <span>{article.authors.length} authors</span>
                    </div>
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
                  <Link href={`/articles/${article._id}/download`} className="btn btn-primary btn-sm">
                    <FiDownload />
                    PDF
                  </Link>
                </div>
              </div>

              <div className={styles.doi}>
                DOI: {article.publication?.doi || 'N/A'}
              </div>
            </article>
            ))
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
