import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from '../ArticlesPage.module.scss';

async function getArticle(id: string) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window === 'undefined'
      ? 'http://localhost:3000'
      : window.location.origin);
  const res = await fetch(`${base}/api/articles?id=${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.articles || !data.articles.length) return null;
  return data.articles[0];
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const article = await getArticle(params.id);
  if (!article) return notFound();

  return (
    <div className={styles.articleDetail}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/articles" className={styles.backLink}>&larr; Back to Articles</Link>
        <a
          href={`/api/manuscripts/${article._id}/download`}
          className={styles.downloadButton || 'btn btn-primary'}
          style={{ marginLeft: 'auto' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download Article
        </a>
      </div>
      <h1 className={styles.title}>{article.title}</h1>
      <div className={styles.meta}>
        <span>Category: {article.category || 'N/A'}</span>
        {article.volume && <span>Vol. {article.volume}</span>}
        {article.issue && <span>No. {article.issue}</span>}
        {article.pages && <span>Pages: {article.pages}</span>}
        {article.doi && <span>DOI: {article.doi}</span>}
        {article.publishedDate && <span>Published: {new Date(article.publishedDate).toLocaleDateString()}</span>}
      </div>
      <div className={styles.authors}>
        <strong>Authors:</strong> {article.authors && article.authors.length > 0 ? article.authors.map((a: any) => a.name).join(', ') : 'N/A'}
      </div>
      <div className={styles.abstract}>
        <h2>Abstract</h2>
        <p>{article.abstract || 'No abstract available.'}</p>
      </div>
      {/* Add more fields as needed */}
    </div>
  );
}
