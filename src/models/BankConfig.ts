import mongoose from 'mongoose';

interface IBankConfig extends mongoose.Document {
  payableAmount: number;
  bankName: string;
  accountNumber: string;
  accountDetails: string;
  currency: string;
  isActive: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IBankConfigModel extends mongoose.Model<IBankConfig> {
  getDefaultConfig(): Promise<IBankConfig>;
}

const bankConfigSchema = new mongoose.Schema({
  payableAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  bankName: {
    type: String,
    required: true,
    trim: true,
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
  },
  accountDetails: {
    type: String,
    required: true,
    trim: true,
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Static method to get default bank config
bankConfigSchema.statics.getDefaultConfig = async function() {
  const config = await this.findOne({ isActive: true }).sort({ updatedAt: -1 });
  
  if (!config) {
    // Create default config if none exists
    const defaultConfig = new this({
      payableAmount: 100,
      bankName: 'Default Bank',
      accountNumber: '1234567890',
      accountDetails: 'Please update bank details in admin panel',
    });
    await defaultConfig.save();
    return defaultConfig;
  }
  
  return config;
};

export default (mongoose.models.BankConfig as IBankConfigModel) || mongoose.model<IBankConfig, IBankConfigModel>('BankConfig', bankConfigSchema);
