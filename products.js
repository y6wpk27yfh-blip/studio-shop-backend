const express = require('express');
const { PRODUCTS, SIZES } = require('../lib/catalog');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ products: PRODUCTS, sizes: SIZES });
});

module.exports = router;
