'use client';

import { useEffect, useState } from 'react';

interface Manuscript {
  _id: string;
  title: string;
  status: string;
  copyEditingStage?: string;
  category: string;
  latestManuscriptFiles?: any[];
}

interface APIResponse {
  manuscripts: Manuscript[];
  debug?: any;
}

interface APIError {
  error: string;
}

export default function TestPublicationAPI() {
  const [data, setData] = useState<APIResponse | null>(null);
  const [error, setError] = useState<APIError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing publication dashboard API...');
        
        const response = await fetch('/api/manuscripts/publication-dashboard');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('API Success:', responseData);
          setData(responseData);
        } else {
          const errorData = await response.json();
          console.log('API Error:', errorData);
          setError(errorData);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError({ error: String(err) });
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Publication Dashboard API Test</h1>
      
      {error && (
        <div style={{ background: '#fee', border: '1px solid #f00', padding: '10px', margin: '10px 0' }}>
          <h2>Error:</h2>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      
      {data && (
        <div style={{ background: '#efe', border: '1px solid #0f0', padding: '10px', margin: '10px 0' }}>
          <h2>Success:</h2>
          <p><strong>Total Manuscripts:</strong> {data.manuscripts?.length || 0}</p>
          
          {data.debug && (
            <div>
              <h3>Debug Info:</h3>
              <pre>{JSON.stringify(data.debug, null, 2)}</pre>
            </div>
          )}
          
          {data.manuscripts && data.manuscripts.length > 0 && (
            <div>
              <h3>Manuscripts:</h3>
              {data.manuscripts.map((manuscript: Manuscript, index: number) => (
                <div key={manuscript._id} style={{ border: '1px solid #ccc', padding: '10px', margin: '5px 0' }}>
                  <h4>{manuscript.title}</h4>
                  <p>Status: {manuscript.status}</p>
                  <p>Copy Editing Stage: {manuscript.copyEditingStage || 'None'}</p>
                  <p>Category: {manuscript.category}</p>
                  <p>Latest Files: {manuscript.latestManuscriptFiles?.length || 0}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
