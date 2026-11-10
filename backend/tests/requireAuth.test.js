jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

const jwt = require('jsonwebtoken');
const requireAuth = require('../middleware/requireAuth');

const jwtSecret =
	'904961ee82b10ec87686216ac3d416ffcec149c5dd4bf9c83e67371fde4d4a3162a3383b288b689523bfa2be893be7dd';
const testUserId = '98ae7a88404f4fcdee142747';
const testToken = require('./apiTestHelpers').makeJwtToken(testUserId, jwtSecret);

function makeRequest(authorization = '') {
	return { get: jest.fn().mockReturnValue(authorization) };
}

function makeResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
	};
}

const originalJwtSecret = process.env.JWT_SECRET;

beforeEach(() => {
	jest.clearAllMocks();
	process.env.JWT_SECRET = jwtSecret;
});

afterAll(() => {
	if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
	else process.env.JWT_SECRET = originalJwtSecret;
});

test('JWT fixture has a valid signature and unexpired claims', () => {
	const payload = jest.requireActual('jsonwebtoken').verify(testToken, jwtSecret, {
		algorithms: ['HS256'],
	});

	expect(payload.sub).toBe(testUserId);
});

test('returns 500 when authentication is not configured', () => {
	delete process.env.JWT_SECRET;
	const req = makeRequest(`Bearer ${testToken}`);
	const res = makeResponse();
	const next = jest.fn();

	requireAuth(req, res, next);

	expect(res.status).toHaveBeenCalledWith(500);
	expect(res.json).toHaveBeenCalledWith({ error: 'Authentication is not configured' });
	expect(jwt.verify).not.toHaveBeenCalled();
	expect(next).not.toHaveBeenCalled();
});

test.each(['', `Basic ${testToken}`, 'Bearer', testToken])(
	'rejects malformed authorization header %j',
	(authorization) => {
		const req = makeRequest(authorization);
		const res = makeResponse();
		const next = jest.fn();

		requireAuth(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
		expect(jwt.verify).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	},
);

test('verifies a bearer token and attaches its subject to the request', () => {
	jwt.verify.mockReturnValue({ sub: testUserId });
	const req = makeRequest(`bEaReR ${testToken}`);
	const res = makeResponse();
	const next = jest.fn();

	requireAuth(req, res, next);

	expect(jwt.verify).toHaveBeenCalledWith(
		testToken,
		jwtSecret,
		{ algorithms: ['HS256'] },
	);
	expect(req.user).toEqual({ id: testUserId });
	expect(next).toHaveBeenCalledTimes(1);
	expect(res.status).not.toHaveBeenCalled();
});

test('rejects invalid or expired tokens', () => {
	jwt.verify.mockImplementation(() => {
		throw new Error('expired');
	});
	const req = makeRequest(`Bearer ${testToken}`);
	const res = makeResponse();
	const next = jest.fn();

	requireAuth(req, res, next);

	expect(res.status).toHaveBeenCalledWith(401);
	expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
	expect(next).not.toHaveBeenCalled();
});

test.each([null, testUserId, [], {}, { sub: 1 }, { sub: null }])(
	'rejects token payload without a string subject: %j',
	(payload) => {
		jwt.verify.mockReturnValue(payload);
		const req = makeRequest(`Bearer ${testToken}`);
		const res = makeResponse();
		const next = jest.fn();

		requireAuth(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
		expect(next).not.toHaveBeenCalled();
	},
);