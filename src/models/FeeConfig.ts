import mongoose from 'mongoose';

const feeConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: '',
  },
  // Fee structure
  baseFee: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
  },
  // Article type specific fees (main fee structure)
  articleTypeFees: [{
    articleType: {
      type: String,
      required: true,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  // Payment deadlines
  paymentDeadlineDays: {
    type: Number,
    default: 30,
    min: 1,
  },
  // Settings
  isActive: {
    type: Boolean,
    default: true,
  },
  requirePaymentBeforeProduction: {
    type: Boolean,
    default: true,
  },
  // Supported payment methods
  supportedPaymentMethods: [{
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer'],
  }],
  // Admin tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
feeConfigSchema.index({ isActive: 1 });

// Define interface for the static method
interface FeeConfigModel extends mongoose.Model<any> {
  getDefaultConfig(): Promise<any>;
}

// Default fee configuration
feeConfigSchema.statics.getDefaultConfig = async function() {
  let config = await this.findOne({ name: 'default', isActive: true });
  
  if (!config) {
    // Create default configuration if it doesn't exist
    config = new this({
      name: 'default',
      description: 'Default APC fee structure',
      baseFee: 2000, // $2000 USD
      currency: 'USD',
      articleTypeFees: [
        { articleType: 'research', fee: 2000 },
        { articleType: 'review', fee: 1500 },
        { articleType: 'meta-analysis', fee: 1800 },
        { articleType: 'systematic-review', fee: 1600 },
        { articleType: 'case-study', fee: 1200 },
        { articleType: 'commentary', fee: 800 },
        { articleType: 'editorial', fee: 500 },
        { articleType: 'letter', fee: 400 },
        { articleType: 'opinion', fee: 600 },
        { articleType: 'perspective', fee: 700 },
        { articleType: 'brief-communication', fee: 500 },
        { articleType: 'methodology', fee: 1400 },
        { articleType: 'technical-note', fee: 900 },
        { articleType: 'short-report', fee: 800 },
      ],
      paymentDeadlineDays: 30,
      isActive: true,
      requirePaymentBeforeProduction: true,
      supportedPaymentMethods: ['stripe', 'paypal', 'bank_transfer'],
      createdBy: new mongoose.Types.ObjectId(), // Will need to be set properly
    });
    
    // Don't save automatically - let admin create it
  }
  
  return config;
};

// Calculate fee for a manuscript based only on article type
feeConfigSchema.methods.calculateFee = function(articleType: string) {
  console.log('Calculating fixed fee for article type:', articleType);
  
  // Find the specific fee for the article type
  const articleTypeFee = this.articleTypeFees.find((af: any) => af.articleType === articleType);
  
  if (articleTypeFee) {
    console.log(`Fixed fee for ${articleType}: $${articleTypeFee.fee}`);
    return {
      baseFee: articleTypeFee.fee,
      finalFee: articleTypeFee.fee,
      discountAmount: 0,
      discountReason: '',
      articleType: articleType,
      currency: this.currency || 'USD'
    };
  }
  
  // Fallback to base fee if article type not found
  console.log(`Article type ${articleType} not found, using base fee: $${this.baseFee}`);
  return {
    baseFee: this.baseFee,
    finalFee: this.baseFee,
    discountAmount: 0,
    discountReason: '',
    articleType: articleType,
    currency: this.currency || 'USD'
  };
};

export default (mongoose.models.FeeConfig as FeeConfigModel) || mongoose.model<any, FeeConfigModel>('FeeConfig', feeConfigSchema);
