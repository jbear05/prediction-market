const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Wager = require('../models/Wager');
const Transaction = require('../models/Transaction');
const { AppError } = require('./errors');
const { withTransaction } = require('./withTransaction');

// Takes the coins from the user, records the wager, and adds it to the pool,
// all or nothing. The conditions inside each update (status, closesAt,
// balance >= amount) are what stop double-spending when two requests race.
async function placeWager({ userId, questionId, side, amount }) {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(questionId)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid user or question id');
  }
  if (side !== 'yes' && side !== 'no') {
    throw new AppError(400, 'INVALID_SIDE', 'side must be "yes" or "no"');
  }
  if (!Number.isInteger(amount) || amount < 1) {
    throw new AppError(400, 'INVALID_AMOUNT', 'amount must be a whole number of at least 1');
  }

  return withTransaction(async (session) => {
    const pool = side === 'yes' ? 'poolYes' : 'poolNo';
    const question = await Question.findOneAndUpdate(
      { _id: questionId, status: 'open', closesAt: { $gt: new Date() } },
      { $inc: { [pool]: amount } },
      { returnDocument: 'after', session }
    );
    if (!question) {
      throw new AppError(409, 'QUESTION_NOT_OPEN', 'This question is not open for wagers');
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { returnDocument: 'after', session }
    );
    if (!user) {
      const exists = await User.exists({ _id: userId }).session(session);
      if (!exists) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      throw new AppError(409, 'INSUFFICIENT_BALANCE', 'Not enough coins for this wager');
    }

    const [wager] = await Wager.create([{ userId, questionId, side, amount }], { session });
    await Transaction.create([{ userId, type: 'wager', amount: -amount, questionId }], { session });

    return { wager, balance: user.balance, question };
  });
}

module.exports = { placeWager };