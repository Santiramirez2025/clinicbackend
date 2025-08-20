const express = require('express');
const router = express.Router();

// Placeholder para consentimientos
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Consent system - Coming soon',
    version: '3.0.0'
  });
});

module.exports = router;