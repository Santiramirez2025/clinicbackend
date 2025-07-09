// ============================================================================
// src/routes/auth.routes.js - RUTAS COMPLETAS CON ADMIN LOGIN ✅
// ============================================================================
const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/auth.controller');
const { asyncHandler } = require('../utils/asyncHandler');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// ========================================================================
// VALIDACIONES
// ========================================================================

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Contraseña requerida')
];

const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/)
    .withMessage('El apellido solo puede contener letras y espacios'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('El formato del email no es válido')
    .isLength({ max: 100 })
    .withMessage('El email no puede exceder 100 caracteres'),
  
  body('phone')
    .trim()
    .matches(/^[\d\s\-\+\(\)]{8,20}$/)
    .withMessage('El formato del teléfono no es válido')
    .isLength({ min: 8, max: 20 })
    .withMessage('El teléfono debe tener entre 8 y 20 caracteres'),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('La contraseña debe tener entre 6 y 100 caracteres'),
  
  body('notificationPreferences')
    .optional()
    .isObject()
    .withMessage('Las preferencias de notificación deben ser un objeto'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token de recuperación requerido'),
  body('newPassword')
    .isLength({ min: 6, max: 100 })
    .withMessage('La nueva contraseña debe tener entre 6 y 100 caracteres')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual requerida'),
  body('newPassword')
    .isLength({ min: 6, max: 100 })
    .withMessage('Nueva contraseña debe tener entre 6 y 100 caracteres')
];

// ⭐ NUEVA VALIDACIÓN ADMIN LOGIN
const adminLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email de administrador inválido'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Contraseña de administrador requerida')
];

// ========================================================================
// RUTAS PÚBLICAS (sin autenticación)
// ========================================================================

// Login y registro
router.post('/login', loginValidation, asyncHandler(AuthController.login));
router.post('/demo-login', asyncHandler(AuthController.demoLogin));
router.post('/register', registerValidation, asyncHandler(AuthController.register));

// ⭐ NUEVA RUTA ADMIN LOGIN
router.post('/admin-login', adminLoginValidation, asyncHandler(AuthController.adminLogin));

// Forgot Password routes
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(AuthController.forgotPassword));
router.get('/verify-reset-token/:token', asyncHandler(AuthController.verifyResetToken));
router.post('/reset-password', resetPasswordValidation, asyncHandler(AuthController.resetPassword));

// Refresh token
router.post('/refresh-token', asyncHandler(AuthController.refreshToken));

// ========================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ========================================================================

// Logout
router.post('/logout', verifyToken, asyncHandler(AuthController.logout));

// Validar sesión
router.get('/validate-session', verifyToken, asyncHandler(AuthController.validateSession));

// Cambiar contraseña (usuario autenticado)
router.put('/change-password', verifyToken, changePasswordValidation, asyncHandler(AuthController.changePassword));

// ========================================================================
// HEALTH CHECK
// ========================================================================
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes working correctly',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;