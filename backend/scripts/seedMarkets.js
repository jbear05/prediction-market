// Demo questions and wagers for `npm run seed`. Called by seed.js after the users exist.
// Safe to rerun: it only deletes the questions listed below (matched by title)
// plus their wagers, ledger rows, and reports, then builds them again with the
// real helpers, so pools, balances, and payouts are exactly what the app would produce.
const Question = require('../models/Question');
const Wager = require('../models/Wager');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const AuthCode = require('../models/AuthCode');
const User = require('../models/User');
const { placeWager } = require('../services/wagers');
const { resolveQuestion, cancelQuestion } = require('../services/questions');

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY);

// status: what the question ends up as. wagers: [displayName, side, amount], placed while it's open.
const demoQuestions = [
  {
    title: 'Will UCF beat Baylor this Saturday?',
    category: 'sports',
    creator: 'AlexRivera',
    description: 'Resolves Yes if UCF wins, using the final score on ucfknights.com.',
    closesAt: inDays(5),
    status: 'open',
    wagers: [['AlexRivera', 'yes', 100], ['BriCole', 'no', 200], ['DanaKim', 'yes', 50], ['FatimaAli', 'yes', 150]],
  },
  {
    title: 'Will Apple announce a foldable iPhone before June 2027?',
    category: 'tech',
    creator: 'BriCole',
    description: 'Resolves Yes if an official Apple press release or keynote announces one.',
    closesAt: inDays(30),
    status: 'open',
    wagers: [['BriCole', 'yes', 300], ['CarlosM', 'no', 25], ['FatimaAli', 'no', 100]],
  },
  {
    title: 'Will the Student Union food court open before 8am by spring semester?',
    category: 'campus',
    creator: 'DanaKim',
    description: 'Resolves Yes if the UCF dining website lists an opening time before 8am on the first day of spring classes.',
    closesAt: inDays(60),
    status: 'open',
    wagers: [['GeorgeN', 'yes', 20]],
  },
  {
    title: 'Will the next Marvel movie make $1 billion worldwide?',
    category: 'entertainment',
    creator: 'FatimaAli',
    description: 'Resolves Yes if Box Office Mojo shows at least $1B worldwide 60 days after release.',
    closesAt: inDays(14),
    status: 'open',
    wagers: [],
  },
  {
    title: 'Will Florida voter turnout top 60% in the next statewide election?',
    category: 'politics',
    creator: 'DanaKim',
    description: 'Resolves Yes if the Florida Division of Elections reports turnout above 60%.',
    closesAt: inDays(20),
    status: 'pending',
    wagers: [],
  },
  {
    title: 'Will my roommate clean the kitchen this week?',
    category: 'other',
    creator: 'CarlosM',
    description: 'Resolves Yes if I say so.',
    closesAt: inDays(7),
    status: 'rejected',
    wagers: [],
  },
  {
    title: 'Will the Orlando Magic win their next home game?',
    category: 'sports',
    creator: 'AlexRivera',
    description: 'Resolves Yes if the Magic win, using the final score on nba.com.',
    closesAt: inDays(1),
    status: 'closed',
    wagers: [['AlexRivera', 'no', 40], ['BriCole', 'yes', 120]],
  },
  {
    title: 'Will COP 4331 final demos happen in December?',
    category: 'campus',
    creator: 'FatimaAli',
    description: 'Resolves Yes if the demo date on the course Webcourses page is in December.',
    closesAt: inDays(1),
    status: 'resolved',
    outcome: 'yes',
    wagers: [['DanaKim', 'yes', 100], ['FatimaAli', 'no', 60], ['BriCole', 'yes', 50]],
  },
  {
    title: 'Will the homecoming concert sell out?',
    category: 'entertainment',
    creator: 'BriCole',
    description: 'Resolves Yes if the ticketing page shows Sold Out before the event.',
    closesAt: inDays(3),
    status: 'cancelled',
    wagers: [['AlexRivera', 'yes', 30]],
  },
];

async function seedMarkets() {
  await Promise.all([
    Question.syncIndexes(),
    Wager.syncIndexes(),
    Transaction.syncIndexes(),
    Report.syncIndexes(),
    AuthCode.syncIndexes(),
  ]);

  const users = await User.find({}, { displayName: 1 });
  const byName = new Map(users.map((u) => [u.displayName, u]));

  // Remove the previous run's demo questions (and only those)
  const old = await Question.find({ title: { $in: demoQuestions.map((q) => q.title) } }, { _id: 1 });
  const oldIds = old.map((q) => q._id);
  await Promise.all([
    Wager.deleteMany({ questionId: { $in: oldIds } }),
    Transaction.deleteMany({ questionId: { $in: oldIds } }),
    Report.deleteMany({ questionId: { $in: oldIds } }),
  ]);
  await Question.deleteMany({ _id: { $in: oldIds } });

  for (const demo of demoQuestions) {
    const startsOpen = !['pending', 'rejected'].includes(demo.status);
    const question = await Question.create({
      creatorId: byName.get(demo.creator)._id,
      title: demo.title,
      description: demo.description,
      category: demo.category,
      closesAt: demo.closesAt,
      status: startsOpen ? 'open' : demo.status,
    });

    for (const [name, side, amount] of demo.wagers) {
      await placeWager({ userId: byName.get(name)._id, questionId: question._id, side, amount });
    }

    if (demo.status === 'closed') {
      await Question.updateOne({ _id: question._id }, { status: 'closed', closesAt: new Date(Date.now() - DAY) });
    } else if (demo.status === 'resolved') {
      await resolveQuestion({ questionId: question._id, outcome: demo.outcome });
      await Question.updateOne({ _id: question._id }, { closesAt: new Date(Date.now() - 2 * DAY) });
    } else if (demo.status === 'cancelled') {
      await cancelQuestion({ questionId: question._id });
    }
  }

  // One report so the admin moderation page has something to show
  const reported = await Question.findOne({ title: demoQuestions[0].title });
  await Report.create({
    reporterId: byName.get('DanaKim')._id,
    questionId: reported._id,
    reason: 'The kickoff time in the description is wrong.',
  });

  const counts = await Question.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  console.table(counts.map((c) => ({ status: c._id, questions: c.count })));

  const finalUsers = await User.find({}, { displayName: 1, balance: 1 }).sort({ displayName: 1 }).lean();
  console.log('Balances after wagers: ' + finalUsers.map((u) => `${u.displayName} ${u.balance}`).join(', '));
  console.log(
    `Done: ${await Question.countDocuments()} questions, ${await Wager.countDocuments()} wagers, ` +
      `${await Transaction.countDocuments()} transactions, ${await Report.countDocuments()} reports`
  );
}

module.exports = { seedMarkets };