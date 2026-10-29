const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { AppError } = require('./errors');
const { withTransaction } = require('./withTransaction');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mailer = require('./mailer.js');
const {createAuthCode} = require('./authCodes.js');
const {verifyAuthCode} = require('./authCodes.js');

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

async function createUser({email, displayName, rawPassword})
{
  
  const user = await User.create({email, balance: 100, displayName, isVerified: false, lastDailyClaimAt:null, passwordHash: await bcrypt.hash(rawPassword, 10), role:"user"});
  const authcode = await createAuthCode(user._id, "verify");
  mailer.sendVerificationCode(user.email, authcode);

  return {uid: user._id};
  
  
  
}

async function login({email, rawPassword})
{

  const user = await User.findOne({email}).select('+passwordHash');
  if(!user || !(await bcrypt.compare(rawPassword, user.passwordHash)))
  {
    throw new Error('Invalid Email or password')
  }

  return {uid: user._id, needVerification: !user.isVerified };
}

async function passwordResetCode({email})
{
  const user = await User.findOne({email});
  const authcode = await createAuthCode(user._id, "reset");
  mailer.sendPasswordResetCode(user.email, authcode);
  return {success: true};
}

async function finishPasswordReset({email, newPassword, authCode})
{
  const user = await User.findOne({email});
  if(await verifyAuthCode(user._id, "reset" ,authCode ))
  {
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return {success : true};
  }
  return {success : false};
}

async function verifyUser({uid, authCode})
{
  const user = await User.findOne({_id : uid});
  if(await verifyAuthCode(user._id, "verify" ,authCode ))
  {
    user.isVerified = true;
    await user.save();
    return {success : true};
  }
  return {success : false};
}

async function NewVerCode({uid})
{
  const user = await User.findOne({_id: uid});
  const authcode = await createAuthCode(user._id, "verify");
  mailer.sendVerificationCode(user.email, authcode);
  return {uid: user._id};
}


module.exports = {claimDaily, createUser,  login,  passwordResetCode, finishPasswordReset, verifyUser, NewVerCode,  DAILY_CLAIM_AMOUNT,  DAILY_CLAIM_INTERVAL_MS};