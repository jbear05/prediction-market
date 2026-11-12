jest.mock('../services/wagers', () => ({ getWagers: jest.fn() }));

const wagers = require('../services/wagers');
const router = require('../API/getWagers');
const { testRoute } = require('./apiTestHelpers');

testRoute({
	name: 'getWagers',
	router,
	method: 'get',
	path: '/',
	service: wagers.getWagers,
	args: { userId: '98ae7a88404f4fcdee142747' },
	result: [{ wagerId: 'wager-id', side: 'yes', amount: 25, outcome: 'undecided' }],
});