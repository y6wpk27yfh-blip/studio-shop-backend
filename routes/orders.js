// routes/orders.js
const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { customerName, customerEmail, shippingAddress, items } = req.body || {};

  if (!customerEmail || typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid customer email is required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  for (const it of items) {
    if (!it.artworkId || !it.sizeId || !Number.isInteger(it.qty) || it.qty < 1) {
      return res.status(400).json({ error: 'Each item needs artworkId, sizeId, and a positive integer qty.' });
    }
  }

  const tx = await db.client.transaction('write');
  try {
    let subtotal = 0;
    const resolved = [];

    for (const it of items) {
      const variantRes = await tx.execute({
        sql: `SELECT pv.*, a.title FROM print_variants pv
              JOIN artworks a ON a.id = pv.artwork_id
              WHERE pv.artwork_id = ? AND pv.size_id = ?`,
        args: [it.artworkId, it.sizeId]
      });
      const variant = variantRes.rows[0];
      if (!variant) throw new Error(`No such product/size: ${it.artworkId} / ${it.sizeId}`);
      if (variant.stock !== null && variant.stock < it.qty) {
        throw new Error(`Not enough stock for "${variant.title}" (${it.sizeId}). Only ${variant.stock} left.`);
      }
      subtotal += variant.price_cents * it.qty;
      resolved.push({ variant, qty: it.qty });
    }

    const orderRes = await tx.execute({
      sql: `INSERT INTO orders (customer_name, customer_email, shipping_address, subtotal_cents) VALUES (?, ?, ?, ?)`,
      args: [customerName || null, customerEmail, shippingAddress ? JSON.stringify(shippingAddress) : null, subtotal]
    });
    const orderId = Number(orderRes.lastInsertRowid);

    for (const { variant, qty } of resolved) {
      await tx.execute({
        sql: `INSERT INTO order_items (order_id, artwork_id, artwork_title, size_id, unit_price_cents, qty) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [orderId, variant.artwork_id, variant.title, variant.size_id, variant.price_cents, qty]
      });
      if (variant.stock !== null) {
        await tx.execute({
          sql: `UPDATE print_variants SET stock = stock - ?, edition_sold = edition_sold + ? WHERE artwork_id = ? AND size_id = ?`,
          args: [qty, qty, variant.artwork_id, variant.size_id]
        });
      }
    }

    await tx.commit();

    notifyByEmail(orderId, customerEmail, subtotal).catch(() => {});
    res.status(201).json({ orderId, subtotalCents: subtotal });
  } catch (err) {
    await tx.rollback().catch(() => {});
    res.status(409).json({ error: err.message });
  }
});

async function notifyByEmail(orderId, customerEmail, subtotalCents) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  const fd = new URLSearchParams();
  fd.append('_subject', `New order #${orderId} from website`);
  fd.append('_captcha', 'false');
  fd.append('Order ID', String(orderId));
  fd.append('Customer', customerEmail);
  fd.append('Total', '$' + (subtotalCents / 100).toFixed(2));
  await fetch(`https://formsubmit.co/${to}`, { method: 'POST', body: fd });
}

module.exports = router;
