// ============================================================================
// src/routes/vip.routes.js - RUTAS VIP
// ============================================================================
const express = require('express');
const { body } = require('express-validator');
const VIPController = require('../controllers/vip.controller');
const { verifyToken, requireVIP } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(verifyToken);

// Validaciones
const subscribeValidation = [
  body('planType')
    .optional()
    .isIn(['MONTHLY', 'YEARLY'])
    .withMessage('Tipo de plan inválido'),
  body('paymentMethodId')
    .optional()
    .isString()
    .withMessage('Método de pago inválido')
];

// Rutas públicas (no requieren VIP)
router.get('/benefits', asyncHandler(VIPController.getBenefits));
router.get('/testimonials', asyncHandler(VIPController.getTestimonials));
router.get('/status', asyncHandler(VIPController.getVIPStatus));
router.post('/subscribe', subscribeValidation, asyncHandler(VIPController.subscribe));

// Rutas que requieren VIP
router.get('/offers', requireVIP, asyncHandler(VIPController.getVIPOffers));
router.put('/cancel', asyncHandler(VIPController.cancelSubscription));

module.exports = router;
