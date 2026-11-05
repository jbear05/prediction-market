jest.mock('../models/User', () => ({ findById: jest.fn() }));

const User = require('../models/User');
const requireAdmin = require('../middleware/requireAdmin');
const testUserId = '98ae7a88404f4fcdee142747';

function makeResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
	};
}

beforeEach(() => jest.clearAllMocks());

test('rejects requests without an authenticated user', async () => {
	const res = makeResponse();
	const next = jest.fn();

	await requireAdmin({ user: undefined }, res, next);

	expect(res.status).toHaveBeenCalledWith(401);
	expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
	expect(User.findById).not.toHaveBeenCalled();
	expect(next).not.toHaveBeenCalled();
});

test('rejects a user that no longer exists', async () => {
	User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
	const res = makeResponse();
	const next = jest.fn();

	await requireAdmin({ user: { id: testUserId } }, res, next);

	expect(User.findById).toHaveBeenCalledWith(testUserId);
	expect(res.status).toHaveBeenCalledWith(401);
	expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
	expect(next).not.toHaveBeenCalled();
});

test('rejects an authenticated non-admin', async () => {
	User.findById.mockReturnValue({
		select: jest.fn().mockResolvedValue({ role: 'user' }),
	});
	const res = makeResponse();
	const next = jest.fn();

	await requireAdmin({ user: { id: testUserId } }, res, next);

	expect(res.status).toHaveBeenCalledWith(403);
	expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
	expect(next).not.toHaveBeenCalled();
});

test('allows an admin to continue', async () => {
	User.findById.mockReturnValue({
		select: jest.fn().mockResolvedValue({ role: 'admin' }),
	});
	const res = makeResponse();
	const next = jest.fn();

	await requireAdmin({ user: { id: testUserId } }, res, next);

	expect(User.findById).toHaveBeenCalledWith(testUserId);
	expect(User.findById.mock.results[0].value.select).toHaveBeenCalledWith('role');
	expect(next).toHaveBeenCalledTimes(1);
	expect(res.status).not.toHaveBeenCalled();
});

test('forwards database errors to Express error handling', async () => {
	const error = new Error('database unavailable');
	User.findById.mockReturnValue({ select: jest.fn().mockRejectedValue(error) });
	const res = makeResponse();
	const next = jest.fn();

	await requireAdmin({ user: { id: testUserId } }, res, next);

	expect(next).toHaveBeenCalledWith(error);
	expect(res.status).not.toHaveBeenCalled();
});