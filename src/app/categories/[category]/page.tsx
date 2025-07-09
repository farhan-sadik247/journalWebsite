'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiPlusCircle, FiCalendar, FiEye, FiDownload } from 'react-icons/fi';
import styles from './CategoryPage.module.scss';
import { PLACEHOLDER_URLS } from '@/lib/placeholders';

interface Article {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{ name: string; email: string; affiliation: string }>;
  category: string;
  keywords: string[];
  publishedDate: string;
  volume?: number;
  issue?: number;
  pages?: string;
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
}

export default function CategoryPage() {
  const params = useParams();
  const categoryName = params?.category ? decodeURIComponent(params.category as string) : '';
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryName) {
      fetchCategoryData();
      fetchArticles();
    }
  }, [categoryName]);

  const fetchCategoryData = async () => {
    try {
      const response = await fetch('/api/categories?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        const foundCategory = data.categories.find((cat: Category) => cat.name === categoryName);
        setCategory(foundCategory || null);
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await fetch(`/api/articles?category=${encodeURIComponent(categoryName)}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncateAbstract = (abstract: string, maxLength: number = 300) => {
    return abstract.length > maxLength 
      ? abstract.substring(0, maxLength) + '...'
      : abstract;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/articles" className={styles.backButton}>
          <FiArrowLeft />
          Back to All Articles
        </Link>
        
        <div className={styles.categoryHeader}>
          {category?.image && (
            <div className={styles.categoryImage}>
              <img
                src={category.image.url}
                alt={category.image.altText || categoryName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PLACEHOLDER_URLS.svg;
                }}
              />
            </div>
          )}
          
          <div className={styles.categoryInfo}>
            <h1>{categoryName} Articles</h1>
            {category?.details && (
              <p className={styles.categoryDescription}>{category.details}</p>
            )}
            <div className={styles.articleCount}>
              {loading ? 'Loading...' : `${articles.length} article${articles.length !== 1 ? 's' : ''} published`}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading articles...</div>
      ) : (
        <>
          {articles.length === 0 ? (
            <div className={styles.noArticles}>
              <div className={styles.noArticlesContent}>
                <h2>No articles published yet in {categoryName}</h2>
                <p>This category is waiting for its first contribution. Be a pioneer and submit your research!</p>
                <p>We welcome high-quality submissions that advance knowledge in {categoryName.toLowerCase()}.</p>
                
                <div className={styles.actions}>
                  <Link href="/submit" className={styles.submitButton}>
                    <FiPlusCircle />
                    Submit Your Article
                  </Link>
                  
                  <Link href="/articles" className={styles.browseButton}>
                    Browse Other Categories
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.articlesGrid}>
              {articles.map((article) => (
                <div key={article._id} className={styles.articleCard}>
                  <div className={styles.articleHeader}>
                    <span className={styles.category}>{article.category}</span>
                    {(article.volume || article.issue) && (
                      <div className={styles.publication}>
                        {article.volume && `Vol. ${article.volume}`}
                        {article.volume && article.issue && ', '}
                        {article.issue && `No. ${article.issue}`}
                      </div>
                    )}
                  </div>

                  <h3 className={styles.title}>
                    <Link href={`/articles/${article._id}`}>
                      {article.title}
                    </Link>
                  </h3>

                  <div className={styles.authors}>
                    {article.authors.map((author, index) => (
                      <span key={index}>
                        {author.name}
                        {index < article.authors.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>

                  <p className={styles.abstract}>
                    {truncateAbstract(article.abstract)}
                  </p>

                  <div className={styles.keywords}>
                    {article.keywords.slice(0, 3).map((keyword, index) => (
                      <span key={index} className={styles.keyword}>
                        {keyword}
                      </span>
                    ))}
                    {article.keywords.length > 3 && (
                      <span className={styles.moreKeywords}>
                        +{article.keywords.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className={styles.articleFooter}>
                    <div className={styles.metadata}>
                      <span className={styles.date}>
                        <FiCalendar />
                        {formatDate(article.publishedDate)}
                      </span>
                      {article.doi && (
                        <span className={styles.doi}>
                          DOI: {article.doi}
                        </span>
                      )}
                    </div>

                    <div className={styles.metrics}>
                      <span>
                        <FiEye />
                        {article.metrics?.views || 0}
                      </span>
                      <span>
                        <FiDownload />
                        {article.metrics?.downloads || 0}
                      </span>
                    </div>
                  </div>

                  <Link href={`/articles/${article._id}`} className={styles.readMore}>
                    Read Article
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
