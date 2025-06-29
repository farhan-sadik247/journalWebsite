import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
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
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['comment', 'correction', 'question', 'feedback'],
    default: 'comment',
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  isAuthorComment: {
    type: Boolean,
    default: false,
  },
  isEditorComment: {
    type: Boolean,
    default: false,
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  moderatedAt: {
    type: Date,
  },
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

// Index for efficient querying
commentSchema.index({ manuscriptId: 1, isApproved: 1, type: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ type: 1 });

// Virtual for replies count
commentSchema.virtual('repliesCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  count: true,
});

export default mongoose.models.Comment || mongoose.model('Comment', commentSchema);
