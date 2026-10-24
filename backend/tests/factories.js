// Small helpers that create test documents with sensible defaults.
const User = require('../models/User');
const Question = require('../models/Question');

let counter = 0;
const HOUR = 60 * 60 * 1000;

function makeUser(fields = {}) {
  counter += 1;
  return User.create({
    email: `user${counter}@example.com`,
    displayName: `user${counter}`,
    passwordHash: 'not-a-real-hash',
    balance: 1000,
    ...fields,
  });
}

function makeQuestion(creator, fields = {}) {
  return Question.create({
    title: 'Will it rain on Friday?',
    description: 'Resolves Yes if NWS Orlando reports any rain on Friday.',
    creatorId: creator._id,
    creatorName: creator.displayName,
    status: 'open',
    closesAt: new Date(Date.now() + 24 * HOUR),
    ...fields,
  });
}

module.exports = { makeUser, makeQuestion, HOUR };