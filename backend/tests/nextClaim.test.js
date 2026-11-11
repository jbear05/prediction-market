const testDb = require('./testDb');
const { makeUser } = require('./factories');
const { nextClaim, DAILY_CLAIM_INTERVAL_MS } = require('../services/users');

beforeAll(testDb.connect);
afterEach(testDb.clear);
afterAll(testDb.disconnect);

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
			claimEligible: false
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