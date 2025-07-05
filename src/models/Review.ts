import mongoose from 'mongoose';

const reviewFileSchema = new mongoose.Schema({
  filename: {
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
  uploadDate: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  manuscriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript',
    required: true,
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'declined'],
    default: 'pending',
  },
  assignedDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['single_blind', 'double_blind'],
    default: 'single_blind',
  },
  completedDate: {
    type: Date,
  },
  recommendation: {
    type: String,
    enum: ['accept', 'minor-revision', 'major-revision', 'reject'],
  },
  comments: {
    confidentialToEditor: {
      type: String,
      default: '',
    },
    forAuthors: {
      type: String,
      default: '',
    },
    detailedReview: {
      type: String,
      default: '',
    },
  },
  ratings: {
    novelty: {
      type: Number,
      min: 1,
      max: 10,
    },
    significance: {
      type: Number,
      min: 1,
      max: 10,
    },
    technicalQuality: {
      type: Number,
      min: 1,
      max: 10,
    },
    clarity: {
      type: Number,
      min: 1,
      max: 10,
    },
    overall: {
      type: Number,
      min: 1,
      max: 10,
    },
  },
  files: [reviewFileSchema],
}, {
  timestamps: true,
});

// Index for efficient querying
reviewSchema.index({ manuscriptId: 1, reviewerId: 1 });
reviewSchema.index({ reviewerId: 1, status: 1 });
reviewSchema.index({ assignedBy: 1 });
reviewSchema.index({ dueDate: 1 });

// Update completedDate when status changes to completed
reviewSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  next();
});

export default mongoose.models.Review || mongoose.model('Review', reviewSchema);
