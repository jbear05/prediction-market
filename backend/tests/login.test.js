jest.mock('../services/users', () => ({ login: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn() }));

const users = require('../services/users');
const jwt = require('jsonwebtoken');
const router = require('../API/login');
const { AppError } = require('../services/errors');
const { invokeRoute, makeJwtToken, testRoute } = require('./apiTestHelpers');

const originalJwtSecret = process.env.JWT_SECRET;
const jwtSecret =
	'904961ee82b10ec87686216ac3d416ffcec149c5dd4bf9c83e67371fde4d4a3162a3383b288b689523bfa2be893be7dd';
const testUserId = '98ae7a88404f4fcdee142747';
const testToken = makeJwtToken(testUserId, jwtSecret);
const loginArgs = { email: 'person@example.com', rawPassword: 'password' };
const loginResult = { userId: testUserId, balance: 100 };

testRoute({
	name: 'login',
	router,
	method: 'post',
	path: '/',
	request: { body: loginArgs },
	service: users.login,
	args: loginArgs,
	result: loginResult,
	response: { ...loginResult, token: testToken },
	beforeEachTest: () => {
		process.env.JWT_SECRET = jwtSecret;
		jwt.sign.mockReturnValue(testToken);
	},
});

afterAll(() => {
	if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
	else process.env.JWT_SECRET = originalJwtSecret;
});

test('returns 401 for invalid credentials', async () => {
	users.login.mockRejectedValue(
		new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
	);

	const { res, next } = await invokeRoute(router, 'post', '/', { body: loginArgs });

	expect(res.status).toHaveBeenCalledWith(401);
	expect(res.json).toHaveBeenCalledWith({
		error: 'INVALID_CREDENTIALS',
		message: 'Invalid email or password'
	});
	expect(jwt.sign).not.toHaveBeenCalled();
	expect(next).not.toHaveBeenCalled();
});

test('returns 403 for an account that still needs verification', async () => {
	users.login.mockResolvedValue({ needVerification: true, userId: testUserId });

	const { res, next } = await invokeRoute(router, 'post', '/', { body: loginArgs });

	expect(res.status).toHaveBeenCalledWith(403);
	expect(res.json).toHaveBeenCalledWith({
		error: 'EMAIL_NOT_VERIFIED',
		message: 'Please verify your email before logging in.',
	});
	expect(jwt.sign).not.toHaveBeenCalled();
	expect(next).not.toHaveBeenCalled();
});