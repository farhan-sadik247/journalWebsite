'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FiPlus, 
  FiEdit3, 
  FiTrash2, 
  FiExternalLink,
  FiImage,
  FiSave,
  FiX,
  FiUpload
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './HomePageManagement.module.scss';
import { PLACEHOLDER_URLS } from '@/lib/placeholders';

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
  isActive: boolean;
}

interface PartnerFormData {
  name: string;
  description: string;
  website: string;
  order: number;
  isActive: boolean;
}

export default function HomePageManagement() {
  const { data: session } = useSession();
  const [partners, setPartners] = useState<IndexingPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<IndexingPartner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [formData, setFormData] = useState<PartnerFormData>({
    name: '',
    description: '',
    website: '',
    order: 0,
    isActive: true
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/admin/indexing-partners');
      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners || []);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
      toast.error('Failed to load partners');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      website: '',
      order: 0,
      isActive: true
    });
    setLogoFile(null);
    setLogoPreview('');
    setEditingPartner(null);
    setShowForm(false);
  };

  const handleEdit = (partner: IndexingPartner) => {
    setFormData({
      name: partner.name,
      description: partner.description,
      website: partner.website,
      order: partner.order,
      isActive: partner.isActive
    });
    setLogoPreview(partner.logo.url);
    setEditingPartner(partner);
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<{ url: string; publicId: string; originalName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');
    formData.append('folder', 'indexing-partners');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Partner name is required');
      return;
    }
    
    if (!formData.website.trim()) {
      toast.error('Website URL is required');
      return;
    }

    if (!editingPartner && !logoFile) {
      toast.error('Logo image is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingPartner 
        ? `/api/indexing-partners/${editingPartner._id}`
        : '/api/indexing-partners';
      
      const method = editingPartner ? 'PUT' : 'POST';

      const submitFormData = new FormData();
      submitFormData.append('name', formData.name);
      submitFormData.append('description', formData.description);
      submitFormData.append('website', formData.website);
      submitFormData.append('order', formData.order.toString());
      
      if (logoFile) {
        submitFormData.append('logo', logoFile);
      }

      const response = await fetch(url, {
        method,
        body: submitFormData,
      });

      if (response.ok) {
        toast.success(editingPartner ? 'Partner updated successfully' : 'Partner created successfully');
        fetchPartners();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save partner');
      }
    } catch (error) {
      console.error('Error saving partner:', error);
      toast.error('Failed to save partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (partner: IndexingPartner) => {
    if (!confirm(`Are you sure you want to delete "${partner.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/indexing-partners/${partner._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Partner deleted successfully');
        fetchPartners();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete partner');
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      toast.error('Failed to delete partner');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  if (!session || session.user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1>Access Denied</h1>
          <p>You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.homePageManagement}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1>Home Page Management</h1>
            <p>Manage indexing partners, databases, and repositories displayed on the homepage</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus />
            Add Partner
          </button>
        </div>

        {showForm && (
          <div className={styles.formOverlay}>
            <div className={styles.formModal}>
              <div className={styles.formHeader}>
                <h2>{editingPartner ? 'Edit Partner' : 'Add New Partner'}</h2>
                <button onClick={resetForm} className={styles.closeButton}>
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Partner Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Google Scholar, PubMed, DOAJ"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description about the indexing partner"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="website">Website URL *</label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    required
                    placeholder="https://example.com"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="order">Display Order</label>
                    <input
                      type="number"
                      id="order"
                      name="order"
                      value={formData.order}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="logo">Partner Logo *</label>
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                  />
                  <small className={styles.fieldHint}>
                    Upload logo image (JPG, PNG, GIF - max 5MB). Recommended size: 200x100px
                  </small>
                  
                  {logoPreview && (
                    <div className={styles.imagePreview}>
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className={styles.previewImage}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
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
                        {editingPartner ? 'Update Partner' : 'Add Partner'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={styles.partnersGrid}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Loading partners...</p>
            </div>
          ) : partners.length === 0 ? (
            <div className={styles.emptyState}>
              <FiImage className={styles.emptyIcon} />
              <h3>No Partners Yet</h3>
              <p>Add your first indexing partner to get started</p>
            </div>
          ) : (
            partners.map((partner) => (
              <div key={partner._id} className={styles.partnerCard}>
                <div className={styles.partnerLogo}>
                  <img 
                    src={partner.logo.url} 
                    alt={partner.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_URLS.png;
                    }}
                  />
                </div>
                
                <div className={styles.partnerInfo}>
                  <h3>{partner.name}</h3>
                  {partner.description && (
                    <p className={styles.description}>{partner.description}</p>
                  )}
                  <div className={styles.partnerMeta}>
                    <span className={`${styles.status} ${partner.isActive ? styles.active : styles.inactive}`}>
                      {partner.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className={styles.order}>Order: {partner.order}</span>
                  </div>
                </div>

                <div className={styles.partnerActions}>
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.actionButton}
                    title="Visit Website"
                  >
                    <FiExternalLink />
                  </a>
                  <button
                    onClick={() => handleEdit(partner)}
                    className={styles.actionButton}
                    title="Edit Partner"
                  >
                    <FiEdit3 />
                  </button>
                  <button
                    onClick={() => handleDelete(partner)}
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    title="Delete Partner"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
