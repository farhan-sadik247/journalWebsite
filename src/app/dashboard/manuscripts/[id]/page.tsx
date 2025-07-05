'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  FiArrowLeft,
  FiDownload,
  FiUser,
  FiMail,
  FiBookOpen,
  FiTag,
  FiCalendar,
  FiFileText,
  FiClock,
  FiDollarSign,
  FiCreditCard,
  FiInfo
} from 'react-icons/fi';
import PaymentInfoModal from '@/components/PaymentInfoModal';
import PaymentInfoDisplay from '@/components/PaymentInfoDisplay';
import styles from './ManuscriptDetail.module.scss';

interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  status: string;
  paymentStatus?: string;
  category: string;
  submissionDate: string;
  lastModified: string;
  files: any[];
  keywords: string[];
  authors: any[];
  funding?: string;
  conflictOfInterest?: string;
  ethicsStatement?: string;
  dataAvailability?: string;
  reviewerSuggestions?: string[];
  reviewerExclusions?: string[];
  timeline: any[];
  copyEditingStage?: string;
  copyEditReview?: {
    copyEditorId?: string;
    copyEditorName?: string;
    copyEditorEmail?: string;
    comments?: string;
    galleyProofUrl?: string;
    galleyProofFilename?: string;
    completionStatus?: 'completed' | 'needs-revision';
    submittedAt?: string;
  };
  authorCopyEditReview?: {
    approval?: string;
    comments?: string;
    reviewedBy?: string;
    reviewDate?: string;
  };
}

interface Review {
  _id: string;
  status: string;
  assignedDate: string;
  dueDate: string;
  completedDate?: string;
  recommendation?: string;
  type: string;
  reviewerId?: {
    _id: string;
    name: string;
    email: string;
  };
  comments?: {
    forAuthors?: string;
    detailedReview?: string;
  };
  ratings?: {
    technicalQuality?: number;
    novelty?: number;
    significance?: number;
    clarity?: number;
    overall?: number;
  };
}

