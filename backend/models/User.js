const mongoose = require('mongoose');

// Case-insensitive comparison: "Alex" and "alex" count as the same name
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

const userSchema = new mongoose.Schema(
  {
    // Login identifier. Stored lowercase so "Alex@Example.com" and "alex@example.com" are one account
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'is not a valid email address'],
    },
    // Public name shown on questions and leaderboards (never used to log in)
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[A-Za-z0-9_]+$/, 'may only contain letters, numbers, and underscores'],
    },
    // bcrypt hash, never the plain password. select:false keeps it out of normal queries
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    // Points, not money. Whole numbers only, and never negative
    balance: {
      type: Number,
      default: 100,
      min: 0,
      validate: { validator: Number.isInteger, message: 'must be a whole number' },
    },
    lastDailyClaimAt: { type: Date, default: null },
  },
  { timestamps: { updatedAt: false } } // adds createdAt only
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ displayName: 1 }, { unique: true, collation: CASE_INSENSITIVE });
userSchema.index({ balance: -1 }); // leaderboard: richest users first

// Never send the hash or the internal version key to the client
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);