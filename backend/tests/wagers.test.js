const testDb = require('./testDb');
const { makeUser, makeQuestion, HOUR } = require('./factories');
const User = require('../models/User');
const Question = require('../models/Question');
const Wager = require('../models/Wager');
const Transaction = require('../models/Transaction');
const { placeWager } = require('../services/wagers');

beforeAll(testDb.connect);
afterEach(testDb.clear);
afterAll(testDb.disconnect);

describe('placeWager', () => {
  test('takes the coins, adds to the pool, and records the wager and ledger row', async () => {
    const user = await makeUser({ balance: 500 });
    const question = await makeQuestion(user);

    const result = await placeWager({ userId: user._id, questionId: question._id, side: 'yes', amount: 200 });

    expect(result.balance).toBe(300);
    const q = await Question.findById(question._id);
    expect(q.poolYes).toBe(200);
    expect(q.poolNo).toBe(0);
    expect(await Wager.countDocuments({ userId: user._id, amount: 200, side: 'yes' })).toBe(1);
    const tx = await Transaction.findOne({ userId: user._id });
    expect(tx.type).toBe('wager');
    expect(tx.amount).toBe(-200);
  });

  test('refuses a wager bigger than the balance and changes nothing', async () => {
    const user = await makeUser({ balance: 50 });
    const question = await makeQuestion(user);

    await expect(
      placeWager({ userId: user._id, questionId: question._id, side: 'no', amount: 51 })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });

    expect((await User.findById(user._id)).balance).toBe(50);
    expect((await Question.findById(question._id)).poolNo).toBe(0);
    expect(await Wager.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments()).toBe(0);
  });

  test('lets a user bet their entire balance', async () => {
    const user = await makeUser({ balance: 75 });
    const question = await makeQuestion(user);
    const result = await placeWager({ userId: user._id, questionId: question._id, side: 'yes', amount: 75 });
    expect(result.balance).toBe(0);
  });

  test('two wagers at the same moment cannot spend the same coins', async () => {
    const user = await makeUser({ balance: 1000 });
    const question = await makeQuestion(user);

    const attempts = await Promise.allSettled(
      [1, 2, 3].map(() => placeWager({ userId: user._id, questionId: question._id, side: 'yes', amount: 400 }))
    );

    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(2);
    expect((await User.findById(user._id)).balance).toBe(200);
    expect((await Question.findById(question._id)).poolYes).toBe(800);
    expect(await Wager.countDocuments()).toBe(2);
  });

  test.each([
    ['pending', {}],
    ['closed', {}],
    ['resolved', { outcome: 'yes' }],
    ['open but past closesAt', { closesAt: new Date(Date.now() - HOUR) }],
  ])('refuses a wager on a %s question', async (label, extra) => {
    const user = await makeUser();
    const status = label.startsWith('open') ? 'open' : label;
    const question = await makeQuestion(user, { status, ...extra });

    await expect(
      placeWager({ userId: user._id, questionId: question._id, side: 'yes', amount: 10 })
    ).rejects.toMatchObject({ code: 'QUESTION_NOT_OPEN' });
    expect((await User.findById(user._id)).balance).toBe(1000);
  });

  test('refuses an unknown user, and the pool is not touched', async () => {
    const creator = await makeUser();
    const question = await makeQuestion(creator);

    await expect(
      placeWager({ userId: '64b000000000000000000000', questionId: question._id, side: 'yes', amount: 10 })
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    expect((await Question.findById(question._id)).poolYes).toBe(0);
  });

  test.each([0, -5, 1.5, '10', null])('refuses the amount %p', async (amount) => {
    const user = await makeUser();
    const question = await makeQuestion(user);
    await expect(
      placeWager({ userId: user._id, questionId: question._id, side: 'yes', amount })
    ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
  });

  test('refuses a side other than A or B, and a malformed id', async () => {
    const user = await makeUser();
    const question = await makeQuestion(user);
    await expect(
      placeWager({ userId: user._id, questionId: question._id, side: 'maybe', amount: 10 })
    ).rejects.toMatchObject({ code: 'INVALID_SIDE' });
    await expect(
      placeWager({ userId: 'abc', questionId: question._id, side: 'yes', amount: 10 })
    ).rejects.toMatchObject({ code: 'INVALID_ID' });
  });
});