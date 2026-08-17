// routes/products.js
const express = require('express');
const db = require('../db');

const router = express.Router();

async function serializeArtwork(row) {
  const variants = await db.all(
    `SELECT size_id, size_label, size_dims, price_cents, stock, edition_size, edition_sold
     FROM print_variants WHERE artwork_id = ? ORDER BY price_cents ASC`,
    [row.id]
  );
  return {
    id: row.id,
    title: row.title,
    medium: row.medium,
    description: row.description,
    year: row.year,
    type: row.type,
    originalPriceCents: row.original_price_cents,
    originalStatus: row.original_status,
    imageUrl: row.image_url,
    displayBg: row.display_bg,
    variants: variants.map(v => ({
      sizeId: v.size_id,
      label: v.size_label,
      dims: v.size_dims,
      priceCents: v.price_cents,
      inStock: v.stock === null ? true : v.stock > 0,
      stock: v.stock,
      editionSize: v.edition_size,
      editionSold: v.edition_sold
    }))
  };
}

router.get('/', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT * FROM artworks WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC`
    );
    res.json(await Promise.all(rows.map(serializeArtwork)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.get(`SELECT * FROM artworks WHERE id = ? AND is_published = 1`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(await serializeArtwork(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
