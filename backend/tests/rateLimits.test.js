const express = require('express');
const { createRateLimits } = require('../middleware/rateLimits');

// A tiny app with the real limiters in front of fake routes. Fake logins fail
// unless the password is "right", so the failed-only limits can be checked.
let server;
let baseUrl;

beforeEach(async () => {
	const limits = createRateLimits();
	const app = express();
	app.use(express.json());
	app.use('/api', limits.api);
	app.post('/api/login', limits.loginPerIp, limits.loginPerEmail, (req, res) => {
		if (req.body.password === 'right') return res.json({ ok: true });
		res.status(401).json({ error: 'INVALID_CREDENTIALS' });
	});
	app.post('/api/password/reset', limits.emailPerIp, limits.emailPerAddress, (req, res) => res.json({ success: true }));
	app.post('/api/verify', limits.codeChecksPerIp, (req, res) => res.status(400).json({ error: 'INVALID_VERIFICATION' }));
	app.get('/api/ping', (req, res) => res.json({ ok: true }));

	await new Promise((resolve) => {
		server = app.listen(0, '127.0.0.1', resolve);
	});
	baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => new Promise((resolve) => server.close(resolve)));

function post(path, body) {
	return fetch(baseUrl + path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

async function repeat(times, send) {
	const statuses = [];
	for (let i = 0; i < times; i++) statuses.push((await send()).status);
	return statuses;
}

describe('login limits', () => {
	test('10 failed logins for one account blocks the 11th with a 429 and a message', async () => {
		const statuses = await repeat(10, () => post('/api/login', { email: 'alex@example.com', password: 'wrong' }));
		expect(statuses.every((status) => status === 401)).toBe(true);

		const blocked = await post('/api/login', { email: 'alex@example.com', password: 'right' });
		expect(blocked.status).toBe(429);
		expect(await blocked.json()).toMatchObject({ error: 'TOO_MANY_REQUESTS', message: expect.any(String) });
		expect(blocked.headers.get('ratelimit-policy')).toBeTruthy();
	});

	test('counts the same email in any capitalization as one account', async () => {
		await repeat(10, () => post('/api/login', { email: 'Alex@Example.com ', password: 'wrong' }));
		expect((await post('/api/login', { email: 'alex@example.com', password: 'wrong' })).status).toBe(429);
	});

	test('a blocked account does not block other accounts on the same network', async () => {
		await repeat(10, () => post('/api/login', { email: 'alex@example.com', password: 'wrong' }));
		expect((await post('/api/login', { email: 'sam@example.com', password: 'right' })).status).toBe(200);
	});

	test('successful logins never count', async () => {
		const statuses = await repeat(30, () => post('/api/login', { email: 'alex@example.com', password: 'right' }));
		expect(statuses.every((status) => status === 200)).toBe(true);
	});

	test('many failed logins across accounts from one network are capped too', async () => {
		const statuses = await repeat(51, (i) => post('/api/login', { email: `user${Math.random()}@example.com`, password: 'wrong' }));
		expect(statuses.slice(0, 50).every((status) => status === 401)).toBe(true);
		expect(statuses[50]).toBe(429);
	});
});

describe('email-sending limits', () => {
	test('3 reset emails per address per 15 minutes', async () => {
		const statuses = await repeat(4, () => post('/api/password/reset', { email: 'alex@example.com' }));
		expect(statuses).toEqual([200, 200, 200, 429]);
		expect((await post('/api/password/reset', { email: 'sam@example.com' })).status).toBe(200);
	});

	test('requests without an email are left for the route to reject', async () => {
		const statuses = await repeat(5, () => post('/api/password/reset', {}));
		expect(statuses.every((status) => status === 200)).toBe(true);
	});
});

describe('code check limits', () => {
	test('50 wrong codes from one network, then 429', async () => {
		const statuses = await repeat(51, () => post('/api/verify', { email: 'alex@example.com', authCode: '000000' }));
		expect(statuses.slice(0, 50).every((status) => status === 400)).toBe(true);
		expect(statuses[50]).toBe(429);
	});
});

describe('general API limit', () => {
	test('the deploy health check is never limited', async () => {
		const statuses = await repeat(700, () => fetch(`${baseUrl}/api/ping`));
		expect(statuses.every((status) => status === 200)).toBe(true);
	});
});
