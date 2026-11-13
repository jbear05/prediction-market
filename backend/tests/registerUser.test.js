jest.mock('../services/users', () => ({ createUser: jest.fn() }));

const users = require('../services/users');
const router = require('../API/registerUser');
const { AppError } = require('../services/errors');
const { invokeRoute, testRoute } = require('./apiTestHelpers');

const body = {
	email: 'person@example.com',
	displayName: 'Person',
	rawPassword: 'password',
};

testRoute({
	name: 'registerUser',
	router,
	method: 'post',
	path: '/',
	request: { body },
	service: users.createUser,
	args: body,
	status: 201,
});

test.each([[400, 'INVALID_USER'], [409, 'USER_ALREADY_EXISTS']])
('maps %s registration errors to HTTP responses', async (status, code) => {
	users.createUser.mockRejectedValue(new AppError(status, code, 'Registration failed'));

	const { res, next } = await invokeRoute(router, 'post', '/', { body });

	expect(res.status).toHaveBeenCalledWith(status);
	expect(res.json).toHaveBeenCalledWith({ error: code, message: 'Registration failed' });
	expect(next).not.toHaveBeenCalled();
});