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
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['manuscript', 'supplement', 'figure', 'table'],
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
      'rejected', 
      'payment-required', 
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
  doi: {
    type: String,
    unique: true,
    sparse: true,
  },
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
    enum: ['copy-editing', 'author-review', 'proofreading', 'typesetting', 'final-review', 'ready-for-publication'],
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
  copyEditingDueDate: {
    type: Date,
  },
  copyEditingNotes: {
    type: String,
    default: '',
  },
  typesettingNotes: {
    type: String,
    default: '',
  },
  proofreadingNotes: {
    type: String,
    default: '',
  },
  productionNotes: {
    type: String,
    default: '',
  },
  // Author copy-edit review
  authorCopyEditReview: {
    approval: {
      type: String,
      enum: ['approved', 'revision-requested'],
    },
    comments: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewDate: {
      type: Date,
    },
  },
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

export default mongoose.models.Manuscript || mongoose.model('Manuscript', manuscriptSchema);
