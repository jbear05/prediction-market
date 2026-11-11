const testDb = require('./testDb');
const { makeUser } = require('./factories');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const {
  dailyClaim,
  nextClaim,
  getBalance,
  DAILY_CLAIM_AMOUNT,
  DAILY_CLAIM_INTERVAL_MS,
} = require('../services/users');

beforeAll(testDb.connect);
afterEach(testDb.clear);
afterAll(testDb.disconnect);

describe('dailyClaim', () => {
  test('first claim adds the daily coins and a ledger row', async () => {
    const user = await makeUser({ balance: 10 });
    const result = await dailyClaim({ userId: user._id });
    expect(result.balance).toBe(10 + DAILY_CLAIM_AMOUNT);
    expect(await Transaction.countDocuments({ userId: user._id, type: 'daily_claim' })).toBe(1);
  });

  test('a second claim within 24 hours is refused and says when to come back', async () => {
    const user = await makeUser();
    await dailyClaim({ userId: user._id });
    const err = await dailyClaim({ userId: user._id }).catch((e) => e);
    expect(err.code).toBe('ALREADY_CLAIMED');
    expect(err.nextClaimAt.getTime()).toBeGreaterThan(Date.now() + DAILY_CLAIM_INTERVAL_MS - 60 * 1000);
    expect((await User.findById(user._id)).balance).toBe(1000 + DAILY_CLAIM_AMOUNT);
  });

  test('works again once 24 hours have passed', async () => {
    const user = await makeUser({ lastDailyClaimAt: new Date(Date.now() - DAILY_CLAIM_INTERVAL_MS - 1000) });
    await expect(dailyClaim({ userId: user._id })).resolves.toMatchObject({ balance: 1000 + DAILY_CLAIM_AMOUNT });
  });

  test('five clicks at the same moment pay out once', async () => {
    const user = await makeUser();
    const attempts = await Promise.allSettled([1, 2, 3, 4, 5].map(() => dailyClaim({ userId: user._id })));
    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    expect((await User.findById(user._id)).balance).toBe(1000 + DAILY_CLAIM_AMOUNT);
  });

  test('an unknown user gets USER_NOT_FOUND', async () => {
    await expect(dailyClaim({ userId: '64b000000000000000000000' })).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});

describe('nextClaim', () => {
  test('a user who has never claimed is immediately eligible', async () => {
    const user = await makeUser({ lastDailyClaimAt: null });
    const result = await nextClaim({ userId: user._id });

    expect(result.claimEligible).toBe(true);
    expect(result.nextClaimAt).toBeInstanceOf(Date);
    expect(result.nextClaimAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(result.nextClaimAt.getTime()).toBeGreaterThan(Date.now() - 1000);
  });

  test('returns the end of the cooldown for a recent claim', async () => {
    const lastDailyClaimAt = new Date(Date.now() - 60 * 60 * 1000);
    const user = await makeUser({ lastDailyClaimAt });

    await expect(nextClaim({ userId: user._id })).resolves.toEqual({
      nextClaimAt: new Date(lastDailyClaimAt.getTime() + DAILY_CLAIM_INTERVAL_MS),
      claimEligible: false,
    });
  });

  test('a user whose cooldown has elapsed is eligible immediately', async () => {
    const user = await makeUser({
      lastDailyClaimAt: new Date(Date.now() - DAILY_CLAIM_INTERVAL_MS - 1000),
    });
    const result = await nextClaim({ userId: user._id });

    expect(result.claimEligible).toBe(true);
    expect(result.nextClaimAt).toBeInstanceOf(Date);
    expect(result.nextClaimAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(result.nextClaimAt.getTime()).toBeGreaterThan(Date.now() - 1000);
  });

  test('rejects an invalid user ID', async () => {
    await expect(nextClaim({ userId: 'not-an-object-id' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_ID' });
  });

  test('returns USER_NOT_FOUND for an unknown user', async () => {
    await expect(nextClaim({ userId: '64b000000000000000000000' }))
      .rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
  });
});

describe('getBalance', () => {
  test('returns the balance for the requested user', async () => {
    const user = await makeUser({ balance: 375 });
    await expect(getBalance({ userId: user._id })).resolves.toEqual({ balance: 375 });
  });

  test('rejects an invalid user ID', async () => {
    await expect(getBalance({ userId: 'not-an-object-id' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_ID' });
  });

  test('throws USER_NOT_FOUND for an unknown user', async () => {
    await expect(getBalance({ userId: '64b000000000000000000000' }))
      .rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
  });
});