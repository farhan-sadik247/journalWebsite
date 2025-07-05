'use client';

import { useEffect, useState } from 'react';

interface ConfigData {
  config: {
    nodeEnv: string;
    nextAuthUrl: string;
    hasGoogleClientId: boolean;
    hasGoogleClientSecret: boolean;
    hasNextAuthSecret: boolean;
    baseUrl: string;
  };
  expectedCallbackUrl: string;
  instructions: string[];
}

export default function OAuthDebugPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/debug-oauth')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>OAuth Configuration Debug</h1>
      
      <h2>Current Configuration:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {JSON.stringify(config?.config, null, 2)}
      </pre>

      <h2>Expected Callback URL:</h2>
      <div style={{ background: '#e8f5e8', padding: '10px', borderRadius: '4px', margin: '10px 0' }}>
        <strong>{config?.expectedCallbackUrl}</strong>
      </div>

      <h2>Google Cloud Console Setup:</h2>
      <ol>
        {config?.instructions?.map((instruction: string, index: number) => (
          <li key={index}>{instruction}</li>
        ))}
      </ol>

      <h2>Common Issues:</h2>
      <ul>
        <li>Redirect URI must be EXACTLY: <code>{config?.expectedCallbackUrl}</code></li>
        <li>No trailing slashes</li>
        <li>Case sensitive</li>
        <li>Must use HTTPS in production</li>
        <li>Changes can take 5-10 minutes to take effect</li>
      </ul>

      <h2>Test OAuth:</h2>
      <button 
        onClick={() => window.location.href = '/auth/signin'}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Sign In
      </button>
    </div>
  );
}
