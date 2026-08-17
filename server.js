// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { requireAdmin } = require('./adminAuth');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');
const db = require('./db');
const { seed } = require('./seed');

async function start() {
  await db.init();

  // Auto-load the starter catalogue on first boot, so there's no manual
  // "npm run seed" step - the very first time the server runs against an
  // empty database, it fills itself in.
  const { n } = await db.get('SELECT COUNT(*) AS n FROM artworks');
  if (n === 0) {
    const count = await seed();
    console.log(`First run detected - seeded ${count} starter artworks.`);
  }

  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(s => s.trim()) }));
  app.use(express.json());

  // Public API - called by site.html
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);

  // Admin login check (frontend calls this once to validate the password before storing it)
  app.post('/api/admin/login', requireAdmin, (req, res) => res.json({ ok: true }));

  // Admin API - everything else in routes/admin.js, all protected
  app.use('/api/admin', requireAdmin, adminRouter);

  // Admin panel static page - serves admin.html by default at /admin
  app.use('/admin', express.static(path.join(__dirname, 'public'), { index: 'admin.html' }));

  app.get('/', (req, res) => {
    res.send('Studio shop backend is running. Admin panel: /admin — API: /api/products');
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Admin panel:        http://localhost:${PORT}/admin`);
    console.log(`Database:           ${process.env.TURSO_DATABASE_URL || 'file:./data.db (local file - set TURSO_DATABASE_URL for persistent hosting)'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