export default function ManuscriptDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [draftApprovalLoading, setDraftApprovalLoading] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftComments, setDraftComments] = useState('');
  const [draftApprovalType, setDraftApprovalType] = useState<'approved' | 'needs_changes'>('approved');
  const [authorUploadedFiles, setAuthorUploadedFiles] = useState<File[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedArticleType, setSelectedArticleType] = useState<string>('');
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);

  // Get user role and permissions
  const userRole = session?.user?.currentActiveRole || session?.user?.role || 'author';
  const userRoles = session?.user?.roles || [userRole];
  const isAuthor = manuscript?.authors?.some(author => author.email === session?.user?.email) || userRole === 'author';
  const isReviewer = userRole === 'reviewer';
  const isEditor = userRole === 'editor' || userRoles.includes('editor');
  const isCopyEditor = userRole === 'copy-editor' || userRoles.includes('copy-editor');
  const isAdmin = userRole === 'admin' || userRoles.includes('admin');

  // Available article types for selection
  const articleTypes = [
    { value: 'research', label: 'Research Article' },
    { value: 'review', label: 'Review Article' },
    { value: 'meta-analysis', label: 'Meta-Analysis' },
    { value: 'systematic-review', label: 'Systematic Review' },
    { value: 'case-study', label: 'Case Study' },
    { value: 'commentary', label: 'Commentary' },
    { value: 'editorial', label: 'Editorial' },
    { value: 'letter', label: 'Letter to Editor' },
    { value: 'opinion', label: 'Opinion Article' },
    { value: 'perspective', label: 'Perspective' },
    { value: 'brief-communication', label: 'Brief Communication' },
    { value: 'methodology', label: 'Methodology' },
    { value: 'technical-note', label: 'Technical Note' },
    { value: 'short-report', label: 'Short Report' },
  ];

  // Payment functions
  const fetchPaymentInfo = async (articleType?: string) => {
    if (!manuscript?._id || !session?.user?.id) return;
    
    try {
      setPaymentLoading(true);
      console.log('Fetching payment info for manuscript:', manuscript._id);
      
      // Use selected article type or manuscript category
      const finalArticleType = articleType || selectedArticleType || manuscript.category?.toLowerCase() || 'research';
      
      console.log('Payment calculation params:', {
        articleType: finalArticleType,
        userId: session.user.id
      });

      const response = await fetch(`/api/fee-config/calculate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleType: finalArticleType
        })
      });

      const data = await response.json();
      console.log('Payment response:', data);

      if (response.ok) {
        setPaymentInfo(data.feeCalculation);
        // Update selected article type if not already set
        if (!selectedArticleType) {
          setSelectedArticleType(finalArticleType);
        }
      } else {
        console.error('Payment calculation failed:', data);
        setPaymentInfo(null);
      }
    } catch (error) {
      console.error('Error fetching payment info:', error);
      setPaymentInfo(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle payment info submission
  const handlePaymentInfoSubmit = async (paymentData: any) => {
    if (!manuscript) {
      toast.error('Manuscript data not available');
      return;
    }

    try {
      const response = await fetch('/api/payment-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptId: manuscript._id,
          ...paymentData,
        }),
      });

      if (response.ok) {
        toast.success('Payment information submitted successfully!');
        setShowPaymentInfoModal(false);
        // Refresh manuscript data to show updated payment status
        fetchManuscript();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit payment information');
      }
    } catch (error) {
      console.error('Error submitting payment info:', error);
      toast.error('Failed to submit payment information');
    }
  };

  // Function declarations (hoisted)
  async function fetchManuscript() {
    try {
      // Add cache-busting to ensure fresh data
      const response = await fetch(`/api/manuscripts/${params.id}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched manuscript data:', {
          id: data.manuscript._id,
          status: data.manuscript.status,
          title: data.manuscript.title?.substring(0, 50) + '...'
        });
        
        // Protection: Don't update if current manuscript is published and new data has different status
        if (manuscript?.status === 'published' && data.manuscript.status !== 'published') {
          console.warn('⚠️ Prevented status change for published manuscript:', {
            currentStatus: manuscript.status,
            newStatus: data.manuscript.status,
            manuscriptId: manuscript._id
          });
          toast.error('Cannot change status of published manuscript');
          return;
        }
        
        setManuscript(data.manuscript);
      } else if (response.status === 404) {
        setError('Manuscript not found');
      } else {
        setError('Failed to load manuscript');
      }
    } catch (error) {
      console.error('Error fetching manuscript:', error);
      setError('Failed to load manuscript');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchReviews() {
    try {
      setReviewsLoading(true);
      const response = await fetch(`/api/reviews?manuscriptId=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      } else {
        console.error('Failed to fetch reviews:', response.status, response.statusText);
        // Don't set an error state, just keep reviews as empty array
        // This allows the "no reviews" message to show appropriately
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Don't set an error state, just keep reviews as empty array
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session && params.id) {
      fetchManuscript();
      fetchReviews();
    }
  }, [session, status, router, params.id]);

  // Payment-related useEffect
  useEffect(() => {
    if (manuscript?.status === 'accepted') {
      // Initialize selected article type from manuscript category
      if (!selectedArticleType && manuscript.category) {
        const initialType = manuscript.category.toLowerCase();
        setSelectedArticleType(initialType);
      }
      fetchPaymentInfo();
    }
  }, [manuscript?.status, manuscript?.category, selectedArticleType]);

  // Early returns for loading, error, and auth states
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorPage}>
        <div className="container">
          <div className={styles.errorContent}>
            <h1>Error</h1>
            <p>{error}</p>
            <Link href="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !manuscript) {
    return null;
  }

  const handlePaymentClick = () => {
    if (!paymentInfo) {
      fetchPaymentInfo();
    }
    setShowPaymentModal(true);
  };

  const proceedToPayment = async () => {
    if (!manuscript || !paymentInfo) {
      toast.error('Payment information not available');
      return;
    }

    try {
      setPaymentLoading(true);

      // Get corresponding author for billing information
      let billingAuthor = manuscript.authors.find((author: any) => author.isCorresponding);
      
      console.log('=== AUTHOR DEBUGGING ===');
      console.log('All authors:', manuscript.authors);
      console.log('Author[0] full object:', manuscript.authors[0] ? JSON.stringify(manuscript.authors[0], null, 2) : 'No authors');
      console.log('Corresponding author found:', billingAuthor);
      
      // If no corresponding author marked, use the first author
      if (!billingAuthor) {
        billingAuthor = manuscript.authors[0];
        console.log('Using first author as fallback:', billingAuthor);
      }
      
      if (!billingAuthor) {
        toast.error('No author information found for this manuscript');
        return;
      }

      console.log('=== BILLING AUTHOR DETAILED ===');
      console.log('Author object keys:', Object.keys(billingAuthor));
      console.log('Author.name:', billingAuthor.name);
      console.log('Author.firstName:', billingAuthor.firstName);
      console.log('Author.lastName:', billingAuthor.lastName);
      console.log('Author.email:', billingAuthor.email);
      console.log('Author.affiliation:', billingAuthor.affiliation);

      // Create a robust name from available fields
      let authorName = '';
      if (billingAuthor.name && billingAuthor.name.trim()) {
        authorName = billingAuthor.name.trim();
        console.log('Using author.name:', authorName);
      } else if (billingAuthor.firstName && billingAuthor.lastName) {
        authorName = `${billingAuthor.firstName.trim()} ${billingAuthor.lastName.trim()}`;
        console.log('Using firstName + lastName:', authorName);
      } else if (billingAuthor.email) {
        // Use email prefix as fallback
        authorName = billingAuthor.email.split('@')[0];
        console.log('Using email prefix as name:', authorName);
      } else {
        authorName = 'Unknown Author';
        console.log('Using fallback name:', authorName);
      }

      // Ensure we have a name
      if (!authorName || authorName.trim() === '') {
        authorName = 'Author Name Required';
        console.log('FORCED authorName because empty:', authorName);
      }

      // Create billing address with robust data
      const billingAddress = {
        name: authorName,
        institution: billingAuthor.affiliation || '',
        address: billingAuthor.address || 'Address not provided',
        city: billingAuthor.city || 'City not provided',
        state: billingAuthor.state || '',
        country: billingAuthor.country || 'US',
        postalCode: billingAuthor.postalCode || '',
      };
      
      console.log('=== FINAL BILLING ADDRESS ===');
      console.log('Final billing address:', billingAddress);
      console.log('Name is present:', !!billingAddress.name);
      console.log('Name length:', billingAddress.name ? billingAddress.name.length : 0);

      // Create payment record
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manuscriptId: manuscript._id,
          paymentMethod: 'stripe', // Default to Stripe for online payments
          billingAddress,
          requestWaiver: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to payment portal with the payment ID
        router.push(`/dashboard/payments/portal?paymentId=${data.payment._id}`);
      } else {
        toast.error(data.error || 'Failed to create payment record');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to initialize payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'submitted': 'status-submitted',
      'under-review': 'status-under-review',
      'revision-requested': 'status-revision-requested',
      'major-revision-requested': 'status-major-revision',
      'minor-revision-requested': 'status-minor-revision',
      'under-editorial-review': 'status-under-editorial-review',
      'reviewed': 'status-reviewed',
      'accepted': 'status-accepted',
      'accepted-awaiting-copy-edit': 'status-accepted',
      'in-copy-editing': 'status-in-production',
      'copy-editing-complete': 'status-in-production',
      'rejected': 'status-rejected',
      'payment-required': 'status-payment-required',
      'in-production': 'status-in-production',
      'published': 'status-published',
    };
    
    return `status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-submitted'}`;
  };

  const getManuscriptStatusDisplayText = (status: string) => {
    const statusTexts = {
      'submitted': 'Submitted',
      'under-review': 'Under Review',
      'revision-requested': 'Revision Requested',
      'major-revision-requested': 'Major Revision Required',
      'minor-revision-requested': 'Minor Revision Required',
      'under-editorial-review': 'Under Editorial Review',
      'reviewed': 'Reviewed',
      'accepted': 'Accepted',
      'accepted-awaiting-copy-edit': 'Accepted - Awaiting Copy Edit',
      'in-copy-editing': 'In Copy Editing',
      'copy-editing-complete': 'Copy Editing Complete',
      'rejected': 'Rejected',
      'payment-required': 'Payment Required',
      'in-production': 'In Production',
      'published': 'Published',
    };
    
    return statusTexts[status as keyof typeof statusTexts] || status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleViewScore = (review: Review) => {
    setSelectedReview(review);
    setShowScoreModal(true);
  };

  const closeScoreModal = () => {
    setShowScoreModal(false);
    setSelectedReview(null);
  };

  const getOverallScore = (ratings?: Review['ratings']) => {
    if (!ratings) return 'N/A';
    
    const scores = [
      ratings.technicalQuality,
      ratings.novelty,
      ratings.significance,
      ratings.clarity,
      ratings.overall
    ].filter(score => score !== undefined && score !== null) as number[];
    
    if (scores.length === 0) return 'N/A';
    
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return average.toFixed(1);
  };

  const getStatusDisplayText = (review: Review) => {
    // If review is completed and has a recommendation, show that
    if (review.status === 'completed' && review.recommendation) {
      const recommendationMap: Record<string, string> = {
        'accept': 'Accept',
        'reject': 'Reject',
        'major-revision': 'Major Revision',
        'minor-revision': 'Minor Revision',
        'major_revision': 'Major Revision',
        'minor_revision': 'Minor Revision'
      };
      
      return recommendationMap[review.recommendation] || review.recommendation.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Otherwise show the status
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'in-progress': 'In Progress', 
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'declined': 'Declined'
    };
    
    return statusMap[review.status] || review.status.replace('-', ' ').replace('_', ' ').toUpperCase();
  };

  const getStatusClass = (review: Review) => {
    // If review is completed and has a recommendation, use recommendation class
    if (review.status === 'completed' && review.recommendation) {
      return review.recommendation.replace(/[-_]/g, '');
    }
    
    // Otherwise use status class
    return review.status.replace(/[-_]/g, '');
  };

  const downloadFile = (file: any) => {
    // Use originalName for the API call, or extract filename from the path
    const filename = file.originalName || file.filename.split('/').pop();
    window.open(`/api/manuscripts/${params.id}/download/${filename}`, '_blank');
  };

  const handleDraftApproval = (approval: 'approved' | 'needs_changes') => {
    setDraftApprovalType(approval);
    setShowDraftModal(true);
    setDraftComments('');
  };

  const submitDraftApproval = async () => {
    if (!manuscript) return;
    
    // Validate that comments are required for change requests
    if (draftApprovalType === 'needs_changes' && !draftComments.trim()) {
      alert('Please provide comments explaining the changes needed');
      return;
    }
    
    setDraftApprovalLoading(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscript._id}/copy-editing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'author-review',
          approval: draftApprovalType,
          comments: draftComments
        }),
      });

      if (response.ok) {
        setShowDraftModal(false);
        await fetchManuscript();
        alert('Your feedback has been submitted successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit draft feedback');
      }
    } catch (error) {
      console.error('Error submitting draft feedback:', error);
      if (error instanceof Error) {
        alert(`Failed to submit feedback: ${error.message}`);
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } finally {
      setDraftApprovalLoading(false);
    }
  };

  // Simplified approval function for the new workflow
  const handleSimpleApproval = async (isApproved: boolean) => {
    if (!manuscript) return;
    
    setDraftApprovalLoading(true);
    try {
      const response = await fetch(`/api/manuscripts/${manuscript._id}/author-copy-edit-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval: isApproved ? 'approved' : 'revision-requested',
          comments: isApproved ? 'Approved by author' : 'Changes requested by author'
        }),
      });

      if (response.ok) {
        await fetchManuscript();
        toast.success(isApproved ? 'Copy editing approved successfully!' : 'Change request submitted successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit approval');
      }
    } catch (error) {
      console.error('Error submitting approval:', error);
      if (error instanceof Error) {
        toast.error(`Failed to submit approval: ${error.message}`);
      } else {
        toast.error('Failed to submit approval. Please try again.');
      }
    } finally {
      setDraftApprovalLoading(false);
    }
  };

  // File upload handlers for author review
  const handleAuthorFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => {
        // Validate file
        if (!file || !file.name || file.size === 0) {
          console.warn('Skipping invalid file:', file);
          return false;
        }
        
        // Check file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          toast.error(`File "${file.name}" is too large. Maximum size is 50MB.`);
          return false;
        }
        
        // Check file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          toast.error(`File "${file.name}" has unsupported format. Please use PDF, DOC, DOCX, or TXT files.`);
          return false;
        }
        
        return true;
      });
      
      if (newFiles.length > 0) {
        setAuthorUploadedFiles(prev => [...prev, ...newFiles]);
        toast.success(`Added ${newFiles.length} file(s) for upload`);
      }
    }
  };

  const removeAuthorFile = (index: number) => {
    setAuthorUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Enhanced submit function with file upload support
  const handleEnhancedSubmit = async () => {
    if (!manuscript) return;
    
    // Validation
    if (draftApprovalType === 'needs_changes' && !draftComments.trim()) {
      toast.error('Please provide comments when requesting changes.');
      return;
    }

    setDraftApprovalLoading(true);
    try {
      // Handle file upload to Cloudinary
      let uploadedFileUrls: any[] = [];
      
      if (authorUploadedFiles.length > 0) {
        console.log('Uploading files to Cloudinary:', authorUploadedFiles.map(f => f.name));
        toast.success('Uploading files...');
        
        try {
          for (const file of authorUploadedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', `manuscripts/${manuscript._id}/author-review`);
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            
            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              uploadedFileUrls.push({
                originalName: file.name,
                filename: uploadResult.public_id,
                url: uploadResult.secure_url,
                size: file.size,
                mimeType: file.type,
                uploadedBy: session?.user?.id,
                uploadedAt: new Date().toISOString()
              });
              console.log('File uploaded successfully:', uploadResult);
            } else {
              const errorData = await uploadResponse.json();
              console.error('File upload failed:', errorData);
              toast.error(`Failed to upload ${file.name}: ${errorData.error || 'Unknown error'}`);
              return; // Stop the process if any file upload fails
            }
          }
          
          toast.success(`Successfully uploaded ${uploadedFileUrls.length} file(s)`);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          toast.error('Failed to upload files. Please try again.');
          return;
        }
      }

      // Submit the review with uploaded files
      const response = await fetch(`/api/manuscripts/${manuscript._id}/author-copy-edit-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval: draftApprovalType === 'approved' ? 'approved' : 'revision-requested',
          comments: draftComments.trim() || (draftApprovalType === 'approved' ? 'Approved by author' : 'Changes requested by author'),
          files: uploadedFileUrls // Empty array for now
        }),
      });

      if (response.ok) {
        await fetchManuscript();
        
        // Reset form
        setDraftComments('');
        setDraftApprovalType('approved');
        setAuthorUploadedFiles([]);
        
        toast.success(
          draftApprovalType === 'approved' 
            ? 'Copy editing approved successfully!' 
            : 'Change request submitted successfully!'
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      if (error instanceof Error) {
        toast.error(`Failed to submit review: ${error.message}`);
      } else {
        toast.error('Failed to submit review. Please try again.');
      }
    } finally {
      setDraftApprovalLoading(false);
    }
  };

  const refreshData = async () => {
    // Prevent refreshing for published manuscripts to avoid status changes
    if (manuscript?.status === 'published') {
      toast.error('Cannot refresh status for published manuscripts to prevent data corruption.');
      return;
    }
    
    setIsLoading(true);
    setReviewsLoading(true);
    await Promise.all([fetchManuscript(), fetchReviews()]);
  };

  // Role-based content renderer
  const renderRoleSpecificContent = () => {
    // Common sections that all roles can see
    const commonSections = (
      <>
        {/* Abstract */}
        <section className={styles.section}>
          <h2>
            <FiFileText />
            Abstract
          </h2>
          <div className={styles.abstractContent}>
            <p>{manuscript.abstract}</p>
          </div>
        </section>

        {/* Keywords */}
        <section className={styles.section}>
          <h2>
            <FiTag />
            Keywords
          </h2>
          <div className={styles.keywordsList}>
            {manuscript.keywords.map((keyword, index) => (
              <span key={index} className={styles.keyword}>
                {keyword}
              </span>
            ))}
          </div>
        </section>

        {/* Authors */}
        <section className={styles.section}>
          <h2>
            <FiUser />
            Authors
          </h2>
          <div className={styles.authorsList}>
            {manuscript.authors.map((author, index) => (
              <div key={index} className={styles.authorCard}>
                <div className={styles.authorInfo}>
                  <h4>
                    {author.name || `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Name not provided'}
                    {author.isCorresponding && (
                      <span className={styles.correspondingBadge}>Corresponding</span>
                    )}
                  </h4>
                  <p className={styles.affiliation}>{author.affiliation}</p>
                  <div className={styles.authorContact}>
                    <FiMail />
                    <span>{author.email}</span>
                  </div>
                  {author.orcid && (
                    <div className={styles.orcid}>
                      ORCID: {author.orcid}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Files */}
        {manuscript.files && manuscript.files.length > 0 && (
          <section className={styles.section}>
            <h2>
              <FiDownload />
              Files
            </h2>
            <div className={styles.filesList}>
              {manuscript.files.map((file, index) => (
                <div key={index} className={styles.fileCard}>
                  <div className={styles.fileInfo}>
                    <h4>{file.originalName}</h4>
                    <p>
                      {file.type} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button 
                    onClick={() => downloadFile(file)}
                    className="btn btn-secondary btn-sm"
                  >
                    <FiDownload />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </>
    );

    // Role-specific sections
    if (isAuthor) {
      return (
        <>
          {commonSections}
          {renderAuthorSpecificSections()}
        </>
      );
    } else if (isReviewer) {
      return (
        <>
          {commonSections}
          {renderReviewerSpecificSections()}
        </>
      );
    } else if (isEditor) {
      return (
        <>
          {commonSections}
          {renderEditorSpecificSections()}
        </>
      );
    } else if (isCopyEditor) {
      return (
        <>
          {commonSections}
          {renderCopyEditorSpecificSections()}
        </>
      );
    } else if (isAdmin) {
      return (
        <>
          {commonSections}
          {renderAdminSpecificSections()}
        </>
      );
    }

    return commonSections;
  };

  // Author-specific sections
  const renderAuthorSpecificSections = () => (
    <>
      {/* Copy Editing Review Section - Only shown when copy editor has submitted their work */}
      {manuscript.copyEditReview && manuscript.copyEditReview.submittedAt && (
        <section className={styles.section} data-section="copy-editing">
          <h2 style={{ color: '#1f2937' }}>
            <FiFileText />
            Copy Editing Review
          </h2>
          
          <div className={styles.copyEditReview}>
            <div className={styles.reviewHeader}>
              <div className={styles.reviewMeta}>
                <p style={{ color: '#1f2937' }}><strong>Copy Editor:</strong> {manuscript.copyEditReview.copyEditorName}</p>
                <p style={{ color: '#1f2937' }}><strong>Submitted:</strong> {new Date(manuscript.copyEditReview.submittedAt || '').toLocaleDateString()}</p>
                <p style={{ color: '#1f2937' }}>
                  <strong>Status:</strong> 
                  <span className={`${styles.completionStatus} ${manuscript.copyEditReview.completionStatus === 'completed' ? styles.completed : styles.needsRevision}`}>
                    {manuscript.copyEditReview.completionStatus === 'completed' ? 'Copy Editing Completed' : 'Revision Required'}
                  </span>
                </p>
              </div>
            </div>
            
            {manuscript.copyEditReview.comments && (
              <div className={styles.reviewComments}>
                <h4 style={{ color: '#1f2937' }}>Copy Editor Comments:</h4>
                <div className={styles.commentsBox}>
                  {manuscript.copyEditReview.comments.split('\n').map((line, index) => (
                    <p key={index} style={{ color: '#1f2937' }}>{line}</p>
                  ))}
                </div>
              </div>
            )}
            
            {manuscript.copyEditReview.galleyProofUrl && (
              <div className={styles.galleyProof}>
                <h4 style={{ color: '#1f2937' }}>Galley Proof:</h4>
                <div className={styles.fileDownload}>
                  <FiDownload />
                  <a 
                    href={manuscript.copyEditReview.galleyProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    {manuscript.copyEditReview.galleyProofFilename || 'Download Galley Proof'}
                  </a>
                </div>
              </div>
            )}

            {/* Enhanced Author Review Section with File Upload */}
            {manuscript.copyEditReview && manuscript.copyEditReview.submittedAt && isAuthor && (
              <>
                {!manuscript.authorCopyEditReview ? (
                  <div className={styles.authorApproval}>
                    <h4>✅ Author Final Review & Approval</h4>
                    <p>Please review the copy-edited version and galley proof above, then complete your review below:</p>
                    
                    <div className={styles.reviewForm}>
                      {/* Review Decision */}
                      <div className={styles.reviewDecision}>
                        <h5>Your Decision:</h5>
                        <div className={styles.radioGroup}>
                          <label className={styles.radioLabel}>
                            <input 
                              type="radio" 
                              name="reviewDecision"
                              value="approved"
                              checked={draftApprovalType === 'approved'}
                              onChange={(e) => setDraftApprovalType('approved')}
                              disabled={draftApprovalLoading}
                            />
                            <span className={styles.radioText}>
                              ✓ Approve for Production
                            </span>
                          </label>
                          <label className={styles.radioLabel}>
                            <input 
                              type="radio" 
                              name="reviewDecision"
                              value="needs_changes"
                              checked={draftApprovalType === 'needs_changes'}
                              onChange={(e) => setDraftApprovalType('needs_changes')}
                              disabled={draftApprovalLoading}
                            />
                            <span className={styles.radioText}>
                              ✗ Request Changes
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Comments Section */}
                      <div className={styles.commentsSection}>
                        <h5>Comments {draftApprovalType === 'needs_changes' && <span className={styles.required}>*</span>}:</h5>
                        <textarea
                          value={draftComments}
                          onChange={(e) => setDraftComments(e.target.value)}
                          placeholder={draftApprovalType === 'approved' 
                            ? "Optional: Add any additional comments or feedback..." 
                            : "Please specify what changes are needed..."}
                          rows={4}
                          className={styles.commentsTextarea}
                          disabled={draftApprovalLoading}
                        />
                      </div>

                      {/* File Upload Section */}
                      <div className={styles.fileUploadSection}>
                        <h5>Additional Files (Optional):</h5>
                        <input
                          type="file"
                          multiple
                          onChange={handleAuthorFileUpload}
                          className={styles.fileInput}
                          disabled={draftApprovalLoading}
                          accept=".pdf,.doc,.docx,.txt"
                        />
                        <p className={styles.fileHelp}>
                          Upload any additional files or revisions (PDF, DOC, DOCX, TXT)
                        </p>
                        {authorUploadedFiles.length > 0 && (
                          <div className={styles.uploadedFiles}>
                            <h6>Selected Files:</h6>
                            {authorUploadedFiles.map((file, index) => (
                              <div key={index} className={styles.fileItem}>
                                <span>{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeAuthorFile(index)}
                                  className={styles.removeFile}
                                  disabled={draftApprovalLoading}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className={styles.submitSection}>
                        <button 
                          onClick={handleEnhancedSubmit}
                          className={`btn ${draftApprovalType === 'approved' ? 'btn-success' : 'btn-warning'}`}
                          disabled={draftApprovalLoading || (draftApprovalType === 'needs_changes' && !draftComments.trim())}
                        >
                          {draftApprovalLoading ? 'Submitting...' : 
                            draftApprovalType === 'approved' ? 'Submit Approval' : 'Submit Change Request'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Show approval status if already approved */
                  <div className={styles.approvalStatus}>
                    <h4>✅ Author Approval Status</h4>
                    <div className={`${styles.approvalBadge} ${manuscript.authorCopyEditReview.approval === 'approved' ? styles.approved : styles.rejected}`}>
                      {manuscript.authorCopyEditReview.approval === 'approved' ? '✓ Approved for Production' : '✗ Changes Requested'}
                    </div>
                    {manuscript.authorCopyEditReview.comments && (
                      <div className={styles.approvalComments}>
                        <strong>Comments:</strong> {manuscript.authorCopyEditReview.comments}
                      </div>
                    )}
                    <p className={styles.approvalDate}>
                      Reviewed on: {manuscript.authorCopyEditReview.reviewDate ? new Date(manuscript.authorCopyEditReview.reviewDate).toLocaleDateString() : 'Date not available'}
                    </p>
                    
                    {manuscript.authorCopyEditReview.approval === 'approved' && (
                      <div className={styles.nextSteps}>
                        <p><strong>✨ Next Steps:</strong> Your manuscript is now ready for production. The editorial team will begin the final production process.</p>
                      </div>
                    )}
                    
                    {/* Allow re-review if needed */}
                    <div className={styles.reReviewOption}>
                      <button
                        onClick={async () => {
                          if (confirm('Do you want to submit a new review? This will replace your previous review.')) {
                            try {
                              // Clear the existing review via API
                              const response = await fetch(`/api/manuscripts/${manuscript._id}/clear-author-review`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                              });
                              
                              if (response.ok) {
                                // Reset the form state
                                setDraftComments('');
                                setDraftApprovalType('approved');
                                setAuthorUploadedFiles([]);
                                // Refresh manuscript data
                                await fetchManuscript();
                                toast.success('Previous review cleared. You can now submit a new review.');
                              } else {
                                // If API doesn't exist, just refresh the page or manually clear
                                setDraftComments('');
                                setDraftApprovalType('approved');
                                setAuthorUploadedFiles([]);
                                toast.success('Form reset. You can submit a new review.');
                                // Temporarily set manuscript.authorCopyEditReview to null for UI purposes
                                setManuscript(prev => prev ? {...prev, authorCopyEditReview: undefined} : null);
                              }
                            } catch (error) {
                              console.error('Error clearing review:', error);
                              // Fallback: just reset the form
                              setDraftComments('');
                              setDraftApprovalType('approved');
                              setAuthorUploadedFiles([]);
                              setManuscript(prev => prev ? {...prev, authorCopyEditReview: undefined} : null);
                              toast.success('Form reset. You can submit a new review.');
                            }
                          }
                        }}
                      >
                        📝 Submit New Review
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Reviews Section - Author View (Limited) */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>
            <FiBookOpen />
            Review Status
          </h2>
        </div>
        
        {reviewsLoading ? (
          <div className={styles.loadingReviews}>
            <div className="spinner" />
            <p>Loading review status...</p>
          </div>
        ) : reviews.length > 0 ? (
          <div className={styles.reviewsTable}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: '600' }}>Review ID</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#333', fontWeight: '600' }}>Score</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#333', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#333', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review, index) => (
                  <tr key={review._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', color: '#333' }}>
                      Review #{index + 1}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#333' }}>
                      {review.ratings ? (
                        <span style={{ 
                          padding: '4px 8px', 
                          backgroundColor: '#e3f2fd', 
                          borderRadius: '4px',
                          fontWeight: '600',
                          color: '#1976d2'
                        }}>
                          {getOverallScore(review.ratings)}/10
                        </span>
                      ) : (
                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No Score</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span 
                        className={`${styles.reviewStatus} ${styles[getStatusClass(review)]}`}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}
                      >
                        {getStatusDisplayText(review)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {review.status === 'completed' && (review.ratings || review.comments) ? (
                        <button
                          onClick={() => handleViewScore(review)}
                          style={{
                            padding: '6px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            const target = e.target as HTMLButtonElement;
                            target.style.backgroundColor = '#0056b3';
                          }}
                          onMouseOut={(e) => {
                            const target = e.target as HTMLButtonElement;
                            target.style.backgroundColor = '#007bff';
                          }}
                        >
                          View Details
                        </button>
                      ) : (
                        <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '0.9rem' }}>
                          {review.status === 'pending' ? 'Awaiting Review' : 
                           review.status === 'in-progress' || review.status === 'in_progress' ? 'In Progress' : 
                           'No Details Available'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Summary Stats Below Table */}
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>{reviews.length}</div>
                <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Total Reviews</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                  {reviews.filter(r => r.status === 'completed').length}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Completed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>
                  {reviews.filter(r => r.ratings).length > 0 
                    ? (reviews.filter(r => r.ratings).reduce((sum, r) => sum + parseFloat(getOverallScore(r.ratings)), 0) / reviews.filter(r => r.ratings).length).toFixed(1)
                    : 'N/A'
                  }
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Average Score</div>
              </div>
            </div>
            
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6c757d', fontStyle: 'italic' }}>
              <strong>Note:</strong> Click &quot;View Details&quot; to see comprehensive review feedback and scores.
            </p>
          </div>
        ) : (
          <div className={styles.noReviews}>
            <p>No reviews have been assigned yet.</p>
            {manuscript.status === 'submitted' && (
              <p className={styles.hint}>Your manuscript is currently being processed by the editorial team.</p>
            )}
          </div>
        )}
      </section>

      {/* Payment Section for Accepted Manuscripts - Author Only */}
      {((manuscript.status === 'accepted' || manuscript.status === 'payment-required' || manuscript.status === 'payment-submitted') || 
        (manuscript.status === 'in-production' && manuscript.paymentStatus === 'completed')) && (
        <section className={styles.section}>
          <h2>
            <FiDollarSign />
            Publication Fee Payment
          </h2>
          
          <div className={styles.paymentSection}>
            {manuscript.paymentStatus === 'completed' ? (
              // Show paid status
              <div className={styles.paymentCompleted}>
                <div className={styles.paidStatus}>
                  <div className={styles.paidIcon}>✅</div>
                  <h3>Payment Completed</h3>
                  <p className={styles.paidText}>Paid</p>
                  <p>Your payment has been verified and approved. Your manuscript is now being processed for publication.</p>
                  
                  {/* Show current manuscript status for transparency */}
                  <div className={styles.statusInfo}>
                    <p><strong>Current Status:</strong> {
                      (() => {
                        const status = manuscript.status as string;
                        switch (status) {
                          case 'in-production': return 'In Production';
                          case 'ready-for-publication': return 'Ready for Publication';
                          case 'published': return 'Published';
                          case 'copy-editing-complete': return 'Copy Editing Complete';
                          case 'in-copy-editing': return 'In Copy Editing';
                          default: return status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        }
                      })()
                    }</p>
                  </div>
                </div>
              </div>
            ) : (
              // Show payment form
              <div className={styles.paymentInfo}>
                <div className={styles.paymentHeader}>
                    <p style={{ color: '#28a745' }}>To proceed with publication, please complete the payment process using bank transfer.</p>
                </div>

                {/* Use PaymentInfoDisplay component for showing payment status and actions */}
                <PaymentInfoDisplay 
                  manuscriptId={manuscript._id} 
                  userRole={userRole}
                  isAuthor={isAuthor}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );

  // Reviewer-specific sections
  const renderReviewerSpecificSections = () => (
    <>
      {/* Reviewer Instructions */}
      <section className={styles.section}>
        <h2>
          <FiBookOpen />
          Reviewer Instructions
        </h2>
        <div className={styles.reviewerInfo}>
          <p>As a reviewer, you can view this manuscript for review purposes. Please use the reviewer dashboard to submit your review.</p>
          <Link href="/dashboard/reviewer" className="btn btn-primary">
            Go to Reviewer Dashboard
          </Link>
        </div>
      </section>

      {/* Your Review Status */}
      {reviews.filter(review => review.reviewerId?._id === session?.user?.id).length > 0 && (
        <section className={styles.section}>
          <h2>Your Review Status</h2>
          <div className={styles.myReviews}>
            {reviews.filter(review => review.reviewerId?._id === session?.user?.id).map((review, index) => (
              <div key={review._id} className={styles.reviewCard}>
                <h4>Review Assignment</h4>
                <p><strong>Status:</strong> {getStatusDisplayText(review)}</p>
                <p><strong>Due Date:</strong> {new Date(review.dueDate).toLocaleDateString()}</p>
                {review.status === 'completed' && review.recommendation && (
                  <p><strong>Your Recommendation:</strong> {review.recommendation.replace(/[-_]/g, ' ').toUpperCase()}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );

  // Editor-specific sections
  const renderEditorSpecificSections = () => (
    <>
      {/* Copy Editing Assignment */}
      {manuscript.status === 'accepted' && !manuscript.copyEditingStage && (
        <section className={styles.section}>
          <h2>
            <FiFileText />
            Copy Editing Assignment
          </h2>
          <div className={styles.copyEditingAssignment}>
            <p>This manuscript is ready for copy editing assignment.</p>
            <Link href={`/dashboard/admin/copy-editing/assign?manuscriptId=${manuscript._id}`} className="btn btn-success">
              Assign Copy Editor
            </Link>
          </div>
        </section>
      )}

      {/* Payment Information section for editors only */}
      {manuscript.status === 'accepted' && isEditor && !isAuthor && (
        <section className={styles.section}>
          <h2>
            <FiDollarSign />
            Payment Review Section (Editor Only)
          </h2>
          <PaymentInfoDisplay 
            manuscriptId={manuscript._id} 
            userRole={userRole}
            isAuthor={isAuthor}
          />
        </section>
      )}

      {/* Production Management */}
      {manuscript.authorCopyEditReview?.approval === 'approved' && (
        <section className={styles.section}>
          <h2>
            <FiFileText />
            Production Management
          </h2>
          <div className={styles.productionManagement}>
            <p><strong>✅ Author has approved the copy-edited manuscript.</strong></p>
            <p>The manuscript is ready to move to production phase.</p>
            <div className={styles.productionActions}>
              <button className="btn btn-success">
                Start Production Process
              </button>
              <button className="btn btn-secondary">
                Send to Typesetting
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Editorial Status Overview */}
      <section className={styles.section}>
        <h2>Editorial Status Overview</h2>
        <div className={styles.editorialOverview}>
          <table className={styles.statusTable}>
            <tbody>
              <tr>
                <td className={styles.statusLabel}>Current Status:</td>
                <td className={styles.statusValue}>
                  <span className={getStatusBadge(manuscript.status)}>
                    {getManuscriptStatusDisplayText(manuscript.status)}
                  </span>
                  {manuscript.status === 'published' && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.5rem', 
                      backgroundColor: '#d4edda', 
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      color: '#155724'
                    }}>
                      🔒 <strong>Published Article</strong> - Status is protected from changes
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td className={styles.statusLabel}>Reviews Assigned:</td>
                <td className={styles.statusValue}>{reviews.length}</td>
              </tr>
              <tr>
                <td className={styles.statusLabel}>Reviews Completed:</td>
                <td className={styles.statusValue}>{reviews.filter(r => r.status === 'completed').length}</td>
              </tr>
              {manuscript.copyEditingStage && (
                <tr>
                  <td className={styles.statusLabel}>Copy Editing Stage:</td>
                  <td className={styles.statusValue}>{manuscript.copyEditingStage.replace('-', ' ').toUpperCase()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* All Reviews */}
      <section className={styles.section}>
        <h2>All Reviews</h2>
        {reviews.length > 0 ? (
          <div className={styles.reviewsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Review No.</th>
                  <th>Reviewer</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Recommendation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review, index) => (
                  <tr key={review._id}>
                    <td data-label="Review No">#{index + 1}</td>
                    <td data-label="Reviewer">
                      {review.reviewerId?.name || `Reviewer ${index + 1}`}
                    </td>
                    <td data-label="Score">
                      <span className={styles.scoreCell}>
                        {getOverallScore(review.ratings)}
                        {review.ratings && (
                          <span className={styles.outOf}>/10</span>
                        )}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={`${styles.reviewStatus} ${styles[getStatusClass(review)]}`}>
                        {getStatusDisplayText(review)}
                      </span>
                    </td>
                    <td data-label="Recommendation">
                      {review.recommendation ? (
                        <span className={`${styles.recommendationBadge} ${styles[review.recommendation.replace('-', '')]}`}>
                          {review.recommendation.replace('-', ' ').toUpperCase()}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td data-label="Action">
                      {review.ratings && (
                        <button
                          className={styles.viewScoreBtn}
                          onClick={() => handleViewScore(review)}
                        >
                          View Full Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.noReviews}>
            <p>No reviews have been assigned yet.</p>
          </div>
        )}
      </section>
    </>
  );

  // Copy Editor-specific sections
  const renderCopyEditorSpecificSections = () => (
    <>
      {/* Copy Editor Dashboard */}
      <section className={styles.section}>
        <h2>
          <FiFileText />
          Copy Editor Actions
        </h2>
        <div className={styles.copyEditorActions}>
          <p>As a copy editor, you can manage your copy editing assignments through the copy editor dashboard.</p>
          <Link href="/dashboard/copy-editor" className="btn btn-primary">
            Copy Editor Dashboard
          </Link>
        </div>
      </section>

      {/* Copy Editing Status */}
      {manuscript.copyEditingStage && (
        <section className={styles.section}>
          <h2>Copy Editing Status</h2>
          <div className={styles.copyEditingStatus}>
            <p><strong>Current Stage:</strong> {manuscript.copyEditingStage.replace('-', ' ').toUpperCase()}</p>
            {manuscript.copyEditReview && manuscript.copyEditReview.submittedAt && (
              <div className={styles.reviewStatus}>
                <p><strong>Review Status:</strong> {manuscript.copyEditReview.completionStatus}</p>
                {manuscript.copyEditReview.submittedAt && (
                  <p><strong>Submitted:</strong> {new Date(manuscript.copyEditReview.submittedAt).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );

  // Admin-specific sections
  const renderAdminSpecificSections = () => (
    <>
      {/* Admin Actions */}
      <section className={styles.section}>
        <h2>
          <FiBookOpen />
          Admin Actions
        </h2>
        <div className={styles.adminActions}>
          <p>As an administrator, you have full access to all manuscript functions and settings.</p>
          <div className={styles.actionButtons}>
            <Link href="/dashboard/admin" className="btn btn-primary">
              Admin Dashboard
            </Link>
            <Link href="/dashboard/editor" className="btn btn-secondary">
              Editorial Functions
            </Link>
          </div>
        </div>
      </section>

      {/* System Information */}
      <section className={styles.section}>
        <h2>System Information</h2>
        <div className={styles.systemInfo}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Manuscript ID:</span>
              <span className={styles.value}>{manuscript._id}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Submitted:</span>
              <span className={styles.value}>{new Date(manuscript.submissionDate).toLocaleString()}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Last Modified:</span>
              <span className={styles.value}>{new Date(manuscript.lastModified).toLocaleString()}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Total Authors:</span>
              <span className={styles.value}>{manuscript.authors.length}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Total Files:</span>
              <span className={styles.value}>{manuscript.files?.length || 0}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  // Main component render
  return (
    <div className={styles.manuscriptDetailPage}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <Link href="/dashboard/manuscripts" className={styles.backButton}>
            <FiArrowLeft />
            Back to Manuscripts
          </Link>
          
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1 style={{ color: 'white' }}>{manuscript.title}</h1>
              <span className={getStatusBadge(manuscript.status)}>
                {getManuscriptStatusDisplayText(manuscript.status)}
              </span>
            </div>
            
            <div className={styles.headerActions}>
              {(manuscript.status === 'revision-requested' || 
                manuscript.status === 'major-revision-requested' || 
                manuscript.status === 'minor-revision-requested') && (
                <Link 
                  href={`/dashboard/manuscripts/${manuscript._id}/revise`}
                  className="btn btn-success"
                >
                  <FiFileText />
                  Submit Revision
                </Link>
              )}
              
              {manuscript.files.length > 0 && (
                <button 
                  onClick={() => window.open(`/api/manuscripts/${manuscript._id}/download`, '_blank')}
                  className="btn btn-primary"
                >
                  <FiDownload />
                  Download All Files
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Main Content */}
          <div className={styles.mainContent}>
            {renderRoleSpecificContent()}
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Manuscript Info */}
            <div className={styles.infoCard}>
              <h3>Manuscript Information</h3>
              
              <div className={styles.infoItem}>
                <FiBookOpen />
                <div>
                  <span className={styles.label}>Category</span>
                  <span className={styles.value}>{manuscript.category}</span>
                </div>
              </div>
              
              <div className={styles.infoItem}>
                <FiCalendar />
                <div>
                  <span className={styles.label}>Submitted</span>
                  <span className={styles.value}>
                    {new Date(manuscript.submissionDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className={styles.infoItem}>
                <FiClock />
                <div>
                  <span className={styles.label}>Last Modified</span>
                  <span className={styles.value}>
                    {new Date(manuscript.lastModified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {manuscript.timeline && manuscript.timeline.length > 0 && (
              <div className={styles.timelineCard}>
                <h3>Timeline</h3>
                <div className={styles.timeline}>
                  {manuscript.timeline.map((event, index) => (
                    <div key={index} className={styles.timelineEvent}>
                      <div className={styles.timelineMarker}></div>
                      <div className={styles.timelineContent}>
                        <h4>{event.event}</h4>
                        <p>{event.description}</p>
                        <span className={styles.timelineDate}>
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score Details Modal */}
      {showScoreModal && selectedReview && (
        <div className={styles.modalOverlay} onClick={closeScoreModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Review Score Details</h3>
              <button className={styles.closeModal} onClick={closeScoreModal}>
                &times;
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.reviewerInfo}>
                <h4>Reviewer: {selectedReview.reviewerId?.name || 'Anonymous'}</h4>
                <p className={styles.reviewType}>
                  {selectedReview.type?.replace('_', ' ').toUpperCase() || 'SINGLE BLIND'} Review
                </p>
              </div>

              {selectedReview.ratings && (
                <div className={styles.scoresGrid}>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Technical Quality</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.technicalQuality || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.technicalQuality || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Novelty</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.novelty || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.novelty || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Significance</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.significance || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.significance || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Clarity</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.clarity || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.clarity || 0}/10
                      </span>
                    </div>
                  </div>

                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Overall Score</span>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreProgress} 
                        style={{ width: `${(selectedReview.ratings.overall || 0) * 10}%` }}
                      ></div>
                      <span className={styles.scoreValue}>
                        {selectedReview.ratings.overall || 0}/10
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendation Section */}
              {selectedReview.recommendation && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  borderLeft: '4px solid #007bff'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Reviewer Recommendation</h4>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '600',
                    color: selectedReview.recommendation.includes('accept') ? '#28a745' : 
                          selectedReview.recommendation.includes('reject') ? '#dc3545' : '#ffc107'
                  }}>
                    {selectedReview.recommendation.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              {(selectedReview.comments?.forAuthors || selectedReview.comments?.detailedReview) && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '0.5rem' }}>
                    Reviewer Comments
                  </h4>
                  
                  {selectedReview.comments?.forAuthors && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h5 style={{ 
                        color: '#007bff', 
                        marginBottom: '0.75rem',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}>
                        📝 Comments for Authors
                      </h5>
                      <div style={{
                        backgroundColor: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        padding: '1rem',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        color: '#333',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {selectedReview.comments.forAuthors}
                      </div>
                    </div>
                  )}

                  {selectedReview.comments?.detailedReview && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h5 style={{ 
                        color: '#28a745', 
                        marginBottom: '0.75rem',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}>
                        🔍 Detailed Review
                      </h5>
                      <div style={{
                        backgroundColor: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        padding: '1rem',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        color: '#333',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {selectedReview.comments.detailedReview}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Review Metadata */}
              {(selectedReview.assignedDate || selectedReview.completedDate || selectedReview.dueDate) && (
                <div style={{ 
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}>
                  <h5 style={{ margin: '0 0 0.75rem 0', color: '#333' }}>Review Timeline</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                    {selectedReview.assignedDate && (
                      <div>
                        <strong>Assigned:</strong><br />
                        <span style={{ color: '#6c757d' }}>
                          {new Date(selectedReview.assignedDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedReview.dueDate && (
                      <div>
                        <strong>Due Date:</strong><br />
                        <span style={{ color: '#6c757d' }}>
                          {new Date(selectedReview.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedReview.completedDate && (
                      <div>
                        <strong>Completed:</strong><br />
                        <span style={{ color: '#28a745' }}>
                          {new Date(selectedReview.completedDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className={styles.modalFooter}>
              <button
                onClick={closeScoreModal}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal - Separate modal for payment */}
      {showPaymentModal && paymentInfo && (
        <div className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Payment Information</h3>
              <button className={styles.closeModal} onClick={() => setShowPaymentModal(false)}>
                &times;
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.paymentMethods}>
                <div className={styles.methodItem}>
                  <FiCreditCard />
                  <span>Credit/Debit Cards</span>
                </div>
                <div className={styles.methodItem}>
                  <FiDollarSign />
                  <span>PayPal</span>
                </div>
                <div className={styles.methodItem}>
                  <FiDollarSign />
                  <span>Bank Transfer</span>
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              {paymentInfo.finalFee === 0 ? (
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    const message = paymentInfo.isWaiver ? 
                      'Manuscript can proceed without payment due to waiver' :
                      'Manuscript can proceed without payment due to discount';
                    toast.success(message);
                  }}
                  className="btn btn-primary"
                >
                  <FiFileText />
                  Continue to Production
                </button>
              ) : (
                <button
                  onClick={proceedToPayment}
                  className="btn btn-primary"
                >
                  <FiCreditCard />
                  Proceed to Payment Portal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Info Modal - Deprecated, kept for compatibility */}
      <PaymentInfoModal
        isOpen={showPaymentInfoModal}
        onClose={() => setShowPaymentInfoModal(false)}
        manuscriptId={manuscript?._id || ''}
        onPaymentSubmitted={() => {
          setShowPaymentInfoModal(false);
          fetchManuscript();
        }}
      />
    </div>
  );
}
