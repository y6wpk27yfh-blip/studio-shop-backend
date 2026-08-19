const { createClient } = require('@libsql/client');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    'Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables.\n' +
    'Set these (see README) before starting the server.'
  );
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Default catalogue + site copy — used only to seed a brand-new, empty database.
// After the first run, everything is edited from /admin and lives in the database.
const DEFAULT_PRODUCTS = [
  { id: 'ash-ember', name: 'Ash & Ember', medium: 'Oil on canvas, 24×30in', type: 'Original', price: null, num: 'I', bg: 'radial-gradient(ellipse at 30% 20%, #2c2c2c, #050505 70%)', sort_order: 1 },
  { id: 'quiet-static', name: 'Quiet Static', medium: 'Fine art print, ltd. edition', type: 'Print', price: 120, num: 'II', bg: 'linear-gradient(150deg, #1c1c1c, #3a3a3a 60%, #0a0a0a)', sort_order: 2 },
  { id: 'faultlines', name: 'Faultlines', medium: 'Mixed media, 18×24in', type: 'Original', price: null, num: 'III', bg: 'radial-gradient(circle at 70% 75%, #303030, #050505 65%)', sort_order: 3 },
  { id: 'vellum', name: 'Vellum', medium: 'Fine art print, ltd. edition', type: 'Print', price: 95, num: 'IV', bg: 'linear-gradient(200deg, #050505, #2a2a2a 55%, #111)', sort_order: 4 },
  { id: 'undertow', name: 'Undertow', medium: 'Acrylic on canvas, 30×40in', type: 'Original', price: null, num: 'V', bg: 'radial-gradient(ellipse at 60% 30%, #262626, #000 70%)', sort_order: 5 },
  { id: 'afterimage', name: 'Afterimage', medium: 'Fine art print, ltd. edition', type: 'Print', price: 140, num: 'VI', bg: 'linear-gradient(135deg, #111, #333 50%, #050505)', sort_order: 6 },
];

const DEFAULT_SETTINGS = {
  brand_name: 'HN Studios',
  headline_html: 'HN<br>STUDIOS',
  tagline: 'Original Artworks, Fine Prints & Portfolio',
  contact_email: 'hardiknehere25@gmail.com',
  instagram_url: '#',
  about_html: "<p>Your About text goes here — just send it over and it'll go right in this spot.</p>",
};

async function init() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      medium TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL,
      num TEXT,
      bg TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary TEXT NOT NULL,
      total REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const { rows } = await db.execute('SELECT COUNT(*) as count FROM products');
  const count = Number(rows[0].count);
  if (count === 0) {
    for (const p of DEFAULT_PRODUCTS) {
      await db.execute({
        sql: `INSERT INTO products (id, name, medium, type, price, num, bg, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [p.id, p.name, p.medium, p.type, p.price, p.num, p.bg, p.sort_order],
      });
    }
  }

  const { rows: settingRows } = await db.execute('SELECT COUNT(*) as count FROM settings');
  if (Number(settingRows[0].count) === 0) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: [key, value],
      });
    }
  }
}

async function getProducts() {
  const { rows } = await db.execute('SELECT * FROM products ORDER BY sort_order ASC, name ASC');
  return rows.map(rowToProduct);
}

function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    medium: row.medium,
    type: row.type,
    price: row.price === null ? null : Number(row.price),
    num: row.num,
    bg: row.bg,
    sort_order: Number(row.sort_order),
  };
}

async function upsertProduct(p) {
  await db.execute({
    sql: `INSERT INTO products (id, name, medium, type, price, num, bg, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, medium=excluded.medium, type=excluded.type,
            price=excluded.price, num=excluded.num, bg=excluded.bg, sort_order=excluded.sort_order`,
    args: [p.id, p.name, p.medium, p.type, p.price, p.num || '', p.bg, p.sort_order || 0],
  });
}

async function deleteProduct(id) {
  await db.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] });
}

async function getSettings() {
  const { rows } = await db.execute('SELECT key, value FROM settings');
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

async function setSettings(obj) {
  for (const [key, value] of Object.entries(obj)) {
    await db.execute({
      sql: `INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      args: [key, String(value)],
    });
  }
}

async function addOrder(summary, total) {
  await db.execute({
    sql: 'INSERT INTO orders (summary, total) VALUES (?, ?)',
    args: [summary, total],
  });
}

async function getOrders() {
  const { rows } = await db.execute('SELECT * FROM orders ORDER BY id DESC LIMIT 200');
  return rows;
}

module.exports = {
  db,
  init,
  getProducts,
  upsertProduct,
  deleteProduct,
  getSettings,
  setSettings,
  addOrder,
  getOrders,
};
