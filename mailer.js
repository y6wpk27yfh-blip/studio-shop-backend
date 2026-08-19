const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  if (!process.env.SMTP_HOST) {
    console.warn('⚠️  SMTP_HOST is not set — emails will be logged to the console instead of sent.');
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';

  if (!t) {
    console.log('--- EMAIL (SMTP not configured — not actually sent) ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(text);
    console.log('---------------------------------------------------------');
    return;
  }

  await t.sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail };
