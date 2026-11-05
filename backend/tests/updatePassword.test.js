jest.mock('../services/users', () => ({ finishPasswordReset: jest.fn() }));

const users = require('../services/users');
const router = require('../API/updatePassword');
const { invokeRoute, testRoute } = require('./apiTestHelpers');

const body = {
	email: 'person@example.com',
	newPassword: 'new-password',
	authCode: '123456',
};

testRoute({
	name: 'updatePassword',
	router,
	method: 'post',
	path: '/update',
	request: { body },
	service: users.finishPasswordReset,
	args: body,
});

test('returns 400 when the reset code is invalid', async () => {
	users.finishPasswordReset.mockResolvedValue({ success: false });

	const { res, next } = await invokeRoute(router, 'post', '/update', { body });

	expect(res.status).toHaveBeenCalledWith(400);
	expect(res.json).toHaveBeenCalledWith({
		error: 'INVALID_PASSWORD_RESET',
		message: 'Invalid email or password reset code',
	});
	expect(next).not.toHaveBeenCalled();
});