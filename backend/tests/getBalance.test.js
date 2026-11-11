jest.mock('../services/users', () => ({ getBalance: jest.fn() }));

const users = require('../services/users');
const router = require('../API/getBalance');
const { testRoute } = require('./apiTestHelpers');

testRoute({
	name: 'getBalance',
	router,
	method: 'get',
	path: '/',
	service: users.getBalance,
	args: { userId: '98ae7a88404f4fcdee142747' },
	result: { balance: 375 },
});