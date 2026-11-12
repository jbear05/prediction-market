jest.mock('../services/users', () => ({ nextClaim: jest.fn() }));

const users = require('../services/users');
const router = require('../API/nextClaim');
const { testRoute } = require('./apiTestHelpers');

testRoute({
	name: 'nextClaim',
	router,
	method: 'get',
	path: '/',
	service: users.nextClaim,
	args: { userId: '98ae7a88404f4fcdee142747' },
	result: { nextClaimAt: new Date('2026-11-12T20:00:00.000Z'), claimEligible: false },
});