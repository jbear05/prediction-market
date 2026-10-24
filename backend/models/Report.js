const mongoose = require('mongoose');

// A user flags a question. An admin deletes the report once it's handled.
const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: { updatedAt: false } }
);

// Admin queue, oldest first
reportSchema.index({ createdAt: 1 });
// Reports on one question (and deleting them together)
reportSchema.index({ questionId: 1 });

module.exports = mongoose.model('Report', reportSchema);