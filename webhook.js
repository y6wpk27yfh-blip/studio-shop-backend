const express = require('express');
const stripe = require('../lib/stripe');
const { db } = require('../db');
const { sendMail } = require('../lib/mailer');

const router = express.Router();

// IMPORTANT: this route needs the *raw* request body to verify the Stripe
// signature, so express.raw() is applied here specifically. server.js
// mounts this router BEFORE the global express.json() middleware.
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const order = db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(session.id);

    db.prepare(`
      UPDATE orders
      SET status = 'paid', customer_email = ?, customer_name = ?, paid_at = datetime('now')
      WHERE stripe_session_id = ?
    `).run(session.customer_details?.email || null, session.customer_details?.name || null, session.id);

    const cart = order ? JSON.parse(order.cart_json) : [];
    const summary = cart.map((i) => `${i.pid} (${i.size}) x${i.qty}`).join('\n');
    const total = `$${(session.amount_total / 100).toFixed(2)}`;

    const studioEmail = process.env.CHECKOUT_EMAIL;
    if (studioEmail) {
      sendMail({
        to: studioEmail,
        subject: 'New paid order — HN Studios',
        text: `A new order was paid.\n\nCustomer: ${session.customer_details?.name} <${session.customer_details?.email}>\n\n${summary}\n\nTotal: ${total}`,
      }).catch((e) => console.error('Failed to send studio notification:', e));
    }

    if (session.customer_details?.email) {
      sendMail({
        to: session.customer_details.email,
        subject: 'Your HN Studios order is confirmed',
        text: `Thanks for your order!\n\n${summary}\n\nTotal: ${total}\n\nWe'll be in touch about shipping.`,
      }).catch((e) => console.error('Failed to send customer confirmation:', e));
    }
  }

  res.json({ received: true });
});

module.exports = router;
