const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { AppError } = require('./errors');
const { withTransaction } = require('./withTransaction');

const DAILY_CLAIM_AMOUNT = 100;
const DAILY_CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Gives the user their daily coins, at most once every 24 hours. The
// lastDailyClaimAt condition lives inside the update itself, so two clicks at
// the same moment can't both get paid.
async function claimDaily(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid user id');
  }

  return withTransaction(async (session) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - DAILY_CLAIM_INTERVAL_MS);

    const user = await User.findOneAndUpdate(
      { _id: userId, $or: [{ lastDailyClaimAt: null }, { lastDailyClaimAt: { $lte: cutoff } }] },
      { $inc: { balance: DAILY_CLAIM_AMOUNT }, $set: { lastDailyClaimAt: now } },
      { returnDocument: 'after', session }
    );

    if (!user) {
      const existing = await User.findById(userId).session(session);
      if (!existing) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      const nextClaimAt = new Date(existing.lastDailyClaimAt.getTime() + DAILY_CLAIM_INTERVAL_MS);
      throw new AppError(409, 'ALREADY_CLAIMED', 'Daily coins already claimed', { nextClaimAt });
    }

    await Transaction.create([{ userId, type: 'daily_claim', amount: DAILY_CLAIM_AMOUNT }], { session });
    return { balance: user.balance, amount: DAILY_CLAIM_AMOUNT, nextClaimAt: new Date(now.getTime() + DAILY_CLAIM_INTERVAL_MS) };
  });
}

module.exports = { claimDaily, DAILY_CLAIM_AMOUNT, DAILY_CLAIM_INTERVAL_MS };