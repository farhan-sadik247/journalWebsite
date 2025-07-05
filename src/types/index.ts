// User Types
export interface User {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
  profileImage?: string;
  affiliation?: string;
  bio?: string;
  expertise?: string[];
  orcid?: string;
  isEmailVerified: boolean;
  twoFactorEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Manuscript Types
export interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  keywords: string[];
  authors: AuthorInfo[];
  correspondingAuthor: string;
  submittedBy: string;
  files: ManuscriptFile[];
  status: 'submitted' | 'under-review' | 'revision-requested' | 'accepted' | 'rejected' | 'published';
  reviewType: 'single-blind' | 'double-blind';
  currentVersion: number;
  submissionDate: Date;
  lastModified: Date;
  reviewDeadline?: Date;
  category: string;
  funding?: string;
  conflictOfInterest?: string;
  ethicsStatement?: string;
  dataAvailability?: string;
  reviewerSuggestions?: string[];
  reviewerExclusions?: string[];
  timeline: TimelineEvent[];
  doi?: string;
  volume?: number;
  issue?: number;
  pages?: string;
  publishedDate?: Date;
  metrics: {
    views: number;
    downloads: number;
    citations: number;
  };
  // Copy editing fields
  copyEditingStage?: string;
  productionStage?: string;
  assignedCopyEditor?: string;
  copyEditingDueDate?: string;
  copyEditingNotes?: string;
  copyEditReview?: CopyEditReview;
  copyEditWorkingFiles?: CopyEditWorkingFile[];
}

export interface CopyEditWorkingFile {
  originalName: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface CopyEditReview {
  copyEditorId?: string;
  copyEditorName?: string;
  copyEditorEmail?: string;
  comments?: string;
  galleyProofUrl?: string;
  galleyProofPublicId?: string;
  galleyProofFilename?: string;
  completionStatus?: 'completed' | 'needs-revision';
  submittedAt?: Date;
  stage?: string;
}

export interface AuthorInfo {
  name: string;
  email: string;
  affiliation: string;
  orcid?: string;
  isCorresponding: boolean;
}

export interface ManuscriptFile {
  _id: string;
  filename: string;
  originalName: string;
  cloudinaryId?: string; // Made optional for backward compatibility
  storageId?: string; // New field for local storage
  url: string;
  type: 'manuscript' | 'supplement' | 'figure' | 'table';
  size: number;
  version: number;
  uploadDate: Date;
}

// Review Types
export interface Review {
  _id: string;
  manuscriptId: string;
  reviewerId: string;
  assignedBy: string;
  status: 'pending' | 'in-progress' | 'completed' | 'declined';
  assignedDate: Date;
  dueDate: Date;
  completedDate?: Date;
  recommendation: 'accept' | 'minor-revision' | 'major-revision' | 'reject';
  comments: {
    confidentialToEditor: string;
    forAuthors: string;
    detailedReview: string;
  };
  ratings: {
    novelty: number;
    significance: number;
    technicalQuality: number;
    clarity: number;
    overall: number;
  };
  files?: ReviewFile[];
}

export interface ReviewFile {
  filename: string;
  cloudinaryId?: string; // Made optional for backward compatibility
  storageId?: string; // New field for local storage
  url: string;
  uploadDate: Date;
}

// Timeline Types
export interface TimelineEvent {
  _id: string;
  event: string;
  description: string;
  date: Date;
  performedBy: string;
  metadata?: any;
}

// Publication Types
export interface Volume {
  _id: string;
  number: number;
  year: number;
  title?: string;
  description?: string;
  coverImage?: string;
  isPublished: boolean;
  publishedDate?: Date;
  issues: Issue[];
}

export interface Issue {
  _id: string;
  volumeId: string;
  number: number;
  title?: string;
  description?: string;
  coverImage?: string;
  isPublished: boolean;
  publishedDate?: Date;
  manuscripts: string[]; // Manuscript IDs
}

// Comment Types
export interface Comment {
  _id: string;
  manuscriptId: string;
  userId: string;
  parentId?: string; // For replies
  content: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
}

// CMS Types
export interface CMSContent {
  _id: string;
  key: string; // unique identifier like 'aims-scope', 'editorial-board'
  title: string;
  content: string;
  type: 'page' | 'section';
  isPublished: boolean;
  lastModified: Date;
  modifiedBy: string;
}

// Search Types
export interface SearchFilters {
  query?: string;
  category?: string;
  year?: number;
  author?: string;
  volume?: number;
  issue?: number;
  keywords?: string[];
}

export interface SearchResult {
  manuscripts: Manuscript[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

// Dashboard Types
export interface DashboardStats {
  totalManuscripts: number;
  pendingReviews: number;
  acceptedManuscripts: number;
  rejectedManuscripts: number;
  averageReviewTime: number;
  recentActivity: TimelineEvent[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Form Types
export interface SubmissionFormData {
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
  reviewerExclusions?: string[];
  files: File[];
}

export interface ReviewFormData {
  recommendation: 'accept' | 'minor-revision' | 'major-revision' | 'reject';
  confidentialComments: string;
  authorComments: string;
  detailedReview: string;
  ratings: {
    novelty: number;
    significance: number;
    technicalQuality: number;
    clarity: number;
    overall: number;
  };
  files?: File[];
}
