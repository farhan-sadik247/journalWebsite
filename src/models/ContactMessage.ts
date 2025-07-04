import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    enum: ['submission', 'review', 'editorial', 'technical', 'partnership', 'other'],
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'resolved'],
    default: 'new',
  },
  adminResponse: {
    type: String,
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  respondedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1 });

const ContactMessage = mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema);

export default ContactMessage;
