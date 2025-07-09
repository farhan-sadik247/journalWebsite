'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiSearch, FiCalendar, FiEye, FiDownload, FiPlusCircle } from 'react-icons/fi';
import styles from './ArticlesPage.module.scss';

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
  volume?: number;
  issue?: number;
  pages?: string;
  metrics?: {
    views: number;
    downloads: number;
    citations: number;
  };
  keywords: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function ArticlesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);

  // Initialize category filter from URL parameters
  useEffect(() => {
    if (searchParams) {
      const categoryFromUrl = searchParams.get('category');
      if (categoryFromUrl) {
        setCategoryFilter(categoryFromUrl);
      }
    }
  }, [searchParams]);

  // Fetch available categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        const categoryNames = data.categories.map((cat: any) => cat.name);
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to hardcoded categories
      setCategories([
        'Computer Science',
        'Engineering', 
        'Mathematics',
        'Physics',
        'Biology',
        'Chemistry',
        'Medicine',
        'Social Sciences'
      ]);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [currentPage, categoryFilter]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      console.log('🔍 ArticlesPage: Fetching articles...');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12'
      });

      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('query', searchQuery);

      const url = `/api/articles?${params}`;
      console.log('📡 ArticlesPage: Fetching from:', url);
      
      const response = await fetch(url);
      console.log('📡 ArticlesPage: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ ArticlesPage: Received data:', data);
        console.log('📄 ArticlesPage: Articles count:', data.articles?.length || 0);
        
        setArticles(data.articles || []);
        setPagination(data.pagination);
      } else {
        console.error('❌ ArticlesPage: Failed to fetch articles, status:', response.status);
        const errorText = await response.text();
        console.error('❌ ArticlesPage: Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ ArticlesPage: Error fetching articles:', error);
    } finally {
      console.log('🏁 ArticlesPage: Setting loading to false');
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
        <h1>
          {categoryFilter ? `${categoryFilter} Articles` : 'Published Articles'}
        </h1>
        <p>
          {categoryFilter 
            ? `Browse our collection of peer-reviewed articles in ${categoryFilter}`
            : 'Browse our collection of peer-reviewed research articles'
          }
        </p>
        {categoryFilter && (
          <div className={styles.breadcrumb}>
            <Link href="/articles">All Articles</Link>
            <span> / </span>
            <span>{categoryFilter}</span>
          </div>
        )}
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
              const newCategory = e.target.value;
              setCategoryFilter(newCategory);
              setCurrentPage(1);
              
              // Update URL to reflect category filter
              const params = new URLSearchParams();
              if (newCategory) {
                params.set('category', newCategory);
              }
              if (searchQuery) {
                params.set('query', searchQuery);
              }
              
              const newUrl = params.toString() ? `/articles?${params.toString()}` : '/articles';
              router.push(newUrl, { scroll: false });
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
                {categoryFilter ? (
                  <>
                    <h3>No articles found in "{categoryFilter}" category</h3>
                    <p>There are currently no published articles in this category.</p>
                    <p>If you're interested in contributing to this field, we'd love to see your submission!</p>
                    <div className={styles.submitActions}>
                      <Link href="/submit" className={styles.submitButton}>
                        <FiPlusCircle />
                        Submit Your Article
                      </Link>
                      <Link href="/articles" className={styles.browseAllButton}>
                        Browse All Articles
                      </Link>
                    </div>
                  </>
                ) : searchQuery ? (
                  <>
                    <h3>No articles found for your search</h3>
                    <p>Try adjusting your search criteria or browse all articles.</p>
                    <div className={styles.submitActions}>
                      <Link href="/submit" className={styles.submitButton}>
                        <FiPlusCircle />
                        Submit Your Article
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>No articles published yet</h3>
                    <p>Be the first to contribute to our journal!</p>
                    <div className={styles.submitActions}>
                      <Link href="/submit" className={styles.submitButton}>
                        <FiPlusCircle />
                        Submit Your Article
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              articles.map((article) => (
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

// Loading component for Suspense fallback
function ArticlesLoading() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '400px',
      fontSize: '18px',
      color: '#666'
    }}>
      Loading articles...
    </div>
  );
}

// Main component with Suspense boundary
export default function ArticlesPage() {
  return (
    <Suspense fallback={<ArticlesLoading />}>
      <ArticlesContent />
    </Suspense>
  );
}
