'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, 
  FiDownload, 
  FiEye, 
  FiCalendar, 
  FiUser, 
  FiTag, 
  FiBookmark,
  FiShare2,
  FiCopy,
  FiFileText
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './ArticleDetail.module.scss';

interface Article {
  _id: string;
  title: string;
  abstract: string;
  authors: Array<{ 
    name?: string; 
    firstName?: string;
    lastName?: string;
    email: string; 
    affiliation: string;
    orcid?: string;
  }>;
  category: string;
  keywords: string[];
  publishedDate: string;
  volume?: number;
  issue?: number;
  pages?: string;
  metrics?: {
    views: number;
    downloads: number;
    citations: number;
  };
}

export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [params.id]);

  const fetchArticle = async () => {
    try {
      const response = await fetch(`/api/articles?id=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.articles && data.articles.length > 0) {
          setArticle(data.articles[0]);
          // Increment view count
          await fetch(`/api/articles/${params.id}/view`, { method: 'POST' });
        } else {
          notFound();
        }
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!session) {
      toast.error('Please sign in to download the manuscript');
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch(`/api/manuscripts/${article?._id}/download`);
      if (response.ok) {
        // Increment download count
        await fetch(`/api/articles/${article?._id}/download-count`, { 
          method: 'POST' 
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Get the file extension from Content-Type or default to pdf
        const contentType = response.headers.get('Content-Type') || 'application/pdf';
        const ext = contentType.split('/').pop()?.split('+')[0] || 'pdf';
        a.download = `${article?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download started');
      } else {
        // Try to get the error message from the response
        try {
          const errorData = await response.json();
          toast.error(errorData.error || 'Download failed. Please try again later.');
        } catch (e) {
          // If we can't parse the error message, show a generic one
          toast.error('Download failed. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to connect to the server. Please check your internet connection and try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    toast.success(bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.abstract,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const generateCitation = () => {
    if (!article) return '';
    
    const authors = article.authors.map(author => 
      author.name || `${(author as any).firstName || ''} ${(author as any).lastName || ''}`.trim() || 'Unknown Author'
    ).join(', ');
    const year = new Date(article.publishedDate).getFullYear();
    const journal = 'Journal Name'; // You might want to make this configurable
    
    return `${authors} (${year}). ${article.title}. ${journal}${article.volume ? `, ${article.volume}` : ''}${article.issue ? `(${article.issue})` : ''}${article.pages ? `, ${article.pages}` : ''}.`;
  };

  const copyCitation = async () => {
    const citation = generateCitation();
    await navigator.clipboard.writeText(citation);
    toast.success('Citation copied to clipboard');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading article...</p>
      </div>
    );
  }

  if (!article) {
    return notFound();
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/articles" className={styles.backButton}>
          <FiArrowLeft />
          Back to Articles
        </Link>

        <div className={styles.headerActions}>
          <button 
            onClick={handleBookmark}
            className={`${styles.actionButton} ${bookmarked ? styles.bookmarked : ''}`}
            title="Bookmark"
          >
            <FiBookmark />
          </button>
          <button 
            onClick={handleShare}
            className={styles.actionButton}
            title="Share"
          >
            <FiShare2 />
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={styles.downloadButton}
            title={session ? "Download PDF" : "Sign in to download"}
          >
            {downloading ? (
              <div className={styles.downloadSpinner}></div>
            ) : (
              <FiDownload />
            )}
            {session ? 'Download PDF' : 'Sign in to Download'}
          </button>
        </div>
      </div>

      {/* Article Content */}
      <article className={styles.article}>
        {/* Title and Metadata */}
        <header className={styles.articleHeader}>
          {/* Article Metadata */}
          <div className={styles.metadata}>
            <div className={styles.metadataItem}>
              <FiCalendar />
              <span>Published: {new Date(article.publishedDate).toLocaleDateString()}</span>
            </div>
            <div className={styles.metadataItem}>
              <FiTag />
              <span>{article.category}</span>
            </div>
            {article.volume && article.issue && (
              <div className={styles.metadataItem}>
                <FiFileText />
                <span>Volume {article.volume}, Issue {article.issue}</span>
              </div>
            )}
            <div className={styles.metadataItem}>
              <FiEye />
              <span>{article.metrics?.views || 0} Views</span>
            </div>
            <div className={styles.metadataItem}>
              <FiDownload />
              <span>{article.metrics?.downloads || 0} Downloads</span>
            </div>
          </div>

          <h1 className={styles.title}>{article.title}</h1>

          {/* Authors */}
          <div className={styles.authors}>
            <FiUser className={styles.icon} />
            <div className={styles.authorsList}>
              {article.authors.map((author, index) => (
                <div key={index} className={styles.author}>
                  <span className={styles.authorName}>
                    {author.name || `${(author as any).firstName || ''} ${(author as any).lastName || ''}`.trim() || 'Unknown Author'}
                  </span>
                  <span className={styles.affiliation}>{author.affiliation}</span>
                  {author.orcid && (
                    <a 
                      href={`https://orcid.org/${author.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.orcid}
                    >
                      ORCID
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Publication Info */}
          <div className={styles.publicationInfo}>
            <div className={styles.infoItem}>
              <FiCalendar className={styles.icon} />
              <span>Published: {new Date(article.publishedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>

          {/* Metrics */}
          {article.metrics && (
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <FiEye />
                <span>{article.metrics.views || 0} views</span>
              </div>
              <div className={styles.metric}>
                <FiDownload />
                <span>{article.metrics.downloads || 0} downloads</span>
              </div>
              <div className={styles.metric}>
                <FiCopy />
                <span>{article.metrics.citations || 0} citations</span>
              </div>
            </div>
          )}
        </header>

        {/* Abstract */}
        <section className={styles.abstract}>
          <h2>Abstract</h2>
          <p>{article.abstract}</p>
        </section>

        {/* Keywords */}
        {article.keywords && article.keywords.length > 0 && (
          <section className={styles.keywords}>
            <h3>
              <FiTag />
              Keywords
            </h3>
            <div className={styles.keywordsList}>
              {article.keywords.map((keyword, index) => (
                <span key={index} className={styles.keyword}>
                  {keyword}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Citation */}
        <section className={styles.citation}>
          <h3>
            <FiFileText />
            How to Cite
          </h3>
          <div className={styles.citationBox}>
            <p className={styles.citationText}>{generateCitation()}</p>
            <button 
              onClick={copyCitation}
              className={styles.copyCitation}
              title="Copy citation"
            >
              <FiCopy />
              Copy Citation
            </button>
          </div>
        </section>

        {/* Download Section for Non-logged Users */}
        {!session && (
          <section className={styles.loginPrompt}>
            <div className={styles.promptCard}>
              <FiDownload className={styles.promptIcon} />
              <h3>Access Full Article</h3>
              <p>Sign in to download the complete manuscript and access additional features.</p>
              <Link href="/auth/signin" className={styles.signInButton}>
                Sign In
              </Link>
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
