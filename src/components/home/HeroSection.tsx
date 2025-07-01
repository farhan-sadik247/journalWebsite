'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiBookOpen, FiUsers, FiAward, FiEye, FiDownload } from 'react-icons/fi';
import styles from './HeroSection.module.scss';

interface Article {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{ name: string; email: string; affiliation: string }>;
  category: string;
  publishedDate: string;
  metrics?: {
    views: number;
    downloads: number;
    citations: number;
  };
}

interface ArticleWithScore extends Article {
  popularityScore: number;
}

export function HeroSection() {
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedArticle();
  }, []);

  const fetchFeaturedArticle = async () => {
    try {
      // Fetch both most viewed and most downloaded articles
      const [viewedResponse, downloadedResponse] = await Promise.all([
        fetch('/api/articles?sortBy=most-viewed&limit=5'),
        fetch('/api/articles?sortBy=most-downloaded&limit=5')
      ]);

      if (viewedResponse.ok && downloadedResponse.ok) {
        const [viewedData, downloadedData] = await Promise.all([
          viewedResponse.json(),
          downloadedResponse.json()
        ]);

        const viewedArticles = viewedData.articles || [];
        const downloadedArticles = downloadedData.articles || [];

        // Combine and calculate popularity score (views + downloads)
        const allArticles = [...viewedArticles, ...downloadedArticles];
        const articlesWithScore: ArticleWithScore[] = allArticles.reduce((acc: ArticleWithScore[], article: Article) => {
          const existing = acc.find(a => a._id === article._id);
          if (!existing) {
            const score = (article.metrics?.views || 0) + (article.metrics?.downloads || 0);
            acc.push({ ...article, popularityScore: score });
          }
          return acc;
        }, []);

        // Sort by popularity score and get the top ones
        const sortedArticles = articlesWithScore.sort((a: ArticleWithScore, b: ArticleWithScore) => b.popularityScore - a.popularityScore);
        
        // If there are ties for the highest score, pick randomly
        const topScore = sortedArticles[0]?.popularityScore || 0;
        const topArticles = sortedArticles.filter((article: ArticleWithScore) => article.popularityScore === topScore);
        
        const randomIndex = Math.floor(Math.random() * topArticles.length);
        setFeaturedArticle(topArticles[randomIndex] || sortedArticles[0] || null);
      }
    } catch (error) {
      console.error('Error fetching featured article:', error);
      setFeaturedArticle(null);
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className={styles.hero}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            {loading ? (
              <>
                <h1>
                  Advancing Scientific Knowledge Through 
                  <span className={styles.highlight}> Peer-Reviewed Research</span>
                </h1>
                <p>Loading featured research...</p>
              </>
            ) : featuredArticle ? (
              <>
                <h1>
                  Featured Research: 
                  <span className={styles.highlight}> {featuredArticle.title}</span>
                </h1>
                <div className={styles.featuredMeta}>
                  <span className={styles.category}>{featuredArticle.category}</span>
                  <div className={styles.metrics}>
                    <span><FiEye /> {featuredArticle.metrics?.views?.toLocaleString() || '0'}</span>
                    <span><FiDownload /> {featuredArticle.metrics?.downloads?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1>
                  Advancing Scientific Knowledge Through 
                  <span className={styles.highlight}> Peer-Reviewed Research</span>
                </h1>
                <p>
                  Join the leading platform for academic research publication. Submit your manuscripts, 
                  engage in rigorous peer review, and contribute to the global scientific community.
                </p>
              </>
            )}
            
            <div className={styles.heroActions}>
              <Link href="/submit" className="btn btn-primary btn-lg">
                <FiBookOpen />
                Submit Manuscript
                <FiArrowRight />
              </Link>
              <Link href="/articles" className="btn btn-secondary btn-lg">
                Browse Articles
              </Link>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <FiBookOpen className={styles.statIcon} />
                <div>
                  <span className={styles.statNumber}>2,500+</span>
                  <span className={styles.statLabel}>Published Articles</span>
                </div>
              </div>
              <div className={styles.stat}>
                <FiUsers className={styles.statIcon} />
                <div>
                  <span className={styles.statNumber}>5,000+</span>
                  <span className={styles.statLabel}>Active Researchers</span>
                </div>
              </div>
              <div className={styles.stat}>
                <FiAward className={styles.statIcon} />
                <div>
                  <span className={styles.statNumber}>95%</span>
                  <span className={styles.statLabel}>Author Satisfaction</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.heroImage}>
            <div className={styles.imageContainer}>
              <div className={styles.floatingCard}>
                <h4>Featured Research</h4>
                {featuredArticle ? (
                  <>
                    <p>{featuredArticle.title.length > 80 ? `${featuredArticle.title.substring(0, 80)}...` : featuredArticle.title}</p>
                    <div className={styles.cardMeta}>
                      <span>{featuredArticle.authors[0]?.name || 'Unknown Author'}</span>
                      <span>•</span>
                      <span>{new Date(featuredArticle.publishedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className={styles.cardMetrics}>
                      <span><FiEye /> {featuredArticle.metrics?.views?.toLocaleString() || '0'}</span>
                      <span><FiDownload /> {featuredArticle.metrics?.downloads?.toLocaleString() || '0'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p>A next-generation device for crop yield prediction using IoT and machine learning</p>
                    <div className={styles.cardMeta}>
                      <span>Shakik Mahmud</span>
                      <span>•</span>
                      <span>Mar 2023</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className={styles.floatingCard}>
                <h4>Peer Review</h4>
                <p>Rigorous evaluation by field experts</p>
                <div className={styles.reviewProgress}>
                  <div className={styles.progressBar}>
                    <div className={styles.progress}></div>
                  </div>
                  <span>85% Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
