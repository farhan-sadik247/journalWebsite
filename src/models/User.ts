import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function(this: any): boolean {
      return !this.googleId;
    },
    minlength: 6,
  },
  googleId: {
    type: String,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['author', 'reviewer', 'editor', 'copy-editor', 'admin'],
    default: 'author',
  },
  roles: [{
    type: String,
    enum: ['author', 'reviewer', 'editor', 'copy-editor', 'admin'],
  }],
  currentActiveRole: {
    type: String,
    enum: ['author', 'reviewer', 'editor', 'copy-editor', 'admin'],
  },
  isFounder: {
    type: Boolean,
    default: false,
  },
  profileImage: {
    type: String,
    default: '',
  },
  affiliation: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  expertise: [{
    type: String,
  }],
  orcid: {
    type: String,
    default: '',
  },
  designation: {
    type: String,
    default: '',
  },
  designationRole: {
    type: String,
    default: '',
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  emailVerificationToken: {
    type: String,
  },
}, {
  timestamps: true,
});

// Hash password and handle role fields before saving
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error as any);
    }
  }
  
  // Handle role-related fields
  // Make sure role is set
  if (!this.role) {
    this.role = 'author';
  }
  
  // Ensure roles array exists and includes the primary role
  if (!this.roles || !Array.isArray(this.roles)) {
    this.roles = [];
  }
  
  if (this.roles.length === 0) {
    this.roles = [this.role];
  }
  
  // Set currentActiveRole if not set
  if (!this.currentActiveRole) {
    this.currentActiveRole = this.role;
  }
  
  // Ensure currentActiveRole is in roles array
  if (!this.roles.includes(this.currentActiveRole)) {
    this.roles.push(this.currentActiveRole);
  }
  
  // Ensure designation only exists for editors and reviewers
  if (this.designation && !this.roles.includes('editor') && !this.roles.includes('reviewer')) {
    this.designation = '';
    this.designationRole = '';
  }
  
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.twoFactorSecret;
  delete userObject.resetPasswordToken;
  delete userObject.emailVerificationToken;
  return userObject;
};

export default mongoose.models.User || mongoose.model('User', userSchema);
