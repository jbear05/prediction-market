jest.mock('../services/users', () => ({ passwordResetCode: jest.fn() }));

const users = require('../services/users');
const router = require('../API/resetPassword');
const { testRoute } = require('./apiTestHelpers');

testRoute({
	name: 'resetPassword',
	router,
	method: 'post',
	path: '/reset',
	request: { body: { email: 'person@example.com' } },
	service: users.passwordResetCode,
	args: { email: 'person@example.com' },
});