const express = require('express');
const { db } = require('../db');
const { sendMail } = require('../lib/mailer');

const router = express.Router();

router.post('/', async (req, res) => {
  const { Name, Phone, Email, Message, _honey } = req.body || {};

  // Honeypot field — bots fill it in, real users never see it. Pretend success.
  if (_honey) return res.json({ ok: true });

  if (!Name || !Email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  db.prepare(`
    INSERT INTO messages (name, phone, email, message) VALUES (?, ?, ?, ?)
  `).run(Name, Phone || null, Email, Message || null);

  const studioEmail = process.env.CHECKOUT_EMAIL;
  if (studioEmail) {
    sendMail({
      to: studioEmail,
      subject: 'New enquiry from website contact form',
      text: `Name: ${Name}\nPhone: ${Phone || '-'}\nEmail: ${Email}\n\nMessage:\n${Message || '-'}`,
    }).catch((e) => console.error('Failed to send contact notification:', e));
  }

  res.json({ ok: true });
});

module.exports = router;
