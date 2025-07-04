import mongoose from 'mongoose';

const paymentInfoSchema = new mongoose.Schema({
  manuscriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  transactionId: {
    type: String,
    required: true,
    trim: true,
  },
  invoiceNumber: {
    type: String,
    trim: true,
  },
  relatedPayment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending',
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes
paymentInfoSchema.index({ manuscriptId: 1 });
paymentInfoSchema.index({ userId: 1 });
paymentInfoSchema.index({ status: 1 });
paymentInfoSchema.index({ transactionId: 1 });

export default mongoose.models.PaymentInfo || mongoose.model('PaymentInfo', paymentInfoSchema);
