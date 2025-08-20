const express = require('express');
const router = express.Router();

// Placeholder para analytics
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics system - Coming soon',
    version: '3.0.0'
  });
});

module.exports = router;