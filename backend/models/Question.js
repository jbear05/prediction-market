const mongoose = require('mongoose');

// pending -> open (approved) or rejected; open -> closed (closesAt passed) -> resolved; open/closed -> cancelled (refunded)
const STATUSES = ['pending', 'open', 'rejected', 'closed', 'resolved', 'cancelled'];
const CATEGORIES = ['sports', 'politics', 'tech', 'entertainment', 'campus', 'other'];

const wholeNumber = { validator: Number.isInteger, message: '{PATH} must be a whole number' };

// Every question is Yes/No. The creator's name comes from populate('creatorId', 'displayName'),
// and the total pool is poolYes + poolNo (computed when needed, not stored).
const questionSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    // Includes how it will be resolved, e.g. "Resolves Yes if ..."
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, default: 'other' },
    status: { type: String, enum: STATUSES, default: 'pending' },
    closesAt: { type: Date, required: true },
    poolYes: { type: Number, default: 0, min: 0, validate: wholeNumber },
    poolNo: { type: Number, default: 0, min: 0, validate: wholeNumber },
    outcome: { type: String, enum: ['yes', 'no', null], default: null },
  },
  { timestamps: { updatedAt: false } }
);

// Browse/search: filter by status (+ category), sort by closing time or newest
questionSchema.index({ status: 1, category: 1, closesAt: 1 });
questionSchema.index({ status: 1, createdAt: -1 });
// "Questions I created"
questionSchema.index({ creatorId: 1, createdAt: -1 });

const Question = mongoose.model('Question', questionSchema);
Question.STATUSES = STATUSES;
Question.CATEGORIES = CATEGORIES;

module.exports = Question;