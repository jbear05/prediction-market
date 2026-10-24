// Starts a throwaway in-memory MongoDB for a test file. It runs as a one-node
// replica set because transactions (used by placeWager etc.) need one.
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;

async function connect() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  // runtimeAdapters: Jest can't run the driver's built-in `import('os')`, and
  // without it the server rejects the connection ("Missing required
  // sub-document 'driver'"). Handing the driver `os` directly fixes that.
  await mongoose.connect(replSet.getUri(), { runtimeAdapters: { os: require('os') } });
  // Build every model's indexes before the tests run (unique email, etc.)
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

async function clear() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

module.exports = { connect, clear, disconnect };