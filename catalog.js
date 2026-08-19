// Single source of truth for products, sizes, and pricing.
// The frontend used to hardcode this same data — now it fetches it from
// GET /api/products instead, and the server (never the browser) decides
// what a cart actually costs at checkout time.
//
// EDIT: this is your product list. `price` is the base USD price for the
// smallest print size (A4). Originals use price: null and are handled as
// email inquiries, not checkout items — same as before.

const PRODUCTS = [
  { id: 'ash-ember',    name: 'Ash & Ember',   medium: 'Oil on canvas, 24×30in',       type: 'Original', price: null, num: 'I',   bg: 'radial-gradient(ellipse at 30% 20%, #2c2c2c, #050505 70%)' },
  { id: 'quiet-static', name: 'Quiet Static',  medium: 'Fine art print, ltd. edition', type: 'Print',    price: 120,  num: 'II',  bg: 'linear-gradient(150deg, #1c1c1c, #3a3a3a 60%, #0a0a0a)' },
  { id: 'faultlines',   name: 'Faultlines',    medium: 'Mixed media, 18×24in',         type: 'Original', price: null, num: 'III', bg: 'radial-gradient(circle at 70% 75%, #303030, #050505 65%)' },
  { id: 'vellum',       name: 'Vellum',        medium: 'Fine art print, ltd. edition', type: 'Print',    price: 95,   num: 'IV',  bg: 'linear-gradient(200deg, #050505, #2a2a2a 55%, #111)' },
  { id: 'undertow',     name: 'Undertow',      medium: 'Acrylic on canvas, 30×40in',   type: 'Original', price: null, num: 'V',   bg: 'radial-gradient(ellipse at 60% 30%, #262626, #000 70%)' },
  { id: 'afterimage',   name: 'Afterimage',    medium: 'Fine art print, ltd. edition', type: 'Print',    price: 140,  num: 'VI',  bg: 'linear-gradient(135deg, #111, #333 50%, #050505)' },
];

// EDIT: print sizes — mult is applied to the product's base (A4) price.
const SIZES = [
  { id: 'A4', label: 'A4', dims: '210 × 297 mm', mult: 1 },
  { id: 'A3', label: 'A3', dims: '297 × 420 mm', mult: 1.6 },
  { id: 'A2', label: 'A2', dims: '420 × 594 mm', mult: 2.4 },
  { id: 'A1', label: 'A1', dims: '594 × 841 mm', mult: 3.4 },
];

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

function findSize(id) {
  return SIZES.find((s) => s.id === id) || null;
}

// Returns the price in cents for Stripe. Mirrors the old frontend math
// (Math.round(price * mult) dollars) so prices don't shift for anyone.
function priceForCents(product, sizeId) {
  const size = findSize(sizeId) || SIZES[0];
  if (product.price == null) return null;
  const dollars = Math.round(product.price * size.mult);
  return dollars * 100;
}

module.exports = { PRODUCTS, SIZES, findProduct, findSize, priceForCents };
