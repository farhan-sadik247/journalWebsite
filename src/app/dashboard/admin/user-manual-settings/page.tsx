'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiEdit3, 
  FiTrash2, 
  FiSave, 
  FiX, 
  FiImage, 
  FiType,
  FiBold,
  FiItalic,
  FiUnderline,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight
} from 'react-icons/fi';
import styles from './UserManualSettings.module.scss';

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

export default function UserManualSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userManualItems, setUserManualItems] = useState<UserManualItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<UserManualItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'text' as 'text' | 'image',
    heading: '',
    content: '',
    order: 0,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // Rich text editor refs
  const textEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const hasAdminAccess = session.user.roles?.includes('admin') || 
                          session.user.currentActiveRole === 'admin' || 
                          session.user.role === 'admin';

    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }

    fetchUserManualItems();
  }, [session, status, router]);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (textEditorRef.current) {
      setFormData(prev => ({
        ...prev,
        content: textEditorRef.current!.innerHTML
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate form data
    if (!formData.heading.trim()) {
      alert('Please enter a heading');
      return;
    }

    if (formData.type === 'text') {
      // Check if content is empty or only contains HTML tags without text
      const textContent = textEditorRef.current?.textContent?.trim() || '';
      const htmlContent = formData.content.trim();
      
      if (!textContent || !htmlContent || htmlContent === '<br>' || htmlContent === '<div><br></div>') {
        alert('Please enter content for the text section');
        return;
      }
    }

    if (formData.type === 'image' && !editingItem && !selectedImage) {
      alert('Please select an image for the image section');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitFormData = new FormData();
      
      if (editingItem) {
        submitFormData.append('id', editingItem._id);
      }
      
      submitFormData.append('type', formData.type);
      submitFormData.append('heading', formData.heading);
      
      // Ensure content is never empty - provide default for image types
      const contentToSubmit = formData.content.trim() || 
        (formData.type === 'image' ? 'Image content' : '');
      submitFormData.append('content', contentToSubmit);
      
      submitFormData.append('order', formData.order.toString());
      
      if (formData.type === 'image' && selectedImage) {
        submitFormData.append('image', selectedImage);
      }

      const method = editingItem ? 'PUT' : 'POST';
      const response = await fetch('/api/user-manual', {
        method,
        body: submitFormData,
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchUserManualItems();
        resetForm();
        setShowForm(false);
      } else {
        console.error('Error saving user manual item:', data.error);
      }
    } catch (error) {
      console.error('Error saving user manual item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: UserManualItem) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      heading: item.heading,
      content: item.content,
      order: item.order,
    });
    
    if (item.type === 'image' && item.imageUrl) {
      setImagePreview(item.imageUrl);
    }
    
    setShowForm(true);
    
    // Set content in rich text editor
    setTimeout(() => {
      if (textEditorRef.current && item.type === 'text') {
        textEditorRef.current.innerHTML = item.content;
      }
    }, 100);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/user-manual?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchUserManualItems();
      } else {
        console.error('Error deleting item:', data.error);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'text',
      heading: '',
      content: '',
      order: 0,
    });
    setSelectedImage(null);
    setImagePreview('');
    setEditingItem(null);
    if (textEditorRef.current) {
      textEditorRef.current.innerHTML = '';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.loading}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!session?.user.roles?.includes('admin')) {
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
    <div className={styles.userManualSettings}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <Link href="/dashboard/admin" className={styles.backButton}>
              <FiArrowLeft />
              Back to Admin Dashboard
            </Link>
          </div>
          <div className={styles.headerContent}>
            <div>
              <h1>User Manual Settings</h1>
              <p>Manage user manual content displayed in the About section and footer</p>
            </div>
            <button 
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="btn btn-primary"
            >
              <FiPlus />
              Add New Item
            </button>
          </div>
        </div>

        {showForm && (
          <div className={styles.formOverlay}>
            <div className={styles.formModal}>
              <div className={styles.formHeader}>
                <h2>{editingItem ? 'Edit User Manual Item' : 'Add New User Manual Item'}</h2>
                <button onClick={() => setShowForm(false)} className={styles.closeButton}>
                  <FiX />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="type">Content Type</label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        type: e.target.value as 'text' | 'image' 
                      }))}
                      required
                    >
                      <option value="text">Text</option>
                      <option value="image">Image</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="order">Display Order</label>
                    <input
                      type="number"
                      id="order"
                      value={formData.order}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        order: parseInt(e.target.value) || 0 
                      }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="heading">Heading</label>
                  <input
                    type="text"
                    id="heading"
                    value={formData.heading}
                    onChange={(e) => setFormData(prev => ({ ...prev, heading: e.target.value }))}
                    required
                    placeholder="Enter the heading for this section"
                  />
                </div>

                {formData.type === 'text' ? (
                  <div className={styles.formGroup}>
                    <label>Content</label>
                    <div className={styles.richTextEditor}>
                      <div className={styles.toolbar}>
                        <button
                          type="button"
                          onClick={() => formatText('bold')}
                          className={styles.toolbarButton}
                          title="Bold"
                        >
                          <FiBold />
                        </button>
                        <button
                          type="button"
                          onClick={() => formatText('italic')}
                          className={styles.toolbarButton}
                          title="Italic"
                        >
                          <FiItalic />
                        </button>
                        <button
                          type="button"
                          onClick={() => formatText('underline')}
                          className={styles.toolbarButton}
                          title="Underline"
                        >
                          <FiUnderline />
                        </button>
                        <div className={styles.separator}></div>
                        <button
                          type="button"
                          onClick={() => formatText('justifyLeft')}
                          className={styles.toolbarButton}
                          title="Align Left"
                        >
                          <FiAlignLeft />
                        </button>
                        <button
                          type="button"
                          onClick={() => formatText('justifyCenter')}
                          className={styles.toolbarButton}
                          title="Align Center"
                        >
                          <FiAlignCenter />
                        </button>
                        <button
                          type="button"
                          onClick={() => formatText('justifyRight')}
                          className={styles.toolbarButton}
                          title="Align Right"
                        >
                          <FiAlignRight />
                        </button>
                        <div className={styles.separator}></div>
                        <select
                          onChange={(e) => formatText('foreColor', e.target.value)}
                          className={styles.colorSelect}
                          title="Text Color"
                        >
                          <option value="">Color</option>
                          <option value="#000000">Black</option>
                          <option value="#FF0000">Red</option>
                          <option value="#0000FF">Blue</option>
                          <option value="#008000">Green</option>
                          <option value="#800080">Purple</option>
                          <option value="#FFA500">Orange</option>
                        </select>
                      </div>
                      <div
                        ref={textEditorRef}
                        contentEditable
                        className={styles.textEditor}
                        onInput={() => {
                          if (textEditorRef.current) {
                            setFormData(prev => ({
                              ...prev,
                              content: textEditorRef.current!.innerHTML
                            }));
                          }
                        }}
                        data-placeholder="Enter your content here..."
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.formGroup}>
                      <label htmlFor="image">Image Upload</label>
                      <input
                        type="file"
                        id="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        required={!editingItem}
                      />
                      <small>
                        Upload an image file (JPG, PNG, GIF - max 5MB). Recommended size: 800x600px
                      </small>
                      
                      {imagePreview && (
                        <div className={styles.imagePreview}>
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className={styles.previewImage}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label htmlFor="content">Description (Optional)</label>
                      <textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Optional description for the image"
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
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
                        {editingItem ? 'Update Item' : 'Add Item'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={styles.itemsList}>
          {userManualItems.length === 0 ? (
            <div className={styles.emptyState}>
              <FiType />
              <h3>No user manual items yet</h3>
              <p>Add your first user manual item to get started.</p>
              <button 
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="btn btn-primary"
              >
                <FiPlus />
                Add First Item
              </button>
            </div>
          ) : (
            <div className={styles.itemsGrid}>
              {userManualItems.map((item) => (
                <div key={item._id} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemType}>
                      {item.type === 'text' ? <FiType /> : <FiImage />}
                      <span>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                    </div>
                    <div className={styles.itemOrder}>Order: {item.order}</div>
                  </div>
                  
                  <div className={styles.itemContent}>
                    <h3>{item.heading}</h3>
                    {item.type === 'text' ? (
                      <div 
                        className={styles.textPreview}
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    ) : (
                      <div className={styles.imageContainer}>
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.heading}
                            className={styles.itemImage}
                          />
                        )}
                        {item.content && (
                          <p className={styles.imageDescription}>{item.content}</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.itemActions}>
                    <button
                      onClick={() => handleEdit(item)}
                      className={styles.editButton}
                      title="Edit"
                    >
                      <FiEdit3 />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className={styles.deleteButton}
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
