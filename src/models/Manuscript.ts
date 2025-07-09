import mongoose from 'mongoose';

const authorInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  affiliation: {
    type: String,
    required: true,
  },
  orcid: {
    type: String,
    default: '',
  },
  isCorresponding: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const manuscriptFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  cloudinaryId: {
    type: String,
    required: false, // Made optional for backward compatibility
  },
  // New field for local storage
  storageId: {
    type: String,
    required: false,
  },
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['manuscript', 'supplement', 'figure', 'table', 'revision'],
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

const timelineEventSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const manuscriptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  abstract: {
    type: String,
    required: true,
  },
  keywords: [{
    type: String,
    required: true,
  }],
  authors: [authorInfoSchema],
  correspondingAuthor: {
    type: String,
    required: true,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  files: [manuscriptFileSchema],
  status: {
    type: String,
    enum: [
      'submitted', 
      'under-review', 
      'revision-requested', 
      'major-revision-requested',
      'minor-revision-requested',
      'under-editorial-review',
      'reviewed', 
      'accepted', 
      'accepted-awaiting-copy-edit',
      'in-copy-editing',
      'copy-editing-complete',
      'ready-for-publication',
      'rejected', 
      'payment-required', 
      'payment-submitted',
      'in-production', 
      'published'
    ],
    default: 'submitted',
  },
  // Payment related fields
  requiresPayment: {
    type: Boolean,
    default: false,
  },
  paymentStatus: {
    type: String,
    enum: ['not-required', 'pending', 'processing', 'completed', 'failed', 'waived'],
    default: 'not-required',
  },
  apcAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentDeadline: {
    type: Date,
  },
  reviewType: {
    type: String,
    enum: ['single-blind', 'double-blind'],
    default: 'single-blind',
  },
  currentVersion: {
    type: Number,
    default: 1,
  },
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  reviewDeadline: {
    type: Date,
  },
  category: {
    type: String,
    required: true,
  },
  doi: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  funding: {
    type: String,
    default: '',
  },
  conflictOfInterest: {
    type: String,
    default: '',
  },
  ethicsStatement: {
    type: String,
    default: '',
  },
  dataAvailability: {
    type: String,
    default: '',
  },
  reviewerSuggestions: [{
    type: String,
  }],
  reviewerExclusions: [{
    type: String,
  }],
  timeline: [timelineEventSchema],
  volume: {
    type: Number,
  },
  issue: {
    type: Number,
  },
  pages: {
    type: String,
  },
  publishedDate: {
    type: Date,
  },
  metrics: {
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },
    citations: {
      type: Number,
      default: 0,
    },
  },
  // Copy-editing and Production fields
  copyEditingStage: {
    type: String,
    enum: ['copy-editing', 'author-review', 'author-approved', 'ready-for-production'],
  },
  productionStage: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started',
  },
  assignedCopyEditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedEditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  copyEditingDueDate: {
    type: Date,
  },
  copyEditingNotes: {
    type: String,
    default: '',
  },
  copyEditingStartDate: {
    type: Date,
  },
  copyEditingCompletedDate: {
    type: Date,
  },
  // Copy edit review submitted by copy editor
  copyEditReview: {
    copyEditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    copyEditorName: {
      type: String,
    },
    copyEditorEmail: {
      type: String,
    },
    comments: {
      type: String,
      required: function(this: any) {
        return this.copyEditReview && this.copyEditReview.submittedAt;
      },
    },
    galleyProofUrl: {
      type: String,
    },
    galleyProofPublicId: {
      type: String,
    },
    galleyProofFilename: {
      type: String,
    },
    completionStatus: {
      type: String,
      enum: ['completed', 'needs-revision'],
    },
    submittedAt: {
      type: Date,
    },
    stage: {
      type: String,
      default: 'copy-edit-review',
    },
  },
  // Author copy-edit review (simplified)
  authorCopyEditReview: {
    approval: {
      type: String,
      enum: ['approved', 'revision-requested'],
    },
    comments: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    files: [{
      originalName: {
        type: String,
        required: true,
      },
      filename: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        default: 'author-review-file',
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      size: {
        type: Number,
      },
      mimeType: {
        type: String,
      },
    }],
  },
  // Copy editing working files
  copyEditWorkingFiles: [{
    originalName: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Copy editor assignment tracking
  copyEditorAssignment: {
    copyEditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    copyEditorName: {
      type: String,
    },
    copyEditorEmail: {
      type: String,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedByName: {
      type: String,
    },
    assignedDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['assigned', 'in-progress', 'galley-submitted', 'approved-by-author', 'confirmed-by-copy-editor'],
      default: 'assigned',
    },
    notes: {
      type: String,
      default: '',
    },
    completedDate: {
      type: Date,
    },
    authorApprovalDate: {
      type: Date,
    },
    // Galley proof files submitted by copy editor
    galleyProofs: [{
      filename: {
        type: String,
        required: true,
      },
      originalName: {
        type: String,
        required: true,
      },
      cloudinaryId: {
        type: String,
        required: false, // Made optional for backward compatibility
      },
      // New field for local storage
      storageId: {
        type: String,
        required: false,
      },
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ['galley-proof', 'typeset-manuscript', 'final-pdf'],
        default: 'galley-proof',
      },
      size: {
        type: Number,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    galleySubmissionDate: {
      type: Date,
    },
    galleyNotes: {
      type: String,
      default: '',
    },
    // Author approval details
    authorApproval: {
      approved: {
        type: Boolean,
        default: false,
      },
      approvedAt: {
        type: Date,
      },
      comments: {
        type: String,
        default: '',
      },
    },
    // Copy editor confirmation after author approval
    copyEditorConfirmation: {
      confirmed: {
        type: Boolean,
        default: false,
      },
      confirmedAt: {
        type: Date,
      },
      reportToEditor: {
        type: String,
        default: '',
      },
      finalNotes: {
        type: String,
        default: '',
      },
    },
  },
  // Latest manuscript files for publication (updated by author during review)
  latestManuscriptFiles: [{
    originalName: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: 'manuscript-final',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    size: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    version: {
      type: String,
      default: 'author-review-v1',
    },
    isCurrentVersion: {
      type: Boolean,
      default: true,
    },
  }],
}, {
  timestamps: true,
});

// Index for search functionality
manuscriptSchema.index({
  title: 'text',
  abstract: 'text',
  keywords: 'text',
  'authors.name': 'text',
});

// Index for filtering
manuscriptSchema.index({ category: 1, status: 1 });
manuscriptSchema.index({ submissionDate: -1 });
manuscriptSchema.index({ publishedDate: -1 });

// Update lastModified on save
manuscriptSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

const Manuscript = mongoose.models.Manuscript || mongoose.model('Manuscript', manuscriptSchema);
export default Manuscript;
