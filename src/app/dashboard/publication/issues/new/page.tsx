'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import styles from './NewIssue.module.scss';

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  status: string;
}

export default function NewIssuePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [formData, setFormData] = useState({
    volumeId: '',
    number: '',
    title: '',
    description: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchVolumes();
  }, []);

  const fetchVolumes = async () => {
    try {
      const response = await fetch('/api/volumes');
      if (response.ok) {
        const data = await response.json();
        setVolumes(data.volumes || []);
      }
    } catch (error) {
      console.error('Error fetching volumes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        router.push('/dashboard/publication');
      } else {
        const error = await response.json();
        alert(`Error creating issue: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating issue:', error);
      alert('Failed to create issue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1>Access Denied</h1>
          <p>You don't have permission to create issues.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.newIssuePage}>
      <div className="container">
        <div className={styles.header}>
          <Link href="/dashboard/publication" className={styles.backButton}>
            <FiArrowLeft />
            Back to Publication Dashboard
          </Link>
          <h1>Create New Issue</h1>
          <p>Create a new issue within a journal volume</p>
        </div>

        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="volumeId">Select Volume *</label>
                <select
                  id="volumeId"
                  name="volumeId"
                  value={formData.volumeId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a volume</option>
                  {volumes.map((volume) => (
                    <option key={volume._id} value={volume._id}>
                      Volume {volume.number} ({volume.year}) - {volume.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="number">Issue Number *</label>
                <input
                  type="number"
                  id="number"
                  name="number"
                  value={formData.number}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="e.g., 1"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="title">Issue Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Special Issue on Machine Learning"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Brief description of the issue's focus or theme"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className={styles.formActions}>
              <Link href="/dashboard/publication" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !formData.volumeId}
              >
                {isLoading ? (
                  <>Creating...</>
                ) : (
                  <>
                    <FiSave />
                    Create Issue
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
