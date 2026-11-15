const { rateLimit } = require('express-rate-limit');

// Limits are per IP address, plus per email address on the account routes.
//
// IP limits are generous on purpose: everyone on UCF Wi-Fi can share one public
// IP, so a strict IP limit could lock out a whole classroom during a demo. The
// strict limits are per email address instead, which is what actually stops
// someone guessing one account's password or flooding one inbox.
//
// Counts are kept in memory, so they reset when the API restarts. That's fine
// for a single pm2 process; running several would need a shared store.

const MINUTE = 60 * 1000;

function tooMany(message) {
	return { error: 'TOO_MANY_REQUESTS', message };
}

// Email addresses are stored lowercase, so count "Alex@x.com" and "alex@x.com" together
function emailKey(req) {
	return req.body.email.trim().toLowerCase();
}

// Requests without an email are skipped here; the route rejects them anyway
function hasEmail(req) {
	return typeof req.body?.email === 'string' && req.body.email.trim() !== '';
}

const common = {
	standardHeaders: 'draft-8', // RateLimit headers tell clients how long to wait
	legacyHeaders: false,
};

// Fresh limiters (with their own counts) each time; server.js calls this once
function createRateLimits() {
	return {
		// Backstop for every API route, to stop floods. Normal use is far below this.
		api: rateLimit({
			...common,
			windowMs: MINUTE,
			limit: 600,
			// the deploy health check calls /api/ping
			skip: (req) => req.path === '/ping',
			message: tooMany('Too many requests. Please slow down and try again in a minute.'),
		}),

		// Wrong passwords for one account: stops password guessing
		loginPerEmail: rateLimit({
			...common,
			windowMs: 15 * MINUTE,
			limit: 10,
			skipSuccessfulRequests: true, // only failed logins count
			skip: (req) => !hasEmail(req),
			keyGenerator: emailKey,
			message: tooMany('Too many failed logins for this account. Try again in 15 minutes.'),
		}),

		// Wrong passwords from one network, across any accounts
		loginPerIp: rateLimit({
			...common,
			windowMs: 15 * MINUTE,
			limit: 50,
			skipSuccessfulRequests: true,
			message: tooMany('Too many failed logins. Try again in 15 minutes.'),
		}),

		// Routes that send an email (register, reset code, resend code), per address,
		// so nobody can flood someone's inbox or burn through our email quota
		emailPerAddress: rateLimit({
			...common,
			windowMs: 15 * MINUTE,
			limit: 3,
			skip: (req) => !hasEmail(req),
			keyGenerator: emailKey,
			message: tooMany('Too many emails requested for this address. Try again in 15 minutes.'),
		}),

		// Same routes, per network
		emailPerIp: rateLimit({
			...common,
			windowMs: 60 * MINUTE,
			limit: 60,
			message: tooMany('Too many emails requested. Try again later.'),
		}),

		// Checking 6-digit codes (verify email, finish password reset). Each code
		// also stops working after 5 wrong guesses; this limits trying many accounts
		codeChecksPerIp: rateLimit({
			...common,
			windowMs: 15 * MINUTE,
			limit: 50,
			skipSuccessfulRequests: true,
			message: tooMany('Too many incorrect codes. Try again in 15 minutes.'),
		}),
	};
}

module.exports = { createRateLimits };
