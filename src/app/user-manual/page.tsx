'use client';

import { useState, useEffect } from 'react';
import { FiBook, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import styles from './UserManual.module.scss';

interface UserManualItem {
  _id: string;
  type: 'text' | 'image';
  heading: string;
  content: string;
  imageUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UserManualPage() {
  const [userManualItems, setUserManualItems] = useState<UserManualItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserManualItems();
  }, []);

  const fetchUserManualItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user-manual');
      const data = await response.json();
      
      if (data.success) {
        setUserManualItems(data.userManualItems);
      }
    } catch (error) {
      console.error('Error fetching user manual items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div>Loading User Manual...</div>
      </div>
    );
  }

  return (
    <div className={styles.userManualPage}>
      <div className="container">
        <div className={styles.header}>
          <Link href="/" className={styles.backButton}>
            <FiArrowLeft />
            Back to Home
          </Link>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <div className={styles.iconWrapper}>
                <FiBook />
              </div>
              <div>
                <h1>User Manual</h1>
                <p>Complete guide to using our journal platform</p>
              </div>
            </div>
          </div>
        </div>

        {userManualItems.length === 0 ? (
          <div className={styles.emptyState}>
            <FiBook />
            <h3>User Manual Coming Soon</h3>
            <p>We&apos;re working on creating a comprehensive user manual for you. Please check back later.</p>
          </div>
        ) : (
          <div className={styles.manualContent}>
            {userManualItems.map((item) => (
              <div key={item._id} className={styles.manualSection}>
                <h2 className={styles.sectionHeading}>{item.heading}</h2>
                
                {item.type === 'text' ? (
                  <div 
                    className={styles.textContent}
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                ) : (
                  <div className={styles.imageSection}>
                    {item.imageUrl && (
                      <div className={styles.imageWrapper}>
                        <img 
                          src={item.imageUrl} 
                          alt={item.heading}
                          className={styles.manualImage}
                        />
                      </div>
                    )}
                    {item.content && (
                      <div className={styles.imageDescription}>
                        {item.content}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <p>
            Need additional help? <Link href="/contact">Contact our support team</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
