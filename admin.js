const express = require('express');
const { db } = require('../db');

const router = express.Router();

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASSWORD) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="HN Studios Admin"');
  return res.status(401).send('Authentication required.');
}

router.use(auth);

router.get('/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(orders.map((o) => ({ ...o, cart: JSON.parse(o.cart_json) })));
});

router.get('/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json(messages);
});

module.exports = router;
