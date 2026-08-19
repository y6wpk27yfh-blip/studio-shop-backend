const express = require('express');
const stripe = require('../lib/stripe');
const { db } = require('../db');
const { findProduct, findSize, priceForCents } = require('../lib/catalog');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { cart } = req.body || {};
    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    const line_items = [];
    let total_cents = 0;

    for (const item of cart) {
      const product = findProduct(item.pid);
      const size = findSize(item.size);
      const qty = Math.max(1, Math.min(50, parseInt(item.qty, 10) || 1));

      if (!product || product.type !== 'Print' || product.price == null) {
        return res.status(400).json({ error: `"${item.pid}" isn't available for direct checkout — originals are inquiry-only.` });
      }
      if (!size) {
        return res.status(400).json({ error: `Invalid size selected for "${item.pid}".` });
      }

      // Price is always computed here from the server catalog — the amount
      // the browser sends is never trusted.
      const unit_amount = priceForCents(product, size.id);
      total_cents += unit_amount * qty;

      line_items.push({
        quantity: qty,
        price_data: {
          currency: 'usd',
          unit_amount,
          product_data: {
            name: `${product.name} — ${size.label} print`,
            description: `${product.medium} · ${size.dims}`,
          },
        },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${frontendUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/?checkout=cancel`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'IE', 'NZ', 'DE', 'FR', 'ES', 'IT', 'NL'],
      },
    });

    db.prepare(`
      INSERT INTO orders (stripe_session_id, status, cart_json, total_cents)
      VALUES (?, 'pending', ?, ?)
    `).run(session.id, JSON.stringify(cart), total_cents);

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Could not start checkout. Please try again in a moment.' });
  }
});

module.exports = router;
