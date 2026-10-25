require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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

// confirms the API is up and whether MongoDB is connected
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