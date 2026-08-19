const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const store = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'insecure-dev-secret-change-me';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

app.use(express.json());
app.use(cookieParser());

// ---------- tiny stateless auth (no session store needed) ----------
function signToken(expiry) {
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET).update(String(expiry)).digest('hex');
  return `${expiry}.${hmac}`;
}
function verifyToken(token) {
  if (!token) return false;
  const [expiryStr, hmac] = String(token).split('.');
  const expiry = Number(expiryStr);
  if (!expiry || !hmac) return false;
  if (Date.now() > expiry) return false;
  const expected = crypto.createHmac('sha256', ADMIN_SECRET).update(String(expiry)).digest('hex');
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
function requireAdmin(req, res, next) {
  if (verifyToken(req.cookies && req.cookies.admin_token)) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// ---------- public API (used by the live site) ----------
app.get('/api/site', async (req, res) => {
  try {
    const settings = await store.getSettings();
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load site settings' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await store.getProducts();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// ---------- admin auth ----------
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    const expiry = Date.now() + TOKEN_TTL_MS;
    res.cookie('admin_token', signToken(expiry), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TOKEN_TTL_MS,
    });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Wrong password' });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

app.get('/api/admin/check', (req, res) => {
  res.json({ authenticated: verifyToken(req.cookies && req.cookies.admin_token) });
});

// ---------- admin API (protected) ----------
app.get('/api/admin/products', requireAdmin, async (req, res) => {
  res.json(await store.getProducts());
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const p = normalizeProduct(req.body);
    await store.upsertProduct(p);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const p = normalizeProduct({ ...req.body, id: req.params.id });
    await store.upsertProduct(p);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  await store.deleteProduct(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  res.json(await store.getSettings());
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    await store.setSettings(req.body || {});
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  res.json(await store.getOrders());
});

function normalizeProduct(body) {
  const id = String(body.id || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (!id) throw new Error('Product needs an id');
  if (!body.name) throw new Error('Product needs a name');
  const type = body.type === 'Original' ? 'Original' : 'Print';
  const price = type === 'Original' ? null : Number(body.price) || 0;
  return {
    id,
    name: String(body.name),
    medium: String(body.medium || ''),
    type,
    price,
    num: body.num ? String(body.num) : '',
    bg: body.bg || 'linear-gradient(150deg, #1c1c1c, #3a3a3a 60%, #0a0a0a)',
    sort_order: Number(body.sort_order) || 0,
  };
}

// ---------- static files ----------
// Admin panel (its own small app) and the public site.
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

store.init()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
