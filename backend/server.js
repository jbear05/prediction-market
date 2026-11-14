require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const requireAuth = require('./middleware/requireAuth');
const { createRateLimits } = require('./middleware/rateLimits');
const { closeExpiredQuestions } = require('./services/questions');
const app = express();

// Every request arrives through nginx on this same machine. Trusting the loopback
// address lets Express read the visitor's real IP from nginx's X-Forwarded-For
// header; otherwise every visitor looks like 127.0.0.1 and shares one rate limit.
app.set('trust proxy', 'loopback');

app.use(express.json());

// Browsers may call the API only from these sites. (The website itself is on the
// same domain, and the Flutter app isn't a browser, so neither needs this; it's for
// local frontend development and the SwaggerHub "Try it out" button.)
app.use(
	cors({
		origin: [
			'https://predictionmarketucf.site',
			'https://www.predictionmarketucf.site',
			'http://localhost:5173',
			'https://app.swaggerhub.com',
		],
	})
);

// Rate limits (429 Too Many Requests); the numbers and reasons are in middleware/rateLimits.js
const limits = createRateLimits();
app.use('/api', limits.api);
app.post('/api/login', limits.loginPerIp, limits.loginPerEmail);
app.post('/api/register', limits.emailPerIp, limits.emailPerAddress);
app.post('/api/password/reset', limits.emailPerIp, limits.emailPerAddress);
app.post('/api/verify/resend', limits.emailPerIp, limits.emailPerAddress);
app.post('/api/password/update', limits.codeChecksPerIp);
app.post('/api/verify', limits.codeChecksPerIp);

// Enforce that JWT is checked with middleware
app.use('/api/daily-claim', requireAuth);
app.use('/api/balance', requireAuth);
app.use('/api/wagers', requireAuth);
app.use('/api/questions', requireAuth);
app.use('/api/reports', requireAuth);

// Account management API
app.use('/api/register', require('./API/registerUser.js'));
app.use('/api/login', require('./API/login.js'));
app.use('/api/password', require("./API/resetPassword.js"));
app.use('/api/password', require("./API/updatePassword.js"));
app.use('/api/verify', require("./API/verifyUser.js"));
app.use('/api/verify', require("./API/resendVerification.js"));

// User action API
app.use('/api/daily-claim', require('./API/dailyClaim.js'));
app.use('/api/daily-claim', require('./API/nextClaim.js'));
app.use('/api/balance', require('./API/getBalance.js'));
app.use('/api/wagers', require('./API/getWagers.js'));
app.use('/api/questions', require('./API/placeWager.js'));
app.use('/api/questions', require('./API/reportQuestion.js'));
app.use('/api/questions', require('./API/searchQuestion.js'));
app.use('/api/questions', require('./API/submitQuestion.js'));

// Admin action API
app.use('/api/questions', require('./API/resolveQuestion.js'));
app.use('/api/questions', require('./API/cancelQuestion.js'));
app.use('/api/questions', require('./API/approveQuestion.js'));
app.use('/api/questions', require('./API/rejectQuestion.js'));
app.use('/api/reports', require('./API/searchReport.js'));
app.use('/api/reports', require('./API/resolveReport.js'));

// Confirms the API is up and whether MongoDB is connected
app.get('/api/ping', (req, res) => {
	const connected = mongoose.connection.readyState === 1;
	res.json({ ok: true, db: connected ? 'connected' : 'disconnected' });
});

const PORT = process.env.PORT || 5000;

mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => console.log('MongoDB connected'))
	.catch((err) => {
		// Exit so pm2 restarts the API and tries again, instead of running with no database
		console.error('MongoDB connection error:', err.message);
		process.exit(1);
	});

// Once a minute, mark open questions whose closing time has passed as closed
setInterval(() => {
	if (mongoose.connection.readyState !== 1) return;
	closeExpiredQuestions().catch((err) => console.error('closeExpiredQuestions failed:', err.message));
}, 60 * 1000);

// 127.0.0.1 = only reachable through nginx, never directly from the internet
app.listen(PORT, '127.0.0.1', () => console.log(`API listening on port ${PORT}`));