// ============================================================================
// src/routes/dashboard.routes.js - RUTAS DEL DASHBOARD
// ============================================================================
const express = require('express');
const DashboardController = require('../controllers/dashboard.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(verifyToken);

// Rutas
router.get('/', asyncHandler(DashboardController.getDashboard));
router.get('/beauty-points', asyncHandler(DashboardController.getBeautyPoints));

module.exports = router;