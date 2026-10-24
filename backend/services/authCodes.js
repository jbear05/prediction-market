const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AuthCode = require('../models/AuthCode');

const CODE_LIFETIME_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

// Makes a new 6-digit code for a user ("verify" or "reset"), replacing any
// older code for the same purpose. Returns the plain code so the caller can
// email it; only the hash is saved.
async function createAuthCode(userId, purpose) {
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  await AuthCode.deleteMany({ userId, purpose });
  await AuthCode.create({ userId, purpose, codeHash, expiresAt: new Date(Date.now() + CODE_LIFETIME_MS) });
  return code;
}

// True if the code is right and not expired. A correct code is deleted, so it
// works only once. (The TTL index removes expired codes about a minute late,
// so the expiresAt check here is what actually enforces the 15 minutes.)
async function verifyAuthCode(userId, purpose, code) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
  const saved = await AuthCode.findOne({ userId, purpose, expiresAt: { $gt: new Date() } });
  if (!saved || !(await bcrypt.compare(code, saved.codeHash))) return false;
  const { deletedCount } = await AuthCode.deleteOne({ _id: saved._id });
  return deletedCount === 1; // if two requests race, only one gets true
}

module.exports = { createAuthCode, verifyAuthCode, CODE_LIFETIME_MS };