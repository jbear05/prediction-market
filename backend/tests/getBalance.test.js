const testDb = require('./testDb');
const { makeUser } = require('./factories');
const { getBalance } = require('../services/users');

beforeAll(testDb.connect);
afterEach(testDb.clear);
afterAll(testDb.disconnect);

describe('getBalance', () => {
	test('returns the balance for the requested user', async () => {
		const user = await makeUser({ balance: 375 });
		await expect(getBalance({ userId: user._id })).resolves.toEqual({ balance: 375 });
	});

	test('throws USER_NOT_FOUND for an unknown user', async () => {
		await expect(getBalance({ userId: '64b000000000000000000000' }))
			.rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
	});
});