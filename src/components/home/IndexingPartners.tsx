'use client';

import { useState, useEffect } from 'react';
import styles from './IndexingPartners.module.scss';

interface IndexingPartner {
  _id: string;
  name: string;
  description: string;
  website: string;
  logo: {
    url: string;
    publicId: string;
    originalName: string;
  };
  order: number;
}

export default function IndexingPartners() {
  const [partners, setPartners] = useState<IndexingPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/indexing-partners');
      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners || []);
      }
    } catch (error) {
      console.error('Error fetching indexing partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className={styles.indexingPartners}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Indexing, Database, and Repository</h2>
            <p>Our journal is indexed and available in leading academic databases</p>
          </div>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading partners...</p>
          </div>
        </div>
      </section>
    );
  }

  if (partners.length === 0) {
    return null; // Don't show section if no partners
  }

  return (
    <section className={styles.indexingPartners}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2>Indexing, Database, and Repository</h2>
          <p>Our journal is indexed and available in leading academic databases and repositories worldwide</p>
        </div>
        
        <div className={styles.partnersGallery}>
          {partners.map((partner) => (
            <div
              key={partner._id}
              className={styles.partnerItem}
              title={`${partner.name}${partner.description ? ` - ${partner.description}` : ''}`}
            >
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.partnerLink}
              >
                <div className={styles.partnerLogo}>
                  <img 
                    src={partner.logo.url} 
                    alt={partner.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder-logo.svg';
                    }}
                  />
                </div>
              </a>
              <div className={styles.tooltip}>
                <h4>{partner.name}</h4>
                {partner.description && <p>{partner.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
