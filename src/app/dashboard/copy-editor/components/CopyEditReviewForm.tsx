'use client';

import { useState } from 'react';
import { 
  FiSend,
  FiUpload,
  FiX,
  FiFileText,
  FiCheck,
  FiAlertTriangle
} from 'react-icons/fi';
import styles from './CopyEditReviewForm.module.scss';

interface CopyEditReviewFormProps {
  manuscriptId: string;
  manuscriptTitle: string;
  onSubmit: (data: CopyEditReviewData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export interface CopyEditReviewData {
  comments: string;
  galleyProofFile: File | null;
  completionStatus: 'completed' | 'needs-revision';
}

export default function CopyEditReviewForm({
  manuscriptId,
  manuscriptTitle,
  onSubmit,
  onCancel,
  isSubmitting
}: CopyEditReviewFormProps) {
  const [comments, setComments] = useState('');
  const [galleyProofFile, setGalleyProofFile] = useState<File | null>(null);
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'needs-revision'>('completed');
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      // Check file type (PDF, DOC, DOCX)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) {
        setGalleyProofFile(file);
      } else {
        alert('Please upload a PDF, DOC, or DOCX file for the galley proof.');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comments.trim()) {
      alert('Please provide comments about your copy editing work.');
      return;
    }

    await onSubmit({
      comments: comments.trim(),
      galleyProofFile,
      completionStatus
    });
  };

  const removeFile = () => {
    setGalleyProofFile(null);
  };

  return (
    <div className={styles.reviewFormOverlay}>
      <div className={styles.reviewFormModal}>
        <div className={styles.modalHeader}>
          <h2>Submit Copy Editing Review</h2>
          <p className={styles.manuscriptTitle}>{manuscriptTitle}</p>
          <button className={styles.closeButton} onClick={onCancel}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.reviewForm}>
          {/* Completion Status */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Copy Editing Status</label>
            <div className={styles.statusOptions}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="completionStatus"
                  value="completed"
                  checked={completionStatus === 'completed'}
                  onChange={(e) => setCompletionStatus(e.target.value as 'completed' | 'needs-revision')}
                />
                <span className={styles.radioLabel}>
                  <FiCheck className={styles.successIcon} />
                  Copy editing completed
                </span>
                <p className={styles.optionDescription}>
                  The manuscript has been thoroughly copy-edited and is ready for author review.
                </p>
              </label>

              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="completionStatus"
                  value="needs-revision"
                  checked={completionStatus === 'needs-revision'}
                  onChange={(e) => setCompletionStatus(e.target.value as 'completed' | 'needs-revision')}
                />
                <span className={styles.radioLabel}>
                  <FiAlertTriangle className={styles.warningIcon} />
                  Requires author revision
                </span>
                <p className={styles.optionDescription}>
                  The manuscript requires significant revisions before copy editing can be completed.
                </p>
              </label>
            </div>
          </div>

          {/* Comments */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="comments">
              Copy Editing Comments *
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className={styles.commentsTextarea}
              rows={8}
              placeholder="Please provide detailed comments about your copy editing work, including:&#10;• Summary of changes made&#10;• Areas that needed significant revision&#10;• Questions or concerns for the author&#10;• Style and formatting notes&#10;• Any technical issues encountered"
              required
            />
            <div className={styles.characterCount}>
              {comments.length} characters
            </div>
          </div>

          {/* Galley Proof Upload */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Galley Proof (Optional)
            </label>
            <p className={styles.fieldDescription}>
              Upload the copy-edited manuscript file for author review. Accepted formats: PDF, DOC, DOCX
            </p>

            {!galleyProofFile ? (
              <div
                className={`${styles.fileUploadArea} ${dragActive ? styles.dragActive : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  id="galleyProofFile"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className={styles.fileInput}
                />
                <label htmlFor="galleyProofFile" className={styles.fileUploadLabel}>
                  <FiUpload className={styles.uploadIcon} />
                  <span>Click to upload or drag and drop</span>
                  <p>PDF, DOC, or DOCX files only</p>
                </label>
              </div>
            ) : (
              <div className={styles.uploadedFile}>
                <div className={styles.fileInfo}>
                  <FiFileText className={styles.fileIcon} />
                  <div className={styles.fileDetails}>
                    <span className={styles.fileName}>{galleyProofFile.name}</span>
                    <span className={styles.fileSize}>
                      {(galleyProofFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className={styles.removeFileButton}
                  title="Remove file"
                >
                  <FiX />
                </button>
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className={styles.guidelines}>
            <h3>Review Guidelines</h3>
            <ul>
              <li>Provide clear, constructive feedback about the copy editing work performed</li>
              <li>Include specific details about changes made and reasons for those changes</li>
              <li>Highlight any areas where author input or clarification is needed</li>
              <li>Upload a galley proof file when copy editing is completed</li>
              <li>Be professional and respectful in all communications</li>
            </ul>
          </div>

          {/* Submit Buttons */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || !comments.trim()}
            >
              <FiSend />
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
