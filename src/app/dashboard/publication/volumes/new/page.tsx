'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiPlus } from 'react-icons/fi';
import styles from './NewVolume.module.scss';

export default function NewVolumePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    year: new Date().getFullYear().toString(),
    title: '',
    description: '',
    status: 'draft'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/volumes', {
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
        alert(`Error creating volume: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating volume:', error);
      alert('Failed to create volume');
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

  // Check if user has editor or admin role in either role or roles array
  const userRole = session?.user?.role;
  const userRoles = session?.user?.roles || [];
  const isEditor = userRole === 'editor' || userRoles.includes('editor');
  const isAdmin = userRole === 'admin' || userRoles.includes('admin');

  if (!session || (!isEditor && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1>Access Denied</h1>
          <p>You don't have permission to create volumes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.newVolumePage}>
      <div className="container">
        <div className={styles.header}>
          <Link href="/dashboard/publication" className={styles.backButton}>
            <FiArrowLeft />
            Back to Publication Dashboard
          </Link>
          <h1>Create New Volume</h1>
          <p>Create a new journal volume to organize published articles</p>
        </div>

        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="number">Volume Number *</label>
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

              <div className={styles.formGroup}>
                <label htmlFor="year">Year *</label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                  min="2020"
                  max="2030"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="title">Volume Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Advances in Computer Science"
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
                placeholder="Brief description of the volume's focus or theme"
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
                disabled={isLoading}
              >
                {isLoading ? (
                  <>Creating...</>
                ) : (
                  <>
                    <FiSave />
                    Create Volume
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
