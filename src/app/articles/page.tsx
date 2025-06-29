'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiSearch, FiCalendar, FiEye, FiDownload } from 'react-icons/fi';
import styles from './ArticlesPage.module.scss';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = [
    'Computer Science',
    'Engineering',
    'Mathematics',
    'Physics',
    'Biology',
    'Chemistry',
    'Medicine',
    'Social Sciences'
  ];

  useEffect(() => {
    fetchArticles();
  }, [currentPage, categoryFilter]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12'
      });

      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('query', searchQuery);

      const response = await fetch(`/api/articles?${params}`);
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchArticles();
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
        <h1>Published Articles</h1>
        <p>Browse our collection of peer-reviewed research articles</p>
      </div>

      <div className={styles.filters}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchInput}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search articles by title, abstract, keywords, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </div>
        </form>

        <div className={styles.categoryFilter}>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading articles...</div>
      ) : (
        <>
          <div className={styles.results}>
            {pagination && (
              <p className={styles.resultCount}>
                Showing {((pagination.page - 1) * pagination.limit) + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} articles
              </p>
            )}
          </div>

          <div className={styles.articlesGrid}>
            {articles.length === 0 ? (
              <div className={styles.noResults}>
                <h3>No articles found</h3>
                <p>Try adjusting your search criteria or browse all articles.</p>
              </div>
            ) : (
              articles.map((article) => (
                <div key={article._id} className={styles.articleCard}>
                  <div className={styles.articleHeader}>
                    <span className={styles.category}>{article.category}</span>
                    <div className={styles.publication}>
                      Vol. {article.publication.volume}, No. {article.publication.issue}
                    </div>
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
                        {formatDate(article.publicationDate)}
                      </span>
                      <span className={styles.doi}>
                        DOI: {article.publication.doi}
                      </span>
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
              ))
            )}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setCurrentPage(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>

              <div className={styles.pageNumbers}>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.page - 2) + i;
                  if (pageNum <= pagination.pages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={pageNum === pagination.page ? styles.active : ''}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
