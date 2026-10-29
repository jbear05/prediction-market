const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Wager = require('../models/Wager');
const Report = require('../models/Report');
const Transaction = require('../models/Transaction');
const { AppError } = require('./errors');
const { withTransaction } = require('./withTransaction');

// Pays out (or refunds) every wager on a question inside the current transaction.
// payouts: array of { wager, payout }. Users get the coins, wagers get payout set,
// and the ledger gets one row per wager that paid anything.
async function settleWagers(session, question, payouts, type) {
  if (payouts.length === 0) return 0;

  await Wager.bulkWrite(
    payouts.map(({ wager, payout }) => ({
      updateOne: { filter: { _id: wager._id }, update: { $set: { payout } } },
    })),
    { session }
  );

  const paid = payouts.filter((p) => p.payout > 0);
  if (paid.length > 0) {
    await User.bulkWrite(
      paid.map(({ wager, payout }) => ({
        updateOne: { filter: { _id: wager.userId }, update: { $inc: { balance: payout } } },
      })),
      { session }
    );
    await Transaction.insertMany(
      paid.map(({ wager, payout }) => ({ userId: wager.userId, type, amount: payout, questionId: question._id })),
      { session }
    );
  }

  return paid.reduce((sum, p) => sum + p.payout, 0);
}

// Admin picks the winning side. Winners split the whole pool in proportion to
// what they bet: payout = floor(amount * totalPool / winningPool). If nobody
// bet on the winning side, everyone gets their coins back.
// The status condition in the first update means a question can only be
// resolved once, even if the admin double-clicks.
async function resolveQuestion({ questionId, outcome }) {
  if (!mongoose.isValidObjectId(questionId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid question id');
  }
  if (outcome !== 'yes' && outcome !== 'no') {
    throw new AppError(400, 'INVALID_OUTCOME', 'outcome must be "yes" or "no"');
  }

  return withTransaction(async (session) => {
    const question = await Question.findOneAndUpdate(
      { _id: questionId, status: { $in: ['open', 'closed'] } },
      { $set: { status: 'resolved', outcome } },
      { returnDocument: 'after', session }
    );
    if (!question) {
      throw new AppError(409, 'QUESTION_NOT_RESOLVABLE', 'Question not found, or already resolved/cancelled');
    }

    const wagers = await Wager.find({ questionId }).session(session);
    const totalPool = question.poolYes + question.poolNo;
    const winningPool = outcome === 'yes' ? question.poolYes : question.poolNo;

    let payouts;
    let type;
    if (winningPool === 0) {
      // Nobody picked the winner: refund everyone
      payouts = wagers.map((wager) => ({ wager, payout: wager.amount }));
      type = 'refund';
    } else {
      payouts = wagers.map((wager) => ({
        wager,
        payout: wager.side === outcome ? Math.floor((wager.amount * totalPool) / winningPool) : 0,
      }));
      type = 'payout';
    }

    const totalPaid = await settleWagers(session, question, payouts, type);
    return { question, wagerCount: wagers.length, totalPaid, refunded: type === 'refund' };
  });
}

// Admin calls off a question (bad wording, event cancelled...). Everyone gets their coins back.
async function cancelQuestion({ questionId }) {
  if (!mongoose.isValidObjectId(questionId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid question id');
  }

  return withTransaction(async (session) => {
    const question = await Question.findOneAndUpdate(
      { _id: questionId, status: { $in: ['pending', 'open', 'closed'] } },
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after', session }
    );
    if (!question) {
      throw new AppError(409, 'QUESTION_NOT_CANCELLABLE', 'Question not found, or already resolved/cancelled');
    }

    const wagers = await Wager.find({ questionId }).session(session);
    const payouts = wagers.map((wager) => ({ wager, payout: wager.amount }));
    const totalRefunded = await settleWagers(session, question, payouts, 'refund');
    return { question, wagerCount: wagers.length, totalRefunded };
  });
}

// Marks open questions whose closesAt has passed as closed. placeWager already
// refuses late wagers on its own; this just keeps the status field honest.
// Call it from a timer in server.js, e.g. setInterval(closeExpiredQuestions, 60 * 1000).
async function closeExpiredQuestions() {
  const result = await Question.updateMany(
    { status: 'open', closesAt: { $lte: new Date() } },
    { $set: { status: 'closed' } }
  );
  return result.modifiedCount;
}

// totalPool isn't stored, so "popular" sorts on a value computed in the query
const SORTS = {
  newest: { createdAt: -1 },
  popular: { totalPool: -1, createdAt: -1 },
  closing: { closesAt: 1 },
};

// Escape characters that mean something in a regex, so "C++" or "(test" searches literally
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Search + browse. Every argument is optional. Returns one page of results plus
// totals. Each result also has totalPool and creator: { _id, displayName }.
async function searchQuestions({ q, category, status = 'open', sort = 'newest', page = 1, limit = 20 } = {}) {
  const filter = {};

  if (status !== 'all') {
    if (!Question.STATUSES.includes(status)) {
      throw new AppError(400, 'INVALID_STATUS', `status must be one of: all, ${Question.STATUSES.join(', ')}`);
    }
    filter.status = status;
  }
  if (category) {
    if (!Question.CATEGORIES.includes(category)) {
      throw new AppError(400, 'INVALID_CATEGORY', `category must be one of: ${Question.CATEGORIES.join(', ')}`);
    }
    filter.category = category;
  }
  if (q && q.trim()) {
    const pattern = new RegExp(escapeRegex(q.trim().slice(0, 100)), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }];
  }
  if (!SORTS[sort]) {
    throw new AppError(400, 'INVALID_SORT', `sort must be one of: ${Object.keys(SORTS).join(', ')}`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const [results, total] = await Promise.all([
    Question.aggregate([
      { $match: filter },
      { $addFields: { totalPool: { $add: ['$poolYes', '$poolNo'] } } },
      { $sort: SORTS[sort] },
      { $skip: (pageNum - 1) * pageSize },
      { $limit: pageSize },
      // Same as populate('creatorId', 'displayName'), inside the aggregation
      {
        $lookup: {
          from: User.collection.collectionName,
          localField: 'creatorId',
          foreignField: '_id',
          pipeline: [{ $project: { displayName: 1 } }],
          as: 'creator',
        },
      },
      { $set: { creator: { $first: '$creator' } } },
    ]),
    Question.countDocuments(filter),
  ]);

  return { results, page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

async function reportQuestion({ reporterId,  questionId, reason})
{
  const report = await Report.create({reporterId, questionId, reason});
  return {id : report._id};
}


module.exports = { resolveQuestion, cancelQuestion, closeExpiredQuestions, searchQuestions, escapeRegex, reportQuestion };