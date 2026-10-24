const testDb = require('./testDb');
const { makeUser } = require('./factories');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { claimDaily, DAILY_CLAIM_AMOUNT, DAILY_CLAIM_INTERVAL_MS } = require('../services/users');

beforeAll(testDb.connect);
afterEach(testDb.clear);
afterAll(testDb.disconnect);

describe('claimDaily', () => {
  test('first claim adds the daily coins and a ledger row', async () => {
    const user = await makeUser({ balance: 10 });
    const result = await claimDaily(user._id);
    expect(result.balance).toBe(10 + DAILY_CLAIM_AMOUNT);
    expect(await Transaction.countDocuments({ userId: user._id, type: 'daily_claim' })).toBe(1);
  });

  test('a second claim within 24 hours is refused and says when to come back', async () => {
    const user = await makeUser();
    await claimDaily(user._id);
    const err = await claimDaily(user._id).catch((e) => e);
    expect(err.code).toBe('ALREADY_CLAIMED');
    expect(err.nextClaimAt.getTime()).toBeGreaterThan(Date.now() + DAILY_CLAIM_INTERVAL_MS - 60 * 1000);
    expect((await User.findById(user._id)).balance).toBe(1000 + DAILY_CLAIM_AMOUNT);
  });

  test('works again once 24 hours have passed', async () => {
    const user = await makeUser({ lastDailyClaimAt: new Date(Date.now() - DAILY_CLAIM_INTERVAL_MS - 1000) });
    await expect(claimDaily(user._id)).resolves.toMatchObject({ balance: 1000 + DAILY_CLAIM_AMOUNT });
  });

  test('five clicks at the same moment pay out once', async () => {
    const user = await makeUser();
    const attempts = await Promise.allSettled([1, 2, 3, 4, 5].map(() => claimDaily(user._id)));
    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    expect((await User.findById(user._id)).balance).toBe(1000 + DAILY_CLAIM_AMOUNT);
  });

  test('an unknown user gets USER_NOT_FOUND', async () => {
    await expect(claimDaily('64b000000000000000000000')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});