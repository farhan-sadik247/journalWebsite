import mongoose from 'mongoose';

const correctionSchema = new mongoose.Schema({
  manuscriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript',
    required: true,
  },
  type: {
    type: String,
    enum: ['correction', 'retraction', 'expression-of-concern', 'erratum'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  sections: [{
    section: {
      type: String,
      required: true,
    },
    original: {
      type: String,
      required: true,
    },
    corrected: {
      type: String,
      required: true,
    },
  }],
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'under-review', 'approved', 'rejected', 'published'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewNotes: {
    type: String,
    default: '',
  },
  publishedDate: {
    type: Date,
  },
  doi: {
    type: String,
    unique: true,
    sparse: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  notificationsSent: {
    type: Boolean,
    default: false,
  },
  crossrefUpdated: {
    type: Boolean,
    default: false,
  },
  timeline: [{
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
  }],
}, {
  timestamps: true,
});

// Index for search and filtering
correctionSchema.index({ manuscriptId: 1, type: 1 });
correctionSchema.index({ status: 1, createdAt: -1 });
correctionSchema.index({ publishedDate: -1 });

export default mongoose.models.Correction || mongoose.model('Correction', correctionSchema);
