'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FiArrowLeft, FiSave, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './EditIssue.module.scss';

interface Volume {
  _id: string;
  number: number;
  year: number;
  title: string;
  issues: any[];
}

interface Issue {
  _id: string;
  number: number;
  title: string;
  description: string;
  editorialNote: string;
  isPublished: boolean;
  publishedDate?: string;
  volume: Volume;
  coverImage?: {
    url: string;
    publicId: string;
    originalName: string;
  };
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

export default function EditIssuePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [formData, setFormData] = useState<FormData>({
    volumeId: '',
    number: 1,
    title: '',
    description: '',
    editorialNote: '',
    status: 'draft',
    publishDate: null
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueId = params?.id as string;

  useEffect(() => {
    if (session && issueId) {
      fetchIssueData();
    }
  }, [session, issueId]);

  const fetchIssueData = async () => {
    try {
      const response = await fetch(`/api/issues/${issueId}`);
      
      if (response.ok) {
        const data = await response.json();
        const issueData = data.issue;
        setIssue(issueData);
        
        // Populate form data
        setFormData({
          volumeId: issueData.volume._id,
          number: issueData.number,
          title: issueData.title || '',
          description: issueData.description || '',
          editorialNote: issueData.editorialNote || '',
          status: issueData.isPublished ? 'published' : 'draft',
          publishDate: issueData.publishedDate ? 
            new Date(issueData.publishedDate) : null
        });

        // Set cover image preview if exists
        if (issueData.coverImage?.url) {
          setCoverImagePreview(issueData.coverImage.url);
        }
      } else {
        toast.error('Failed to load issue data');
        router.push('/dashboard/publication');
      }
    } catch (error) {
      console.error('Error fetching issue data:', error);
      toast.error('Error loading issue data');
      router.push('/dashboard/publication');
    } finally {
      setIsLoadingData(false);
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

      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PUT',
        body: submitFormData
      });

      if (response.ok) {
        toast.success('Issue updated successfully');
        router.push('/dashboard/publication');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update issue');
      }
    } catch (error) {
      console.error('Error updating issue:', error);
      toast.error('Failed to update issue');
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

  const handleRemoveCoverImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview('');
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

  const handleDeleteIssue = async () => {
    if (!confirm(`Are you sure you want to delete this issue? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Issue deleted successfully!');
        router.push('/dashboard/publication');
      } else {
        const error = await response.json();
        toast.error(`Error deleting issue: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Failed to delete issue');
    }
  };

  if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1>Access Denied</h1>
          <p>You don't have permission to edit issues.</p>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading issue data...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1>Issue Not Found</h1>
          <p>The issue you're looking for doesn't exist.</p>
          <Link href="/dashboard/publication" className="btn btn-primary">
            Back to Publication Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editIssuePage}>
      <div className="container">
        <div className={styles.header}>
          <Link 
            href={`/dashboard/publication/issues/${issueId}`} 
            className={styles.backButton}
          >
            <FiArrowLeft />
            Back to Issue Details
          </Link>
          <div className={styles.headerInfo}>
            <h1>Edit Issue</h1>
            <p>Volume {issue.volume.number}, Issue {issue.number} - {issue.volume.title} ({issue.volume.year})</p>
          </div>
        </div>

        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit} className={styles.form}>
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
                value={formData.editorialNote}
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
                    onClick={handleRemoveCoverImage}
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
                  onChange={handleChange}
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
              <div className={styles.leftActions}>
                <button
                  type="button"
                  onClick={handleDeleteIssue}
                  className="btn btn-danger"
                >
                  <FiTrash2 />
                  Delete Issue
                </button>
              </div>
              
              <div className={styles.rightActions}>
                <Link 
                  href={`/dashboard/publication/issues/${issueId}`} 
                  className="btn btn-secondary"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <FiSave />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
