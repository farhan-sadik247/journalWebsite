'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './CategoriesPage.module.scss';

interface Category {
  _id: string;
  name: string;
  details: string;
  image: {
    url: string;
    publicId: string;
    altText: string;
  };
  isActive: boolean;
  order: number;
  createdBy: {
    name: string;
    email: string;
  };
  updatedBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Check if user has permission (admin or editor)
  const hasPermission = session?.user?.role === 'admin' || session?.user?.role === 'editor';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      
      if (response.ok) {
        setCategories(data.categories);
      } else {
        toast.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error fetching categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Category deleted successfully');
        fetchCategories();
        setDeleteConfirm(null);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error deleting category');
    }
  };

  if (!hasPermission) {
    return (
      <div className={styles.unauthorizedPage}>
        <div className={styles.unauthorizedContent}>
          <h1>Access Denied</h1>
          <p>You don&apos;t have permission to manage categories. Only admins and editors can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner}></div>
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className={styles.categoriesPage}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1>Manage Categories</h1>
            <p>Create and manage article categories for your journal</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`btn btn-primary ${styles.createButton}`}
          >
            <FiPlus />
            Create Category
          </button>
        </div>

        {categories.length > 0 ? (
          <div className={styles.categoriesTable}>
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={category._id} className={!category.isActive ? styles.inactive : ''}>
                    <td className={styles.numberCell}>{index + 1}</td>
                    <td className={styles.imageCell}>
                      <div className={styles.categoryImageSmall}>
                        <img src={category.image.url} alt={category.image.altText || category.name} />
                      </div>
                    </td>
                    <td className={styles.nameCell}>
                      <span className={styles.categoryName}>{category.name}</span>
                    </td>
                    <td className={styles.detailsCell}>
                      <span className={styles.categoryDetails}>{category.details}</span>
                    </td>
                    <td className={styles.statusCell}>
                      <span className={`${styles.statusBadge} ${category.isActive ? styles.active : styles.inactive}`}>
                        {category.isActive ? (
                          <>
                            <FiEye />
                            Active
                          </>
                        ) : (
                          <>
                            <FiEyeOff />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.categoryActions}>
                        <button
                          onClick={() => setEditingCategory(category)}
                          className={styles.editButton}
                          title="Edit category"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(category._id)}
                          className={styles.deleteButton}
                          title="Delete category"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <FiImage className={styles.emptyIcon} />
            <h3>No Categories Created</h3>
            <p>Create your first category to organize manuscript submissions.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <FiPlus />
              Create First Category
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Category Modal */}
      {(showCreateModal || editingCategory) && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingCategory(null);
            fetchCategories();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Delete Category</h3>
            <p>Are you sure you want to delete this category? This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Category Create/Edit Modal Component
function CategoryModal({ 
  category, 
  onClose, 
  onSuccess 
}: { 
  category: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    details: category?.details || '',
    order: category?.order || 0,
    isActive: category?.isActive ?? true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(category?.image.url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.details.trim()) {
      toast.error('Name and details are required');
      return;
    }

    if (!category && !imageFile) {
      toast.error('Image is required for new categories');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('details', formData.details.trim());
      submitData.append('order', formData.order.toString());
      submitData.append('isActive', formData.isActive.toString());
      
      if (imageFile) {
        submitData.append('image', imageFile);
      }

      const url = category ? `/api/categories/${category._id}` : '/api/categories';
      const method = category ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: submitData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Category ${category ? 'updated' : 'created'} successfully`);
        onSuccess();
      } else {
        toast.error(data.error || `Failed to ${category ? 'update' : 'create'} category`);
      }
    } catch (error) {
      console.error('Error submitting category:', error);
      toast.error('Error submitting category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3>{category ? 'Edit Category' : 'Create New Category'}</h3>
        
        <form onSubmit={handleSubmit} className={styles.categoryForm}>
          <div className={styles.formGroup}>
            <label>Category Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter category name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description *</label>
            <textarea
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              placeholder="Enter category description"
              rows={4}
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Display Order</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Category Image {!category && '*'}</label>
            <div className={styles.imageUpload}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
              
              {imagePreview && (
                <div className={styles.imagePreview}>
                  <img src={imagePreview} alt="Preview" />
                </div>
              )}
              
              <div className={styles.uploadHelp}>
                <FiImage />
                <span>Click to upload image (max 5MB)</span>
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner" />
                  {category ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {category ? 'Update Category' : 'Create Category'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
