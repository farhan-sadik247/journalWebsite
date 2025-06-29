'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  FiUpload, 
  FiX, 
  FiPlus, 
  FiMinus, 
  FiUser, 
  FiMail, 
  FiBookOpen,
  FiTag,
  FiFileText,
  FiSend,
  FiAlertCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './SubmitManuscript.module.scss';

interface AuthorInfo {
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string;
  orcid?: string;
  isCorresponding: boolean;
}

interface SubmissionForm {
  title: string;
  abstract: string;
  keywords: string[];
  authors: AuthorInfo[];
  category: string;
  funding?: string;
  conflictOfInterest?: string;
  ethicsStatement?: string;
  dataAvailability?: string;
  reviewerSuggestions?: string[];
}

const categories = [
  'Medical Technology',
  'Renewable Energy', 
  'Computer Science',
  'Biotechnology',
  'Environmental Science',
  'Materials Science',
  'Artificial Intelligence',
  'Nanotechnology',
  'Public Health',
  'Engineering',
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Psychology',
  'Other'
];

export default function SubmitManuscriptPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SubmissionForm>({
    defaultValues: {
      authors: [{ firstName: '', lastName: '', email: '', affiliation: '', orcid: '', isCorresponding: true }],
      keywords: [],
      reviewerSuggestions: [],
    },
  });

  const { fields: authorFields, append: appendAuthor, remove: removeAuthor } = useFieldArray({
    control,
    name: 'authors',
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [suggestionInput, setSuggestionInput] = useState('');

  const keywords = watch('keywords') || [];
  const reviewerSuggestions = watch('reviewerSuggestions') || [];

  // Check authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 50 * 1024 * 1024; // 50MB
      
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid file type. Please upload PDF or Word documents.`);
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum file size is 50MB.`);
        return false;
      }
      
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setValue('keywords', [...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    setValue('keywords', keywords.filter((_, i) => i !== index));
  };

  const addReviewerSuggestion = () => {
    if (suggestionInput.trim() && !reviewerSuggestions.includes(suggestionInput.trim())) {
      setValue('reviewerSuggestions', [...reviewerSuggestions, suggestionInput.trim()]);
      setSuggestionInput('');
    }
  };

  const removeReviewerSuggestion = (index: number) => {
    setValue('reviewerSuggestions', reviewerSuggestions.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: SubmissionForm) => {
    // Validate required fields
    const validationErrors = [];
    
    if (!data.title?.trim()) {
      validationErrors.push('Title is required');
    }
    
    if (!data.abstract?.trim()) {
      validationErrors.push('Abstract is required');
    }
    
    if (!keywords || keywords.length === 0) {
      validationErrors.push('At least one keyword is required');
    }
    
    if (!data.category?.trim()) {
      validationErrors.push('Category is required');
    }
    
    if (!data.authors || data.authors.length === 0) {
      validationErrors.push('At least one author is required');
    } else {
      // Validate author fields
      for (let i = 0; i < data.authors.length; i++) {
        const author = data.authors[i];
        if (!author.firstName?.trim()) {
          validationErrors.push(`Author ${i + 1} first name is required`);
        }
        if (!author.lastName?.trim()) {
          validationErrors.push(`Author ${i + 1} last name is required`);
        }
        if (!author.email?.trim()) {
          validationErrors.push(`Author ${i + 1} email is required`);
        }
        if (!author.affiliation?.trim()) {
          validationErrors.push(`Author ${i + 1} affiliation is required`);
        }
      }
      
      // Check if there's at least one corresponding author
      const hasCorrespondingAuthor = data.authors.some(author => author.isCorresponding);
      if (!hasCorrespondingAuthor) {
        validationErrors.push('At least one author must be marked as corresponding author');
      }
    }
    
    if (files.length === 0) {
      validationErrors.push('Please upload at least one manuscript file');
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]); // Show first error
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting manuscript with data:', {
        title: data.title,
        abstract: data.abstract?.substring(0, 100),
        keywords: keywords,
        authors: data.authors,
        category: data.category,
        filesCount: files.length
      });

      const formData = new FormData();
      
      // Add form fields
      formData.append('title', data.title);
      formData.append('abstract', data.abstract);
      formData.append('keywords', JSON.stringify(keywords));
      formData.append('authors', JSON.stringify(data.authors));
      formData.append('correspondingAuthor', data.authors.find(a => a.isCorresponding)?.email || '');
      formData.append('category', data.category);
      formData.append('funding', data.funding || '');
      formData.append('conflictOfInterest', data.conflictOfInterest || '');
      formData.append('ethicsStatement', data.ethicsStatement || '');
      formData.append('dataAvailability', data.dataAvailability || '');
      formData.append('reviewerSuggestions', JSON.stringify(reviewerSuggestions || []));

      // Add files
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/manuscripts', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      console.log('Server response:', result);

      if (response.ok) {
        toast.success('Manuscript submitted successfully!');
        router.push('/dashboard');
      } else {
        console.error('Submission failed:', response.status, result);
        toast.error(result.error || 'Failed to submit manuscript');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('An error occurred while submitting the manuscript');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      // Validate current step before proceeding
      if (currentStep === 1) {
        const watchedData = watch();
        if (!watchedData.title?.trim()) {
          toast.error('Title is required');
          return;
        }
        if (!watchedData.abstract?.trim()) {
          toast.error('Abstract is required');
          return;
        }
        if (!keywords || keywords.length === 0) {
          toast.error('At least one keyword is required');
          return;
        }
        if (!watchedData.category?.trim()) {
          toast.error('Category is required');
          return;
        }
      }
      
      if (currentStep === 2) {
        const watchedData = watch();
        if (!watchedData.authors || watchedData.authors.length === 0) {
          toast.error('At least one author is required');
          return;
        }
        
        // Validate all author fields
        for (let i = 0; i < watchedData.authors.length; i++) {
          const author = watchedData.authors[i];
          if (!author.firstName?.trim()) {
            toast.error(`Author ${i + 1} first name is required`);
            return;
          }
          if (!author.lastName?.trim()) {
            toast.error(`Author ${i + 1} last name is required`);
            return;
          }
          if (!author.email?.trim()) {
            toast.error(`Author ${i + 1} email is required`);
            return;
          }
          if (!author.affiliation?.trim()) {
            toast.error(`Author ${i + 1} affiliation is required`);
            return;
          }
        }
        
        // Check if there's at least one corresponding author
        const hasCorrespondingAuthor = watchedData.authors.some(author => author.isCorresponding);
        if (!hasCorrespondingAuthor) {
          toast.error('At least one author must be marked as corresponding author');
          return;
        }
      }
      
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepTitles = [
    'Manuscript Details',
    'Authors',
    'Additional Information',
    'Files & Submit'
  ];

  return (
    <div className={styles.submitPage}>
      <div className="container">
          <div className={styles.pageHeader}>
            <h1>Submit Manuscript</h1>
            <p>Share your research with the global scientific community</p>
          </div>

          {/* Progress Steps */}
          <div className={styles.progressSteps}>
            {stepTitles.map((title, index) => (
              <div 
                key={index}
                className={`${styles.step} ${currentStep > index + 1 ? styles.completed : ''} ${currentStep === index + 1 ? styles.active : ''}`}
              >
                <div className={styles.stepNumber}>{index + 1}</div>
                <span className={styles.stepTitle}>{title}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.submissionForm}>
            {/* Step 1: Manuscript Details */}
            {currentStep === 1 && (
              <div className={styles.formStep}>
                <h2>Manuscript Details</h2>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FiBookOpen />
                    Title *
                  </label>
                  <input
                    {...register('title', { required: 'Title is required' })}
                    className={`${styles.formInput} ${errors.title ? 'error' : ''}`}
                    placeholder="Enter the manuscript title"
                  />
                  {errors.title && <div className="form-error">{errors.title.message}</div>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FiFileText />
                    Abstract *
                  </label>
                  <textarea
                    {...register('abstract', { required: 'Abstract is required' })}
                    className={`${styles.formTextarea} ${errors.abstract ? 'error' : ''}`}
                    placeholder="Enter the manuscript abstract"
                    rows={8}
                  />
                  {errors.abstract && <div className="form-error">{errors.abstract.message}</div>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FiTag />
                    Keywords *
                  </label>
                  <div className={styles.keywordInput}>
                    <input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      placeholder="Enter a keyword and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                      className={styles.formInput}
                    />
                    <button type="button" onClick={addKeyword} className="btn btn-secondary btn-sm">
                      <FiPlus />
                    </button>
                  </div>
                  
                  {keywords.length > 0 && (
                    <div className={styles.tagList}>
                      {keywords.map((keyword, index) => (
                        <span key={index} className={styles.tag}>
                          {keyword}
                          <button type="button" onClick={() => removeKeyword(index)}>
                            <FiX />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {keywords.length === 0 && (
                    <div className="form-error">At least one keyword is required</div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Category *
                  </label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    className={`${styles.formSelect} ${errors.category ? 'error' : ''}`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && <div className="form-error">{errors.category.message}</div>}
                </div>

                <div className={styles.stepActions}>
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Authors */}
            {currentStep === 2 && (
              <div className={styles.formStep}>
                <h2>Authors</h2>
                
                {authorFields.map((field, index) => (
                  <div key={field.id} className={styles.authorSection}>
                    <div className={styles.authorHeader}>
                      <h3>Author {index + 1}</h3>
                      {authorFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAuthor(index)}
                          className={styles.removeButton}
                        >
                          <FiMinus />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className={styles.authorForm}>
                      <div className={styles.authorNames}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>
                            <FiUser />
                            First Name *
                          </label>
                          <input
                            {...register(`authors.${index}.firstName` as const, { required: 'First name is required' })}
                            className={`${styles.formInput} ${errors.authors?.[index]?.firstName ? 'error' : ''}`}
                            placeholder="Enter author's first name"
                          />
                          {errors.authors?.[index]?.firstName && (
                            <div className="form-error">{errors.authors[index].firstName.message}</div>
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>
                            <FiUser />
                            Last Name *
                          </label>
                          <input
                            {...register(`authors.${index}.lastName` as const, { required: 'Last name is required' })}
                            className={`${styles.formInput} ${errors.authors?.[index]?.lastName ? 'error' : ''}`}
                            placeholder="Enter author's last name"
                          />
                          {errors.authors?.[index]?.lastName && (
                            <div className="form-error">{errors.authors[index].lastName.message}</div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          <FiMail />
                          Email *
                        </label>
                        <input
                          {...register(`authors.${index}.email` as const, { 
                            required: 'Email is required',
                            pattern: {
                              value: /\S+@\S+\.\S+/,
                              message: 'Please enter a valid email'
                            }
                          })}
                          className={`${styles.formInput} ${errors.authors?.[index]?.email ? 'error' : ''}`}
                          placeholder="Enter author's email"
                        />
                        {errors.authors?.[index]?.email && (
                          <div className="form-error">{errors.authors[index].email.message}</div>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            <FiUser />
                          Affiliation *
                        </label>
                        <input
                          {...register(`authors.${index}.affiliation` as const, { required: 'Affiliation is required' })}
                          className={`${styles.formInput} ${errors.authors?.[index]?.affiliation ? 'error' : ''}`}
                          placeholder="Enter author's affiliation"
                        />
                        {errors.authors?.[index]?.affiliation && (
                          <div className="form-error">{errors.authors[index].affiliation.message}</div>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          ORCID (Optional)
                        </label>
                        <input
                          {...register(`authors.${index}.orcid` as const)}
                          className={styles.formInput}
                          placeholder="0000-0000-0000-0000"
                        />
                      </div>

                      <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            {...register(`authors.${index}.isCorresponding` as const)}
                          />
                          <span>Corresponding Author</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => appendAuthor({ firstName: '', lastName: '', email: '', affiliation: '', orcid: '', isCorresponding: false })}
                  className={styles.addButton}
                >
                  <FiPlus />
                  Add Another Author
                </button>

                <div className={styles.stepActions}>
                  <button type="button" onClick={prevStep} className="btn btn-secondary">
                    Previous
                  </button>
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Additional Information */}
            {currentStep === 3 && (
              <div className={styles.formStep}>
                <h2>Additional Information</h2>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Funding Information
                  </label>
                  <textarea
                    {...register('funding')}
                    className={styles.formTextarea}
                    placeholder="Describe funding sources for this research (optional)"
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Conflict of Interest
                  </label>
                  <textarea
                    {...register('conflictOfInterest')}
                    className={styles.formTextarea}
                    placeholder="Declare any conflicts of interest (optional)"
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Ethics Statement
                  </label>
                  <textarea
                    {...register('ethicsStatement')}
                    className={styles.formTextarea}
                    placeholder="Provide ethics statement if applicable (optional)"
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Data Availability
                  </label>
                  <textarea
                    {...register('dataAvailability')}
                    className={styles.formTextarea}
                    placeholder="Describe data availability and access (optional)"
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Reviewer Suggestions
                  </label>
                  <div className={styles.keywordInput}>
                    <input
                      value={suggestionInput}
                      onChange={(e) => setSuggestionInput(e.target.value)}
                      placeholder="Enter reviewer email and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addReviewerSuggestion();
                        }
                      }}
                      className={styles.formInput}
                    />
                    <button type="button" onClick={addReviewerSuggestion} className="btn btn-secondary btn-sm">
                      <FiPlus />
                    </button>
                  </div>
                  
                  {reviewerSuggestions.length > 0 && (
                    <div className={styles.tagList}>
                      {reviewerSuggestions.map((suggestion, index) => (
                        <span key={index} className={styles.tag}>
                          {suggestion}
                          <button type="button" onClick={() => removeReviewerSuggestion(index)}>
                            <FiX />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.stepActions}>
                  <button type="button" onClick={prevStep} className="btn btn-secondary">
                    Previous
                  </button>
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Files & Submit */}
            {currentStep === 4 && (
              <div className={styles.formStep}>
                <h2>Upload Files</h2>
                
                <div className={styles.fileUploadSection}>
                  <div
                    className={`${styles.fileDropZone} ${dragActive ? styles.active : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <FiUpload />
                    <h3>Drop files here or click to browse</h3>
                    <p>Supported formats: PDF, DOC, DOCX (Max 50MB each)</p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileInput}
                      className={styles.fileInput}
                    />
                    <button type="button" className="btn btn-secondary">
                      Choose Files
                    </button>
                  </div>

                  {files.length > 0 && (
                    <div className={styles.fileList}>
                      <h4>Selected Files:</h4>
                      {files.map((file, index) => (
                        <div key={index} className={styles.fileItem}>
                          <div className={styles.fileInfo}>
                            <span className={styles.fileName}>{file.name}</span>
                            <span className={styles.fileSize}>
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className={styles.removeFileButton}
                          >
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {files.length === 0 && (
                  <div className={styles.errorMessage}>
                    <FiAlertCircle />
                    <span>Please upload at least one manuscript file to proceed.</span>
                  </div>
                )}

                <div className={styles.stepActions}>
                  <button type="button" onClick={prevStep} className="btn btn-secondary">
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || files.length === 0}
                    className="btn btn-primary btn-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="spinner" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FiSend />
                        Submit Manuscript
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }
