const mongoose = require('mongoose');

// Ledger: one row for every change to a user's balance. Never updated or deleted.
const TYPES = ['daily_claim', 'wager', 'payout', 'refund'];

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TYPES, required: true },
    amount: { type: Number, required: true }, // negative for wagers, positive for everything else
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
  },
  { timestamps: { updatedAt: false } }
);

// A user's history / lifetime stats
transactionSchema.index({ userId: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
Transaction.TYPES = TYPES;

module.exports = Transaction;