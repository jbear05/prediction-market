const crypto = require('crypto');
const { AppError } = require('../services/errors');

function makeJwtToken(subject, secret) {
	const now = Math.floor(Date.now() / 1000);
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
	const payload = Buffer.from(JSON.stringify({
		sub: subject,
		iat: now,
		exp: now + 3600,
	})).toString('base64url');
	const signingInput = `${header}.${payload}`;
	const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
	return `${signingInput}.${signature}`;
}

function getHandler(router, method, path) {
	const layer = router.stack.find(
		(entry) => entry.route?.path === path && entry.route.methods[method],
	);
	if (!layer) throw new Error(`Missing ${method.toUpperCase()} ${path} route`);
	return layer.route.stack.at(-1).handle;
}

async function invokeRoute(router, method, path, overrides = {}) {
	const req = {
		params: {},
		body: {},
		query: {},
		user: { id: '98ae7a88404f4fcdee142747' },
		...overrides,
	};
	const res = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
	};
	const next = jest.fn();
	await getHandler(router, method, path)(req, res, next);
	return { req, res, next };
}

function testRoute({
	name, router, method, path, service, args, request = {}, status = 200,
	result = { success: true }, response = result, beforeEachTest, 
}) {
	describe(`${name} route`, () => {
		beforeEach(() => {
			jest.clearAllMocks();
			beforeEachTest?.();
		});

		test('passes request values to its service and returns the successful result', async () => {
			service.mockResolvedValue(result);

			const { res, next } = await invokeRoute(router, method, path, request);

			expect(service).toHaveBeenCalledTimes(1);
			expect(service).toHaveBeenCalledWith(args);
			expect(res.status).toHaveBeenCalledWith(status);
			expect(res.json).toHaveBeenCalledWith(response);
			expect(next).not.toHaveBeenCalled();
		});

		test('translates AppError into its HTTP status and error response', async () => {
			service.mockRejectedValue(new AppError(422, 'INVALID_INPUT', 'Invalid input'));

			const { res, next } = await invokeRoute(router, method, path, request);

			expect(res.status).toHaveBeenCalledWith(422);
			expect(res.json).toHaveBeenCalledWith({
				error: 'INVALID_INPUT',
				message: 'Invalid input',
			});
			expect(next).not.toHaveBeenCalled();
		});

		test('forwards unexpected errors to Express error handling', async () => {
			const error = new Error('Service unavailable');
			service.mockRejectedValue(error);

			const { res, next } = await invokeRoute(router, method, path, request);

			expect(next).toHaveBeenCalledWith(error);
			expect(res.status).not.toHaveBeenCalled();
			expect(res.json).not.toHaveBeenCalled();
		});
	});
}

function expectAdminMiddleware(router, path) {
	const layer = router.stack.find((entry) => entry.route?.path === path);
	expect(layer).toBeDefined();
	expect(layer.route.stack[0].handle).toBe(require('../middleware/requireAdmin'));
}

module.exports = { expectAdminMiddleware, invokeRoute, makeJwtToken, testRoute };