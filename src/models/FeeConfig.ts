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
  // Article type specific fees
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
  // Country-based discounts/waivers
  countryDiscounts: [{
    country: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'waiver'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },
  }],
  // Institution-based discounts
  institutionDiscounts: [{
    institutionName: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    validUntil: {
      type: Date,
    },
    description: {
      type: String,
      default: '',
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
  allowWaiverRequests: {
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
    enum: ['stripe', 'paypal', 'bank_transfer', 'waiver'],
  }],
  // Additional settings
  automaticWaiverCountries: [{
    type: String, // ISO country codes
  }],
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
feeConfigSchema.index({ name: 1 });
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
        { articleType: 'case-study', fee: 1200 },
        { articleType: 'editorial', fee: 0 },
        { articleType: 'letter', fee: 500 },
      ],
      countryDiscounts: [
        { country: 'AF', discountType: 'waiver', discountValue: 100, description: 'Low-income country waiver' },
        { country: 'BD', discountType: 'waiver', discountValue: 100, description: 'Low-income country waiver' },
        { country: 'ET', discountType: 'waiver', discountValue: 100, description: 'Low-income country waiver' },
        { country: 'IN', discountType: 'percentage', discountValue: 50, description: 'Developing country discount' },
        { country: 'CN', discountType: 'percentage', discountValue: 30, description: 'Developing country discount' },
        { country: 'BR', discountType: 'percentage', discountValue: 40, description: 'Developing country discount' },
      ],
      paymentDeadlineDays: 30,
      isActive: true,
      allowWaiverRequests: true,
      requirePaymentBeforeProduction: true,
      supportedPaymentMethods: ['stripe', 'paypal', 'bank_transfer', 'waiver'],
      automaticWaiverCountries: ['AF', 'BD', 'ET', 'NP', 'RW'],
      createdBy: new mongoose.Types.ObjectId(), // Will need to be set properly
    });
    
    // Don't save automatically - let admin create it
  }
  
  return config;
};

// Calculate fee for a manuscript
feeConfigSchema.methods.calculateFee = function(articleType: string, authorCountry: string, institutionName?: string) {
  let fee = this.baseFee;
  
  // Check article type specific fee
  const articleTypeFee = this.articleTypeFees.find((af: any) => af.articleType === articleType);
  if (articleTypeFee) {
    fee = articleTypeFee.fee;
  }
  
  let discountAmount = 0;
  let discountReason = '';
  
  // Check for automatic waiver countries
  if (this.automaticWaiverCountries.includes(authorCountry)) {
    return {
      baseFee: fee,
      finalFee: 0,
      discountAmount: fee,
      discountReason: 'Automatic waiver for low-income country',
      isWaiver: true,
    };
  }
  
  // Check country-based discounts
  const countryDiscount = this.countryDiscounts.find((cd: any) => cd.country === authorCountry);
  if (countryDiscount) {
    if (countryDiscount.discountType === 'waiver') {
      return {
        baseFee: fee,
        finalFee: 0,
        discountAmount: fee,
        discountReason: countryDiscount.description || 'Country-based waiver',
        isWaiver: true,
      };
    } else if (countryDiscount.discountType === 'percentage') {
      discountAmount = Math.round(fee * (countryDiscount.discountValue / 100));
      discountReason = countryDiscount.description || `${countryDiscount.discountValue}% country-based discount`;
    } else if (countryDiscount.discountType === 'fixed_amount') {
      discountAmount = Math.min(countryDiscount.discountValue, fee);
      discountReason = countryDiscount.description || `$${countryDiscount.discountValue} country-based discount`;
    }
  }
  
  // Check institution-based discounts (if no country discount applied)
  if (!discountAmount && institutionName) {
    const institutionDiscount = this.institutionDiscounts.find((id: any) => 
      id.institutionName.toLowerCase() === institutionName.toLowerCase() &&
      (!id.validUntil || new Date(id.validUntil) > new Date())
    );
    
    if (institutionDiscount) {
      if (institutionDiscount.discountType === 'percentage') {
        discountAmount = Math.round(fee * (institutionDiscount.discountValue / 100));
        discountReason = institutionDiscount.description || `${institutionDiscount.discountValue}% institutional discount`;
      } else if (institutionDiscount.discountType === 'fixed_amount') {
        discountAmount = Math.min(institutionDiscount.discountValue, fee);
        discountReason = institutionDiscount.description || `$${institutionDiscount.discountValue} institutional discount`;
      }
    }
  }
  
  return {
    baseFee: fee,
    finalFee: Math.max(0, fee - discountAmount),
    discountAmount,
    discountReason,
    isWaiver: false,
  };
};

export default (mongoose.models.FeeConfig as FeeConfigModel) || mongoose.model<any, FeeConfigModel>('FeeConfig', feeConfigSchema);
