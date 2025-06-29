import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'waived'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'waiver', 'card'],
    required: true,
  },
  paymentIntentId: {
    type: String,
    sparse: true, // For Stripe payment intent ID
  },
  transactionId: {
    type: String,
    sparse: true, // For completed transactions
  },
  paymentDate: {
    type: Date,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  // Fee breakdown
  baseFee: {
    type: Number,
    required: true,
    min: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountReason: {
    type: String,
    default: '',
  },
  // Waiver information
  waiverReason: {
    type: String,
    default: '',
  },
  waiverApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  waiverApprovedDate: {
    type: Date,
  },
  // Invoice details
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  invoiceDate: {
    type: Date,
  },
  // Author/institution information
  billingAddress: {
    name: {
      type: String,
      required: true,
    },
    institution: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      default: '',
    },
  },
  // Receipt information
  receiptUrl: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Indexes
paymentSchema.index({ manuscriptId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ dueDate: 1 });

// Generate invoice number before saving
paymentSchema.pre('save', async function(next) {
  if (!this.invoiceNumber && this.isNew) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Payment').countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
    this.invoiceDate = new Date();
  }
  next();
});

// Update payment date when status changes to completed
paymentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.paymentDate) {
    this.paymentDate = new Date();
  }
  next();
});

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
