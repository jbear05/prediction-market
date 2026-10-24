// Creates or updates the admin and demo users. Safe to run as many times as you like:
// users are matched by email, so a rerun updates them instead of making duplicates.
// Usage (from the backend folder): npm run seed

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { seedMarkets } = require('./seedMarkets');

const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = 'DemoPass123!'; // shared by every demo user (test data only)
const DAY = 24 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === 'production';
const adminPassword = process.env.SEED_ADMIN_PASSWORD || (isProduction ? null : 'AdminPass123!');

const demoUsers = [
  { email: 'alex.rivera@example.com', displayName: 'AlexRivera', balance: 340, isVerified: true, lastDailyClaimAt: daysAgo(0) },
  { email: 'brianna.cole@example.com', displayName: 'BriCole', balance: 1250, isVerified: true, lastDailyClaimAt: daysAgo(1) },
  { email: 'carlos.mendez@example.com', displayName: 'CarlosM', balance: 75, isVerified: true, lastDailyClaimAt: daysAgo(3) },
  { email: 'dana.kim@example.com', displayName: 'DanaKim', balance: 520, isVerified: true, lastDailyClaimAt: daysAgo(0) },
  { email: 'ethan.patel@example.com', displayName: 'EthanP', balance: 0, isVerified: true, lastDailyClaimAt: daysAgo(7) },
  { email: 'fatima.ali@example.com', displayName: 'FatimaAli', balance: 890, isVerified: true, lastDailyClaimAt: daysAgo(2) },
  { email: 'george.nguyen@example.com', displayName: 'GeorgeN', balance: 100, isVerified: false, lastDailyClaimAt: null },
  { email: 'hannah.brooks@example.com', displayName: 'HannahB', balance: 210, isVerified: true, lastDailyClaimAt: daysAgo(10) },
];

function daysAgo(n) {
  return new Date(Date.now() - n * DAY);
}

async function upsertUser(data, plainPassword) {
  const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  return User.findOneAndUpdate(
    { email: data.email },
    // $unset clears fields an older version of the schema stored. strict:false lets
    // Mongoose send it, since those fields are no longer in models/User.js
    { $set: { ...data, passwordHash }, $unset: { isBanned: 1, updatedAt: 1 } },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true, strict: false }
  );
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Run this from the backend folder, next to your .env file.');
  }
  if (!adminPassword) {
    throw new Error('NODE_ENV is production, so set SEED_ADMIN_PASSWORD in .env first (see the guide).');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to database: ${mongoose.connection.name}`);

  // Make sure the indexes in models/User.js exist in the database
  await User.syncIndexes();

  await upsertUser(
    { email: 'admin@example.com', displayName: 'Admin', role: 'admin', isVerified: true, balance: 0 },
    adminPassword
  );
  for (const user of demoUsers) {
    await upsertUser({ role: 'user', ...user }, DEMO_PASSWORD);
  }

  const users = await User.find().sort({ role: 1, displayName: 1 }).lean();
  console.table(
    users.map((u) => ({ email: u.email, displayName: u.displayName, role: u.role, balance: u.balance, verified: u.isVerified }))
  );
  console.log(`Done: ${users.length} users in ${mongoose.connection.name}.users`);

  await seedMarkets();
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());