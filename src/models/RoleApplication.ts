import mongoose, { Schema, Document } from 'mongoose';

export interface IRoleApplication extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  currentRole: string;
  requestedRole: 'editor' | 'admin';
  motivation: string;
  qualifications: string;
  experience: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewerComments?: string;
  attachments?: string[];
}

const RoleApplicationSchema = new Schema<IRoleApplication>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  currentRole: {
    type: String,
    required: true
  },
  requestedRole: {
    type: String,
    enum: ['editor', 'admin'],
    required: true
  },
  motivation: {
    type: String,
    required: true,
    maxlength: 1000
  },
  qualifications: {
    type: String,
    required: true,
    maxlength: 1000
  },
  experience: {
    type: String,
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewerComments: {
    type: String,
    maxlength: 500
  },
  attachments: [{
    type: String
  }]
});

// Index for efficient queries
RoleApplicationSchema.index({ userId: 1, status: 1 });
RoleApplicationSchema.index({ status: 1, submittedAt: -1 });

const RoleApplication = mongoose.models.RoleApplication || mongoose.model<IRoleApplication>('RoleApplication', RoleApplicationSchema);

export default RoleApplication;
