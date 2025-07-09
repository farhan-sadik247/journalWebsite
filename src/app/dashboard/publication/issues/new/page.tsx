'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import styles from './NewIssue.module.scss';
import toast from 'react-hot-toast';

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  status: string;
  issues?: Issue[];
}

interface Issue {
  _id: string;
  number: number;
  title: string;
}

interface FormData {
  volumeId: string;
  number: number;
  title: string;
  description: string;
  editorialNote: string;
  status: string;
  publishDate: Date | null;
}

export default function NewIssuePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [formData, setFormData] = useState<FormData>({
    volumeId: '',
    number: 1,
    title: '',
    description: '',
    editorialNote: '',
    status: 'draft',
    publishDate: null
  });
  const [selectedVolumeIssueCount, setSelectedVolumeIssueCount] = useState(0);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    if (!formData.volumeId) {
      toast.error('Please select a volume');
      return;
    }

    if (!formData.number) {
      toast.error('Issue number is required');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Issue title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitFormData = new FormData();
      submitFormData.append('volumeId', formData.volumeId);
      submitFormData.append('number', formData.number.toString());
      submitFormData.append('title', formData.title);
      submitFormData.append('description', formData.description);
      submitFormData.append('editorialNote', formData.editorialNote);
      submitFormData.append('status', formData.status);
      
      if (formData.publishDate instanceof Date) {
        submitFormData.append('publishDate', formData.publishDate.toISOString());
      }

      if (coverImageFile) {
        submitFormData.append('coverImage', coverImageFile);
      }

      const response = await fetch('/api/issues', {
        method: 'POST',
        body: submitFormData
      });

      if (response.ok) {
        toast.success('Issue created successfully');
        router.push('/dashboard/publication');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create issue');
      }
    } catch (error) {
      console.error('Error creating issue:', error);
      toast.error('Failed to create issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check issue count when volume is selected
    if (name === 'volumeId') {
      const selectedVolume = volumes.find(v => v._id === value);
      setSelectedVolumeIssueCount(selectedVolume?.issues?.length || 0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCoverImage = async (file: File): Promise<{ url: string; publicId: string; originalName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'cover');
    formData.append('folder', 'journal/covers');

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const result = await response.json();
    return result.data;
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
                    <option 
                      key={volume._id} 
                      value={volume._id}
                      disabled={volume.issues && volume.issues.length >= 4}
                    >
                      Volume {volume.number} ({volume.year}) - {volume.title}
                      {volume.issues && volume.issues.length >= 4 && ' (Max issues reached)'}
                    </option>
                  ))}
                </select>
                {formData.volumeId && selectedVolumeIssueCount >= 3 && (
                  <div className={styles.warning}>
                    <p>⚠️ This volume has {selectedVolumeIssueCount} issues. Maximum is 4 issues per volume.</p>
                  </div>
                )}
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
              <label htmlFor="editorialNote">Editorial Note / Theme</label>
              <textarea
                id="editorialNote"
                name="editorialNote"
                value={formData.editorialNote || ''}
                onChange={handleChange}
                rows={3}
                placeholder="Editorial note or special theme for this issue"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="coverImage">Cover Image</label>
              <input
                type="file"
                id="coverImage"
                name="coverImage"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <small className={styles.fieldHint}>
                Upload a cover image for this issue (JPEG, PNG, WebP, GIF - max 5MB)
              </small>
              {coverImagePreview && (
                <div className={styles.imagePreview}>
                  <img 
                    src={coverImagePreview} 
                    alt="Cover preview" 
                    className={styles.previewImage}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageFile(null);
                      setCoverImagePreview('');
                    }}
                    className={styles.removeImageBtn}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="publishDate">Publication Date</label>
                <input
                  type="date"
                  id="publishDate"
                  name="publishDate"
                  value={formData.publishDate ? formData.publishDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, publishDate: e.target.value ? new Date(e.target.value) : null }))}
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
                  <option value="open">Open for Submissions</option>
                  <option value="published">Published</option>
                </select>
              </div>
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
