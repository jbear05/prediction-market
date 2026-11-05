jest.mock('../services/users', () => ({ verifyUser: jest.fn() }));

const users = require('../services/users');
const router = require('../API/verifyUser');
const { invokeRoute, testRoute } = require('./apiTestHelpers');

const body = { email: 'person@example.com', authCode: '123456' };

testRoute({
	name: 'verifyUser',
	router,
	method: 'post',
	path: '/',
	request: { body },
	service: users.verifyUser,
	args: body,
});

test('returns 400 when the verification code is invalid', async () => {
	users.verifyUser.mockResolvedValue({ success: false });

	const { res, next } = await invokeRoute(router, 'post', '/', { body });

	expect(res.status).toHaveBeenCalledWith(400);
	expect(res.json).toHaveBeenCalledWith({
		error: 'INVALID_VERIFICATION',
		message: 'Invalid email or verification code',
	});
	expect(next).not.toHaveBeenCalled();
});