const mongoose = require('mongoose');

const wagerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    side: { type: String, enum: ['yes', 'no'], required: true },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'amount must be a whole number' },
    },
    // null until the question is resolved or cancelled; then what the user got back (0 for a loss)
    payout: { type: Number, default: null, min: 0 },
  },
  { timestamps: { updatedAt: false } }
);

// "My wagers", newest first
wagerSchema.index({ userId: 1, createdAt: -1 });
// Every wager on a question (used when paying out)
wagerSchema.index({ questionId: 1 });

module.exports = mongoose.model('Wager', wagerSchema);