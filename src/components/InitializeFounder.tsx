'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export function InitializeFounder() {
  const { data: session } = useSession();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeFounder = async () => {
      try {
        // Check if founder is already initialized
        const checkResponse = await fetch('/api/admin');
        const checkData = await checkResponse.json();
        
        if (checkData.requiresInit) {
          // Initialize founder
          const initResponse = await fetch('/api/admin', {
            method: 'POST',
          });
          
          if (initResponse.ok) {
            const initData = await initResponse.json();
            console.log('Founder initialized:', initData.message);
            setIsInitialized(true);
          }
        } else {
          console.log('Founder already exists:', checkData.founder?.email);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error checking/initializing founder:', error);
      }
    };

    // Only run once on app startup
    if (!isInitialized) {
      initializeFounder();
    }
  }, [isInitialized]);

  return null; // This component doesn't render anything
}
