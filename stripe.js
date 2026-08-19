const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  // Don't crash on boot — but checkout requests will fail loudly until this is set.
  console.warn('⚠️  STRIPE_SECRET_KEY is not set. Add it to .env before testing checkout.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing', {
  apiVersion: '2024-06-20',
});

module.exports = stripe;
