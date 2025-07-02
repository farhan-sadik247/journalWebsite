// Simple test page to verify articles are working
'use client';

import { useState, useEffect } from 'react';

interface Article {
  _id: string;
  title: string;
  category: string;
  authors: Array<{ name: string }>;
  publishedDate: string;
  volume: number;
  issue: number;
}

export default function TestArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        console.log('🔍 Testing articles fetch...');
        const response = await fetch('/api/articles');
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Received data:', data);
          setArticles(data.articles || []);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.error('❌ Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (loading) return <div>Loading test articles...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Articles Page</h1>
      <p>Found {articles.length} articles</p>
      {articles.map((article, index) => (
        <div key={article._id} style={{ 
          border: '1px solid #ccc', 
          margin: '10px 0', 
          padding: '10px' 
        }}>
          <h3>{article.title}</h3>
          <p><strong>Category:</strong> {article.category}</p>
          <p><strong>Authors:</strong> {article.authors?.map((a: any) => a.name).join(', ')}</p>
          <p><strong>Published:</strong> {article.publishedDate}</p>
          <p><strong>Volume/Issue:</strong> Vol {article.volume}, Issue {article.issue}</p>
        </div>
      ))}
    </div>
  );
}
