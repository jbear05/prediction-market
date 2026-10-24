const mongoose = require('mongoose');

// Short-lived 6-digit codes for email verification and password reset.
// Only a bcrypt hash of the code is stored. MongoDB deletes each document
// on its own once expiresAt has passed (the TTL index below).
const authCodeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: ['verify', 'reset'], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'auth_codes', timestamps: { updatedAt: false } }
);

// TTL: delete the document when expiresAt is reached (MongoDB checks about once a minute)
authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Find a user's current code for one purpose
authCodeSchema.index({ userId: 1, purpose: 1 });

module.exports = mongoose.model('AuthCode', authCodeSchema);