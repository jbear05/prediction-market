jest.mock('../services/users', () => ({ dailyClaim: jest.fn() }));

const users = require('../services/users');
const router = require('../API/dailyClaim');
const { testRoute } = require('./apiTestHelpers');

testRoute({
	name: 'dailyClaim',
	router,
	method: 'post',
	path: '/',
	service: users.dailyClaim,
	args: { userId: '98ae7a88404f4fcdee142747' },
});