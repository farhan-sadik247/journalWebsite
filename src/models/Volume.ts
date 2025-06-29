import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  coverImage: {
    type: String,
    default: '',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  publishedDate: {
    type: Date,
  },
  manuscripts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript',
  }],
}, { _id: true });

const volumeSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    unique: true,
  },
  year: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  coverImage: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'closed', 'published'],
    default: 'draft',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  publishedDate: {
    type: Date,
  },
  closedDate: {
    type: Date,
  },
  editorNotes: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  issues: [issueSchema],
}, {
  timestamps: true,
});

// Index for efficient querying
volumeSchema.index({ year: -1, number: -1 });
volumeSchema.index({ status: 1 });
volumeSchema.index({ isPublished: 1 });

// Virtual field to get manuscripts in this volume
volumeSchema.virtual('manuscripts', {
  ref: 'Manuscript',
  localField: 'number',
  foreignField: 'volume',
});

export default mongoose.models.Volume || mongoose.model('Volume', volumeSchema);
