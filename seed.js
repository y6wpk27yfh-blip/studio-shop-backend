// seed.js
const db = require('./db');

const artworks = [
  {
    id: 'ash-ember', title: 'Ash & Ember', medium: 'Oil on canvas, 24x30in',
    type: 'original', original_price_cents: null, original_status: 'available',
    display_bg: 'radial-gradient(ellipse at 30% 20%, #2c2c2c, #050505 70%)',
    sort_order: 1, variants: []
  },
  {
    id: 'quiet-static', title: 'Quiet Static', medium: 'Fine art print, ltd. edition',
    type: 'print', original_price_cents: null, original_status: 'available',
    display_bg: 'linear-gradient(150deg, #1c1c1c, #3a3a3a 60%, #0a0a0a)',
    sort_order: 2,
    variants: [
      { size_id: 'A4', size_label: 'A4', size_dims: '210 x 297 mm', price_cents: 12000, stock: 20, edition_size: 50 },
      { size_id: 'A3', size_label: 'A3', size_dims: '297 x 420 mm', price_cents: 19200, stock: 15, edition_size: 50 },
      { size_id: 'A2', size_label: 'A2', size_dims: '420 x 594 mm', price_cents: 28800, stock: 10, edition_size: 25 },
      { size_id: 'A1', size_label: 'A1', size_dims: '594 x 841 mm', price_cents: 40800, stock: 5,  edition_size: 15 }
    ]
  },
  {
    id: 'faultlines', title: 'Faultlines', medium: 'Mixed media, 18x24in',
    type: 'original', original_price_cents: null, original_status: 'available',
    display_bg: 'radial-gradient(circle at 70% 75%, #303030, #050505 65%)',
    sort_order: 3, variants: []
  },
  {
    id: 'vellum', title: 'Vellum', medium: 'Fine art print, ltd. edition',
    type: 'print', original_price_cents: null, original_status: 'available',
    display_bg: 'linear-gradient(200deg, #050505, #2a2a2a 55%, #111)',
    sort_order: 4,
    variants: [
      { size_id: 'A4', size_label: 'A4', size_dims: '210 x 297 mm', price_cents: 9500,  stock: 20, edition_size: 50 },
      { size_id: 'A3', size_label: 'A3', size_dims: '297 x 420 mm', price_cents: 15200, stock: 15, edition_size: 50 },
      { size_id: 'A2', size_label: 'A2', size_dims: '420 x 594 mm', price_cents: 22800, stock: 10, edition_size: 25 },
      { size_id: 'A1', size_label: 'A1', size_dims: '594 x 841 mm', price_cents: 32300, stock: 5,  edition_size: 15 }
    ]
  },
  {
    id: 'undertow', title: 'Undertow', medium: 'Acrylic on canvas, 30x40in',
    type: 'original', original_price_cents: null, original_status: 'available',
    display_bg: 'radial-gradient(ellipse at 60% 30%, #262626, #000 70%)',
    sort_order: 5, variants: []
  },
  {
    id: 'afterimage', title: 'Afterimage', medium: 'Fine art print, ltd. edition',
    type: 'print', original_price_cents: null, original_status: 'available',
    display_bg: 'linear-gradient(135deg, #111, #333 50%, #050505)',
    sort_order: 6,
    variants: [
      { size_id: 'A4', size_label: 'A4', size_dims: '210 x 297 mm', price_cents: 14000, stock: 20, edition_size: 50 },
      { size_id: 'A3', size_label: 'A3', size_dims: '297 x 420 mm', price_cents: 22400, stock: 15, edition_size: 50 },
      { size_id: 'A2', size_label: 'A2', size_dims: '420 x 594 mm', price_cents: 33600, stock: 10, edition_size: 25 },
      { size_id: 'A1', size_label: 'A1', size_dims: '594 x 841 mm', price_cents: 47600, stock: 5,  edition_size: 15 }
    ]
  }
];

async function seed() {
  for (const a of artworks) {
    const { variants, ...row } = a;
    await db.run(
      `INSERT INTO artworks (id, title, medium, type, original_price_cents, original_status, display_bg, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, medium=excluded.medium, type=excluded.type,
         original_price_cents=excluded.original_price_cents, original_status=excluded.original_status,
         display_bg=excluded.display_bg, sort_order=excluded.sort_order, updated_at=datetime('now')`,
      [row.id, row.title, row.medium, row.type, row.original_price_cents, row.original_status, row.display_bg, row.sort_order]
    );
    for (const v of variants) {
      await db.run(
        `INSERT INTO print_variants (artwork_id, size_id, size_label, size_dims, price_cents, stock, edition_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(artwork_id, size_id) DO UPDATE SET
           size_label=excluded.size_label, size_dims=excluded.size_dims,
           price_cents=excluded.price_cents, stock=excluded.stock, edition_size=excluded.edition_size`,
        [a.id, v.size_id, v.size_label, v.size_dims, v.price_cents, v.stock, v.edition_size]
      );
    }
  }
  return artworks.length;
}

module.exports = { seed };

if (require.main === module) {
  (async () => {
    await db.init();
    const count = await seed();
    console.log(`Seeded ${count} artworks.`);
    process.exit(0);
  })();
}
