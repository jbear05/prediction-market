// Sends one test email using the SMTP settings in .env.
// Usage (from the backend folder): npm run email:test -- you@example.com
require('dotenv').config({ quiet: true });
const { sendMail, smtpConfigured } = require('../services/mailer');

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run email:test -- you@example.com');
  process.exit(1);
}

sendMail({
  to,
  subject: 'Prediction Market test email',
  text: `If you can read this, SES is working.\nSent from ${process.env.NODE_ENV || 'development'} at ${new Date().toISOString()}.`,
})
  .then((info) => {
    if (smtpConfigured) console.log(`Sent to ${to}. Server said: ${info.response}`);
  })
  .catch((err) => {
    console.error('Send failed:', err.message);
    process.exitCode = 1;
  });