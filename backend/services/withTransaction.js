const mongoose = require('mongoose');

// Runs fn(session) in a MongoDB transaction: every write inside either all
// happens or none does. The driver retries fn on write conflicts, so fn must
// only touch the database (no emails, no res.json) and must pass { session }
// to every query.
async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction };