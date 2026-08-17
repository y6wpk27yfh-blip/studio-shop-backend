// db.js
require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./data.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined
});

async function init() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS artworks (
      id                    TEXT PRIMARY KEY,
      title                 TEXT NOT NULL,
      medium                TEXT,
      description           TEXT,
      year                  INTEGER,
      type                  TEXT NOT NULL CHECK (type IN ('original','print','both')),
      original_price_cents  INTEGER,
      original_status       TEXT NOT NULL DEFAULT 'available'
                              CHECK (original_status IN ('available','reserved','sold')),
      image_url             TEXT,
      display_bg            TEXT,
      sort_order            INTEGER NOT NULL DEFAULT 0,
      is_published          INTEGER NOT NULL DEFAULT 1,
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS print_variants (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      artwork_id    TEXT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
      size_id       TEXT NOT NULL,
      size_label    TEXT NOT NULL,
      size_dims     TEXT,
      price_cents   INTEGER NOT NULL,
      stock         INTEGER,
      edition_size  INTEGER,
      edition_sold  INTEGER NOT NULL DEFAULT 0,
      UNIQUE(artwork_id, size_id)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','paid','shipped','cancelled')),
      customer_name       TEXT,
      customer_email      TEXT NOT NULL,
      shipping_address    TEXT,
      subtotal_cents      INTEGER NOT NULL,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      artwork_id        TEXT NOT NULL,
      artwork_title     TEXT NOT NULL,
      size_id           TEXT,
      unit_price_cents  INTEGER NOT NULL,
      qty               INTEGER NOT NULL DEFAULT 1
    )
  `);
}

async function all(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows;
}
async function get(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows[0] || null;
}
async function run(sql, args = []) {
  const res = await client.execute({ sql, args });
  return { changes: res.rowsAffected, lastInsertRowid: res.lastInsertRowid ? Number(res.lastInsertRowid) : undefined };
}

module.exports = { client, init, all, get, run };
