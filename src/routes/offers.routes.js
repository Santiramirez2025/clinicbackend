const express = require('express');
const router = express.Router();

// GET /api/offers - Obtener ofertas activas
router.get('/', async (req, res) => {
  try {
    // Tu lógica de ofertas aquí
    res.json({
      success: true,
      data: [],
      message: 'Offers endpoint ready'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

module.exports = router;