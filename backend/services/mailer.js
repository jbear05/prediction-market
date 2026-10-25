const nodemailer = require('nodemailer');

// Sends email through Amazon SES's SMTP endpoint. Settings come from .env:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
// If SMTP_HOST is empty (a teammate's laptop without SES keys), emails are
// printed to the terminal instead of sent, so sign-up still works locally.
const smtpConfigured = Boolean(process.env.SMTP_HOST);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465, // 587 = STARTTLS, 465 = TLS from the start
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendMail({ to, subject, text }) {
  if (!smtpConfigured) {
    console.log(`[email not sent: SMTP_HOST is empty] To: ${to} | Subject: ${subject}\n${text}`);
    return { logged: true };
  }
  return transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}

function sendVerificationCode(to, code) {
  return sendMail({
    to,
    subject: `${code} is your Prediction Market verification code`,
    text: `Your verification code is ${code}.\n\nIt expires in 15 minutes. If you didn't sign up, ignore this email.`,
  });
}

function sendPasswordResetCode(to, code) {
  return sendMail({
    to,
    subject: `${code} is your Prediction Market password reset code`,
    text: `Your password reset code is ${code}.\n\nIt expires in 15 minutes. If you didn't ask to reset your password, ignore this email; your password hasn't changed.`,
  });
}

module.exports = { sendMail, sendVerificationCode, sendPasswordResetCode, smtpConfigured };