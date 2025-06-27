// ============================================================================
// src/routes/profile.routes.js - ARCHIVO FINAL COMPLETO
// ============================================================================
const express = require('express');
const { body } = require('express-validator');
const ProfileController = require('../controllers/profile.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

console.log('🛣️ Loading profile routes...');

// Helper AsyncHandler (incluido aquí para evitar dependencias)
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ⚠️ CRÍTICO: Aplicar auth a todas las rutas
router.use(verifyToken);

// ============================================================================
// VALIDACIONES
// ============================================================================
const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().isMobilePhone('any'),
  body('birthDate').optional().isISO8601(),
  body('skinType').optional().isString()
];

const inviteFriendValidation = [
  body('email').isEmail().normalizeEmail(),
  body('personalMessage').optional().isLength({ max: 200 })
];

const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6, max: 100 })
];

// ============================================================================
// RUTAS - ORDEN CRÍTICO: ESPECÍFICAS PRIMERO
// ============================================================================

// GET /api/profile/stats - DEBE IR PRIMERO
router.get('/stats', asyncHandler(ProfileController.getStats));

// GET /api/profile/history
router.get('/history', asyncHandler(ProfileController.getHistory));

// PUT /api/profile/notifications
router.put('/notifications', asyncHandler(ProfileController.updateNotificationPreferences));

// POST /api/profile/invite
router.post('/invite', inviteFriendValidation, asyncHandler(ProfileController.inviteFriend));

// PUT /api/profile/change-password
router.put('/change-password', changePasswordValidation, asyncHandler(ProfileController.changePassword));

// GET /api/profile - GENERAL AL FINAL
router.get('/', asyncHandler(ProfileController.getProfile));

// PUT /api/profile - ACTUALIZAR PERFIL
router.put('/', updateProfileValidation, asyncHandler(ProfileController.updateProfile));

console.log('✅ Profile routes loaded successfully');

module.exports = router;