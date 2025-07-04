'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiEye, FiDownload, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import styles from './HeroSection.module.scss';

interface Article {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{ name: string; email: string; affiliation: string }>;
  category: string;
  publishedDate: string;
  volume?: number;
  issue?: number;
  doi?: string;
  metrics?: {
    views: number;
    downloads: number;
    citations: number;
  };
}

interface Category {
  _id: string;
  name: string;
  details: string;
  image: {
    url: string;
    publicId: string;
    altText: string;
  };
  order: number;
}

interface IndexingPartner {
  _id: string;
  name: string;
  description: string;
  website: string;
  logo: {
    url: string;
    publicId: string;
    originalName: string;
  };
  order: number;
}

export function HeroSection() {
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [mostViewedArticles, setMostViewedArticles] = useState<Article[]>([]);
  const [indexingPartners, setIndexingPartners] = useState<IndexingPartner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recentRes, viewedRes, partnersRes, categoriesRes] = await Promise.all([
        fetch('/api/articles?sortBy=recent&limit=20'),
        fetch('/api/articles?sortBy=most-viewed&limit=4'),
        fetch('/api/indexing-partners'),
        fetch('/api/categories?activeOnly=true&limit=50')
      ]);

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentArticles(recentData.articles || []);
      }

      if (viewedRes.ok) {
        const viewedData = await viewedRes.json();
        setMostViewedArticles(viewedData.articles || []);
      }

      if (partnersRes.ok) {
        const partnersData = await partnersRes.json();
        setIndexingPartners(partnersData.partners || []);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAbstract = (articleId: string) => {
    const newExpanded = new Set(expandedAbstracts);
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId);
    } else {
      newExpanded.add(articleId);
    }
    setExpandedAbstracts(newExpanded);
  };

  const handleDownload = async (articleId: string, title: string) => {
    try {
      const response = await fetch(`/api/manuscripts/${articleId}/download`);
      
      if (!response.ok) {
        if (response.status === 401) {
          alert('Please log in to download articles');
          return;
        }
        throw new Error('Failed to download article');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Clean title for filename
      const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      a.download = `${cleanTitle}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download article. Please try again later.');
    }
  };

  const truncateAbstract = (abstract: string, maxLines: number = 3) => {
    const words = abstract.split(' ');
    const wordsPerLine = 12; // Approximate words per line
    const maxWords = maxLines * wordsPerLine;
    
    if (words.length <= maxWords) {
      return abstract;
    }
    
    return words.slice(0, maxWords).join(' ') + '...';
  };

  return (
    <section className={styles.hero}>
      <div className="container">
        <div className={styles.heroGrid}>
          {/* Column 1: Categories and Most Viewed Articles */}
          <div className={styles.column1}>
            {/* Categories Section */}
            <div className={styles.categoriesSection}>
              <div className={styles.sectionHeader}>
                <h3>Categories</h3>
                {categories.length > 0 && !loading && (
                  <span className={styles.categoryCount}>({categories.length})</span>
                )}
              </div>
              {loading ? (
                <div className={styles.loading}>Loading categories...</div>
              ) : (
                <>
                  <div className={styles.categoriesGrid}>
                    {categories.map((category) => (
                      <Link
                        key={category._id}
                        href={`/categories/${encodeURIComponent(category.name)}`}
                        className={styles.categoryCard}
                        title={category.details}
                      >
                        <div className={styles.categoryImage}>
                          <img
                            src={category.image.url}
                            alt={category.image.altText || category.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/placeholder-logo.svg';
                            }}
                          />
                        </div>
                        <span className={styles.categoryName}>{category.name}</span>
                      </Link>
                    ))}
                  </div>
                  {categories.length === 0 && (
                    <div className={styles.noCategoriesMessage}>
                      <p>No categories available at the moment.</p>
                    </div>
                  )}
                  {categories.length > 0 && (
                    <Link href="/articles" className={styles.seeAllButton}>
                      Browse All Articles
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Most Viewed Articles Section */}
            <div className={styles.mostViewedSection}>
              <h3>Most Viewed Articles</h3>
              {loading ? (
                <div className={styles.loading}>Loading articles...</div>
              ) : (
                <>
                  <div className={styles.articlesList}>
                    {mostViewedArticles.map((article) => (
                      <div key={article._id} className={styles.articleItem}>
                        <Link href={`/articles/${article._id}`} className={styles.articleTitle}>
                          {article.title}
                        </Link>
                        <div className={styles.articleMeta}>
                          <span className={styles.category}>{article.category}</span>
                          <div className={styles.metrics}>
                            <span><FiEye /> {article.metrics?.views?.toLocaleString() || '0'}</span>
                            <span><FiDownload /> {article.metrics?.downloads?.toLocaleString() || '0'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/articles" className={styles.seeAllButton}>
                    See All Articles
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Column 2: Recent Articles */}
          <div className={styles.column2}>
            <h2>Recent Articles</h2>
            {loading ? (
              <div className={styles.loading}>Loading recent articles...</div>
            ) : (
              <div className={styles.recentArticlesList}>
                {recentArticles.map((article) => {
                  const isExpanded = expandedAbstracts.has(article._id);
                  const abstractText = isExpanded 
                    ? article.abstract 
                    : truncateAbstract(article.abstract);
                  const needsExpansion = article.abstract.length > truncateAbstract(article.abstract).length;

                  return (
                    <article key={article._id} className={styles.recentArticle}>
                      <div className={styles.articleHeader}>
                        <div className={styles.articleIcons}>
                          <Link 
                            href={`/articles/${article._id}`} 
                            className={styles.viewIcon}
                            title="View Article"
                          >
                            <FiEye />
                          </Link>
                          <button
                            onClick={() => handleDownload(article._id, article.title)}
                            className={styles.downloadIcon}
                            title="Download PDF"
                          >
                            <FiDownload />
                          </button>
                        </div>
                      </div>
                      
                      <Link href={`/articles/${article._id}`} className={styles.recentArticleTitle}>
                        {article.title}
                      </Link>
                      
                      <div className={styles.authors}>
                        by {article.authors.map(author => author.name).join(', ')}
                      </div>
                      
                      <div className={styles.publicationInfo}>
                        <span className={styles.category}>{article.category}</span>
                        <span className={styles.year}>{new Date(article.publishedDate).getFullYear()}</span>
                        {article.volume && (
                          <span className={styles.volumeIssue}>
                            {article.volume}{article.issue ? `(${article.issue})` : ''}
                          </span>
                        )}
                        {article.doi && (
                          <span className={styles.doi}>DOI: {article.doi}</span>
                        )}
                      </div>
                      
                      <div className={styles.abstract}>
                        <p>{abstractText}</p>
                        {needsExpansion && (
                          <button
                            onClick={() => toggleAbstract(article._id)}
                            className={styles.abstractToggle}
                          >
                            {isExpanded ? (
                              <>
                                <FiChevronUp /> Show Less
                              </>
                            ) : (
                              <>
                                <FiChevronDown /> See More
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Indexing, Database, and Repository */}
          <div className={styles.column3}>
            <h3>Indexing, Database, and Repository</h3>
            {loading ? (
              <div className={styles.loading}>Loading partners...</div>
            ) : indexingPartners.length > 0 ? (
              <div className={styles.indexingList}>
                {indexingPartners.map((partner) => (
                  <div key={partner._id} className={styles.indexingItem}>
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.indexingLink}
                    >
                      <div className={styles.indexingLogo}>
                        <img
                          src={partner.logo.url}
                          alt={partner.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder-logo.svg';
                          }}
                        />
                      </div>
                      <div className={styles.indexingInfo}>
                        <h4>{partner.name}</h4>
                        {partner.description && (
                          <p>{partner.description}</p>
                        )}
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.browseArticlesSection}>
                <div className={styles.browseArticlesContent}>
                  <h4>Browse Articles</h4>
                  <p>Explore our collection of published research articles across various disciplines.</p>
                  <Link href="/articles" className={styles.browseArticlesButton}>
                    Browse All Articles
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
