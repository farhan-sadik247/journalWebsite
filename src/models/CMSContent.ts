import mongoose from 'mongoose';

const cmsContentSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['page', 'section'],
    default: 'page',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
cmsContentSchema.index({ key: 1 });
cmsContentSchema.index({ type: 1, isPublished: 1 });

// Update lastModified on save
cmsContentSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

export default mongoose.models.CMSContent || mongoose.model('CMSContent', cmsContentSchema);
