'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiSearch, FiFilter, FiDownload, FiEye, FiCalendar, FiUser, FiTag, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './AdvancedSearch.module.scss';

interface SearchFilters {
  query: string;
  category: string;
  status: string;
  author: string;
  dateRange: {
    start: string;
    end: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{
    name: string;
    affiliation: string;
  }>;
  category: string;
  status: string;
  submissionDate: string;
  publishedDate?: string;
  doi?: string;
  metrics: {
    views: number;
    downloads: number;
    citations: number;
  };
  keywords: string[];
}

export default function AdvancedSearchPage() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    status: '',
    author: '',
    dateRange: {
      start: '',
      end: '',
    },
    sortBy: 'relevance',
    sortOrder: 'desc',
  });

  const categories = [
    'Artificial Intelligence',
    'Machine Learning',
    'Computer Science',
    'Software Engineering',
    'Data Science',
    'Cybersecurity',
    'Human-Computer Interaction',
    'Information Systems',
    'Networks and Communications',
    'Theoretical Computer Science',
  ];

  const statusOptions = [
    { value: 'published', label: 'Published' },
    { value: 'in-production', label: 'In Production' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'under-review', label: 'Under Review' },
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'date', label: 'Publication Date' },
    { value: 'title', label: 'Title' },
    { value: 'citations', label: 'Citations' },
    { value: 'views', label: 'Views' },
  ];

  useEffect(() => {
    searchManuscripts();
  }, [filters, currentPage]);

  const searchManuscripts = async () => {
    try {
      setLoading(true);

      const searchParams = new URLSearchParams();
      searchParams.append('page', currentPage.toString());
      searchParams.append('limit', '10');
      
      if (filters.query) searchParams.append('query', filters.query);
      if (filters.category) searchParams.append('category', filters.category);
      if (filters.status) searchParams.append('status', filters.status);
      if (filters.author) searchParams.append('author', filters.author);
      if (filters.dateRange.start) searchParams.append('startDate', filters.dateRange.start);
      if (filters.dateRange.end) searchParams.append('endDate', filters.dateRange.end);
      if (filters.sortBy) searchParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) searchParams.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/search/manuscripts?${searchParams}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setManuscripts(data.manuscripts);
      setTotalResults(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error searching manuscripts:', error);
      toast.error('Failed to search manuscripts');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: value,
      },
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      status: '',
      author: '',
      dateRange: {
        start: '',
        end: '',
      },
      sortBy: 'relevance',
      sortOrder: 'desc',
    });
    setCurrentPage(1);
  };

  const exportResults = async () => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('export', 'true');
      
      if (filters.query) searchParams.append('query', filters.query);
      if (filters.category) searchParams.append('category', filters.category);
      if (filters.status) searchParams.append('status', filters.status);
      if (filters.author) searchParams.append('author', filters.author);
      if (filters.dateRange.start) searchParams.append('startDate', filters.dateRange.start);
      if (filters.dateRange.end) searchParams.append('endDate', filters.dateRange.end);
      if (filters.sortBy) searchParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) searchParams.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/search/manuscripts?${searchParams}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `search-results-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Results exported successfully');
    } catch (error) {
      console.error('Error exporting results:', error);
      toast.error('Failed to export results');
    }
  };

  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Advanced Manuscript Search</h1>
        <p>Discover and explore published research articles</p>
      </div>

      {/* Search Bar */}
      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by title, abstract, keywords, or authors..."
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className={styles.searchInput}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={styles.filterToggle}
          >
            <FiFilter />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className={styles.filtersPanel}>
            <div className={styles.filtersGrid}>
              <div className={styles.filterGroup}>
                <label>Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Author</label>
                <input
                  type="text"
                  placeholder="Author name..."
                  value={filters.author}
                  onChange={(e) => handleFilterChange('author', e.target.value)}
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Date Range</label>
                <div className={styles.dateRange}>
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label>Sort By</label>
                <div className={styles.sortControls}>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  >
                    {sortOptions.map(sort => (
                      <option key={sort.value} value={sort.value}>{sort.label}</option>
                    ))}
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.filterActions}>
              <button onClick={clearFilters} className={styles.clearBtn}>
                Clear Filters
              </button>
              <button onClick={exportResults} className={styles.exportBtn}>
                <FiDownload />
                Export Results
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className={styles.resultsSection}>
        <div className={styles.resultsHeader}>
          <h3>
            {totalResults > 0 ? (
              <>Found {totalResults} manuscript{totalResults !== 1 ? 's' : ''}</>
            ) : (
              'No manuscripts found'
            )}
          </h3>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Searching manuscripts...</p>
          </div>
        ) : (
          <div className={styles.resultsList}>
            {manuscripts.map((manuscript) => (
              <div key={manuscript._id} className={styles.resultCard}>
                <div className={styles.cardHeader}>
                  <h4>
                    <Link href={`/articles/${manuscript._id}`}>
                      {manuscript.title}
                    </Link>
                  </h4>
                  <div className={styles.metadata}>
                    <span className={styles.category}>{manuscript.category}</span>
                    <span className={styles.status} data-status={manuscript.status}>
                      {manuscript.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.authors}>
                    <FiUser />
                    {manuscript.authors.slice(0, 3).map(author => author.name).join(', ')}
                    {manuscript.authors.length > 3 && ` +${manuscript.authors.length - 3} more`}
                  </div>

                  <p className={styles.abstract}>
                    {manuscript.abstract.substring(0, 250)}
                    {manuscript.abstract.length > 250 && '...'}
                  </p>

                  <div className={styles.keywords}>
                    <FiTag />
                    {manuscript.keywords.slice(0, 5).map((keyword, index) => (
                      <span key={index} className={styles.keyword}>{keyword}</span>
                    ))}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.dates}>
                    <span>
                      <FiCalendar />
                      Submitted: {new Date(manuscript.submissionDate).toLocaleDateString()}
                    </span>
                    {manuscript.publishedDate && (
                      <span>
                        Published: {new Date(manuscript.publishedDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className={styles.metrics}>
                    <span>
                      <FiEye />
                      {manuscript.metrics.views} views
                    </span>
                    <span>
                      <FiDownload />
                      {manuscript.metrics.downloads} downloads
                    </span>
                    <span>
                      Citations: {manuscript.metrics.citations}
                    </span>
                  </div>

                  {manuscript.doi && (
                    <div className={styles.doi}>
                      <a
                        href={`https://doi.org/${manuscript.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        DOI: {manuscript.doi} <FiExternalLink />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={styles.pageBtn}
            >
              Previous
            </button>

            {getPaginationRange().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                disabled={page === '...'}
                className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={styles.pageBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
