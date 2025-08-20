const express = require('express');
const router = express.Router();

// Placeholder para sistema de reviews
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Review system - Coming soon',
    version: '3.0.0'
  });
});

module.exports = router;