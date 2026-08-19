require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

const { initDb } = require('./db');
const productsRouter = require('./routes/products');
const checkoutRouter = require('./routes/checkout');
const webhookRouter = require('./routes/webhook');
const contactRouter = require('./routes/contact');
const adminRouter = require('./routes/admin');

initDb();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || true }));

// Stripe's webhook needs the raw, unparsed body to verify its signature,
// so this is mounted BEFORE express.json() below.
app.use('/api/webhook', webhookRouter);

app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/contact', contactRouter);
app.use('/api/admin', adminRouter);

// Admin dashboard (protected inside routes/admin.js at the API level;
// the page itself just calls those endpoints).
app.use('/admin', express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`HN Studios backend running at http://localhost:${PORT}`);
});
