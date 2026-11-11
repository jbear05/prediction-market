require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const requireAuth = require('./middleware/requireAuth');
const app = express();
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

// Admin action API
app.use('/api/questions', require('./API/resolveQuestion.js'));
app.use('/api/questions', require('./API/cancelQuestion.js'));
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
  .catch((err) => console.error('MongoDB connection error:', err.message));

// 127.0.0.1 = only reachable through nginx, never directly from the internet
app.listen(PORT, '127.0.0.1', () => console.log(`API listening on port ${PORT}`));