import mongoose from 'mongoose';

const UserManualSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'image'],
    required: true,
  },
  heading: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String, // Cloudinary URL for images
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
UserManualSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const UserManual = mongoose.models.UserManual || mongoose.model('UserManual', UserManualSchema);

export default UserManual;
