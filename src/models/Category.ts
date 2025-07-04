import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  details: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    altText: {
      type: String,
      default: '',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for search and sorting
categorySchema.index({ name: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ isActive: 1 });

export default mongoose.models.Category || mongoose.model('Category', categorySchema);
