import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: false, // Prevent automatic indexing since this is a subdocument
  },
  description: {
    type: String,
    default: '',
  },
}, { _id: true });

const designationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: '',
  },
  roles: [roleSchema],
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
designationSchema.index({ name: 1 });
designationSchema.index({ order: 1 });

export default mongoose.models.Designation || mongoose.model('Designation', designationSchema);
