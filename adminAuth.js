// adminAuth.js
require('dotenv').config();

function requireAdmin(req, res, next) {
  const supplied = req.header('X-Admin-Password');
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || expected === 'change-me-to-something-long-and-random') {
    return res.status(500).json({ error: 'Server misconfigured: set ADMIN_PASSWORD in .env before using the admin panel.' });
  }
  if (!supplied || supplied !== expected) {
    return res.status(401).json({ error: 'Invalid admin password.' });
  }
  next();
}

module.exports = { requireAdmin };
