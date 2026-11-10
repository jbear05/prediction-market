jest.mock('../services/users', () => ({ newVerCode: jest.fn() }));

const users = require('../services/users');
const router = require('../API/resendVerification');
const { testRoute } = require('./apiTestHelpers');

testRoute({
	name: 'resendVerification',
	router,
	method: 'post',
	path: '/resend',
	request: { body: { email: 'person@example.com' } },
	service: users.newVerCode,
	args: { email: 'person@example.com' },
});