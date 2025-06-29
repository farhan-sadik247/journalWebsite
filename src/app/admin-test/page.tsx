'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export default function AdminTestPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const initializeFounder = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast.success('Founder initialized successfully!');
      } else {
        toast.error(data.error || 'Failed to initialize founder');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to initialize founder');
    } finally {
      setLoading(false);
    }
  };

  const checkFounder = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin');
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast.success('Founder info retrieved');
      } else {
        toast.error(data.error || 'Failed to get founder info');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get founder info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Admin System Test</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Current Session</h2>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={initializeFounder}
          disabled={loading}
          style={{ 
            padding: '0.5rem 1rem', 
            marginRight: '1rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Initialize Founder'}
        </button>

        <button 
          onClick={checkFounder}
          disabled={loading}
          style={{ 
            padding: '0.5rem 1rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Check Founder Info'}
        </button>
      </div>

      {result && (
        <div>
          <h2>Result</h2>
          <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
