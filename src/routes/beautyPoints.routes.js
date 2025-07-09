// ============================================================================
// src/routes/beautyPoints.routes.js - RUTAS BEAUTY POINTS ✅
// ============================================================================
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware'); // ← Correcto
const BeautyPointsController = require('../controllers/beautyPoints.controller');

const router = express.Router();

// ============================================================================
// BEAUTY POINTS ROUTES - ✨ SISTEMA DE FIDELIZACIÓN ✅
// ============================================================================

// GET /api/beauty-points - Resumen de puntos
router.get('/', verifyToken, BeautyPointsController.getPointsSummary);

// POST /api/beauty-points/redeem - Canjear recompensa
router.post('/redeem', verifyToken, BeautyPointsController.redeemReward);

// GET /api/beauty-points/history - Historial completo de puntos
router.get('/history', verifyToken, BeautyPointsController.getPointsHistory);

// POST /api/beauty-points/award - Otorgar puntos por cita completada
router.post('/award', verifyToken, BeautyPointsController.awardPoints);

// GET /api/beauty-points/stats - Estadísticas de fidelización
router.get('/stats', verifyToken, BeautyPointsController.getLoyaltyStats);

module.exports = router;