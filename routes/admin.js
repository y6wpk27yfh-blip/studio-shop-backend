// routes/admin.js
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/artworks', async (req, res) => {
  try {
    const rows = await db.all(`SELECT * FROM artworks ORDER BY sort_order ASC, created_at ASC`);
    const withVariants = await Promise.all(rows.map(async a => ({
      ...a,
      variants: await db.all(`SELECT * FROM print_variants WHERE artwork_id = ? ORDER BY price_cents ASC`, [a.id])
    })));
    res.json(withVariants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/artworks', async (req, res) => {
  const b = req.body || {};
  if (!b.id || !b.title || !b.type) {
    return res.status(400).json({ error: 'id, title, and type are required.' });
  }
  if (!['original', 'print', 'both'].includes(b.type)) {
    return res.status(400).json({ error: "type must be 'original', 'print', or 'both'." });
  }
  try {
    await db.run(
      `INSERT INTO artworks (id, title, medium, description, year, type, original_price_cents, original_status, image_url, display_bg, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.id, b.title, b.medium || null, b.description || null, b.year || null, b.type,
        b.originalPriceCents ?? null, b.originalStatus || 'available', b.imageUrl || null,
        b.displayBg || 'linear-gradient(150deg, #1c1c1c, #3a3a3a 60%, #0a0a0a)', b.sortOrder ?? 0
      ]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: `An artwork with id "${b.id}" already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/artworks/:id', async (req, res) => {
  try {
    const existing = await db.get(`SELECT id FROM artworks WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const b = req.body || {};
    const fields = {
      title: b.title, medium: b.medium, description: b.description, year: b.year,
      type: b.type, original_price_cents: b.originalPriceCents, original_status: b.originalStatus,
      image_url: b.imageUrl, display_bg: b.displayBg, sort_order: b.sortOrder,
      is_published: b.isPublished === undefined ? undefined : (b.isPublished ? 1 : 0)
    };
    const sets = [];
    const args = [];
    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) { sets.push(`${col} = ?`); args.push(val); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update.' });
    args.push(req.params.id);

    await db.run(`UPDATE artworks SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, args);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/artworks/:id', async (req, res) => {
  try {
    const result = await db.run(`DELETE FROM artworks WHERE id = ?`, [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/artworks/:id/variants', async (req, res) => {
  try {
    const artwork = await db.get(`SELECT id FROM artworks WHERE id = ?`, [req.params.id]);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    const b = req.body || {};
    if (!b.sizeId || !b.sizeLabel || !Number.isInteger(b.priceCents)) {
      return res.status(400).json({ error: 'sizeId, sizeLabel, and priceCents (integer) are required.' });
    }
    await db.run(
      `INSERT INTO print_variants (artwork_id, size_id, size_label, size_dims, price_cents, stock, edition_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, b.sizeId, b.sizeLabel, b.sizeDims || null, b.priceCents, b.stock ?? null, b.editionSize ?? null]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: `That size already exists for this artwork.` });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/variants/:variantId', async (req, res) => {
  try {
    const existing = await db.get(`SELECT id FROM print_variants WHERE id = ?`, [req.params.variantId]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const b = req.body || {};
    const fields = {
      size_label: b.sizeLabel, size_dims: b.sizeDims, price_cents: b.priceCents,
      stock: b.stock, edition_size: b.editionSize, edition_sold: b.editionSold
    };
    const sets = [];
    const args = [];
    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) { sets.push(`${col} = ?`); args.push(val); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update.' });
    args.push(req.params.variantId);

    await db.run(`UPDATE print_variants SET ${sets.join(', ')} WHERE id = ?`, args);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/variants/:variantId', async (req, res) => {
  try {
    const result = await db.run(`DELETE FROM print_variants WHERE id = ?`, [req.params.variantId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await db.all(`SELECT * FROM orders ORDER BY created_at DESC`);
    const withItems = await Promise.all(orders.map(async o => ({
      ...o,
      items: await db.all(`SELECT * FROM order_items WHERE order_id = ?`, [o.id])
    })));
    res.json(withItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'paid', 'shipped', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: "status must be one of pending, paid, shipped, cancelled." });
  }
  try {
    const result = await db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
