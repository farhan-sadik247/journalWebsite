'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiSave, FiUser, FiMail, FiMapPin, FiBook, FiExternalLink, FiEdit, FiImage, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './Profile.module.scss';

interface ProfileData {
  name: string;
  email: string;
  affiliation: string;
  bio: string;
  expertise: string[];
  orcid: string;
  profileImage: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    email: '',
    affiliation: '',
    bio: '',
    expertise: [],
    orcid: '',
    profileImage: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newExpertise, setNewExpertise] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user) {
      fetchUserProfile();
    }
  }, [session, status, router]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        
        setFormData({
          name: user.name || '',
          email: user.email || '',
          affiliation: user.affiliation || '',
          bio: user.bio || '',
          expertise: user.expertise || [],
          orcid: user.orcid || '',
          profileImage: user.profileImage || '',
        });
        
        // Set initial image preview if user has profile image
        if (user.profileImage) {
          setImagePreview(user.profileImage);
        }
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !formData.expertise.includes(newExpertise.trim())) {
      setFormData(prev => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()]
      }));
      setNewExpertise('');
    }
  };

  const removeExpertise = (index: number) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let profileImageUrl = formData.profileImage;
      
      // Upload new image if selected
      if (selectedImage) {
        const uploadedUrl = await uploadImage(selectedImage);
        if (uploadedUrl) {
          profileImageUrl = uploadedUrl;
        } else {
          // If image upload fails, don't proceed with form submission
          setIsSaving(false);
          return;
        }
      }

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          affiliation: formData.affiliation,
          bio: formData.bio,
          expertise: formData.expertise,
          orcid: formData.orcid,
          profileImage: profileImageUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update form data with new image URL
        setFormData(prev => ({ ...prev, profileImage: profileImageUrl }));
        setSelectedImage(null);
        
        // Update session with new user data
        await update({
          ...session,
          user: {
            ...session?.user,
            name: data.user.name,
            image: profileImageUrl,
          },
        });
        
        toast.success('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 2MB for better performance)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Try Cloudinary upload first
      let response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.imageUrl;
      }
      
      // Fallback to base64 if Cloudinary fails
      response = await fetch('/api/upload/base64', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.imageUrl;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className={styles.profilePage}>
        <div className="container">
          <div className="min-h-screen flex items-center justify-center">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className={styles.profilePage}>
      <div className="container">
        <div className={styles.profileHeader}>
          <h1>Profile Settings</h1>
          <p>Manage your personal information and academic profile</p>
        </div>

        <div className={styles.profileContent}>
          <div className={styles.profileCard}>
            <div className={styles.cardHeader}>
              <FiUser className={styles.cardIcon} />
              <h2>Personal Information</h2>
            </div>

            <form onSubmit={handleSubmit} className={styles.profileForm}>
              {/* Profile Image Section */}
              <div className={styles.profileImageSection}>
                <div className={styles.currentImage}>
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt={formData.name}
                      className={styles.profileImagePreview}
                    />
                  ) : (
                    <div className={styles.profileImagePlaceholder}>
                      <FiUser />
                    </div>
                  )}
                </div>
                <div className={styles.imageUploadControls}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <FiImage />
                      Profile Image
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className={styles.fileInput}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`${styles.uploadButton} btn btn-secondary`}
                    >
                      <FiUpload />
                      {selectedImage ? 'Change Image' : 'Upload Image'}
                    </button>
                    {selectedImage && (
                      <p className={styles.selectedFile}>
                        Selected: {selectedImage.name}
                      </p>
                    )}
                    <small className={styles.formHint}>
                      Upload a profile image (PNG, JPG, JPEG - Max 2MB)
                    </small>
                  </div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FiUser />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={styles.formInput}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FiMail />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    className={`${styles.formInput} ${styles.disabled}`}
                    disabled
                  />
                  <small className={styles.formHint}>
                    Email cannot be changed
                  </small>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FiMapPin />
                    Affiliation
                  </label>
                  <input
                    type="text"
                    value={formData.affiliation}
                    onChange={(e) => handleInputChange('affiliation', e.target.value)}
                    className={styles.formInput}
                    placeholder="University, Institution, or Organization"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FiExternalLink />
                    ORCID ID
                  </label>
                  <input
                    type="text"
                    value={formData.orcid}
                    onChange={(e) => handleInputChange('orcid', e.target.value)}
                    className={styles.formInput}
                    placeholder="0000-0000-0000-0000"
                  />
                  <small className={styles.formHint}>
                    Your ORCID identifier (optional)
                  </small>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FiEdit />
                  Biography
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className={styles.formTextarea}
                  rows={4}
                  placeholder="Brief description of your background, research interests, or professional experience..."
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FiBook />
                  Areas of Expertise
                </label>
                <div className={styles.expertiseInput}>
                  <input
                    type="text"
                    value={newExpertise}
                    onChange={(e) => setNewExpertise(e.target.value)}
                    className={styles.formInput}
                    placeholder="Add area of expertise"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExpertise();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addExpertise}
                    className="btn btn-secondary"
                  >
                    Add
                  </button>
                </div>
                
                {formData.expertise.length > 0 && (
                  <div className={styles.expertiseTags}>
                    {formData.expertise.map((skill, index) => (
                      <span key={index} className={styles.expertiseTag}>
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeExpertise(index)}
                          className={styles.removeTag}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary btn-lg"
                >
                  <FiSave />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Role Information without switcher */}
          {session?.user?.roles && session.user.roles.length > 1 && (
            <div className={styles.roleCard}>
              <div className={styles.cardHeader}>
                <FiUser className={styles.cardIcon} />
                <h2>Role Information</h2>
              </div>
              <div className={styles.roleInfo}>
                <p><strong>Available Roles:</strong> {session.user.roles.join(', ')}</p>
                <p><strong>Current Active Role:</strong> {session.user.currentActiveRole || session.user.role}</p>
                {session.user.isFounder && (
                  <p><strong>Special Status:</strong> Founder & Editor-in-Chief</p>
                )}
                <p className={styles.roleSwitchNote}>
                  <strong>Note:</strong> You can switch roles from the dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
