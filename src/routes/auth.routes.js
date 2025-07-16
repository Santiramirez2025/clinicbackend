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
// MIDDLEWARE DE DEBUG PARA DESARROLLO
// ========================================================================
if (process.env.NODE_ENV === 'development') {
  router.use((req, res, next) => {
    console.log(`🔐 Auth Route: ${req.method} ${req.originalUrl}`);
    console.log(`📝 Body:`, req.body ? Object.keys(req.body) : 'No body');
    console.log(`🎫 Auth Header:`, req.headers.authorization ? 'Present' : 'Missing');
    console.log(`🌐 Origin:`, req.get('Origin') || 'No origin');
    next();
  });
}

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
    .optional()
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

const adminLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email de administrador inválido'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Contraseña de administrador requerida')
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

const verifyTokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token requerido')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token requerido')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual requerida'),
  body('newPassword')
    .isLength({ min: 6, max: 100 })
    .withMessage('Nueva contraseña debe tener entre 6 y 100 caracteres')
];

const validateEmailValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido')
];

// ========================================================================
// RUTAS PÚBLICAS (sin autenticación)
// ========================================================================

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes working correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    availableEndpoints: {
      public: [
        'POST /api/auth/login',
        'POST /api/auth/demo-login', 
        'POST /api/auth/register',
        'POST /api/auth/admin-login',
        'POST /api/auth/forgot-password',
        'POST /api/auth/verify-reset-token',
        'GET /api/auth/verify-reset-token/:token',
        'POST /api/auth/reset-password',
        'POST /api/auth/refresh',
        'POST /api/auth/validate-email',
        'POST /api/auth/check-availability'
      ],
      protected: [
        'POST /api/auth/logout',
        'GET /api/auth/validate-session',
        'PUT /api/auth/change-password'
      ]
    }
  });
});

// ========================================================================
// AUTENTICACIÓN PRINCIPAL
// ========================================================================

// Login normal
router.post('/login', loginValidation, asyncHandler(AuthController.login));

// Demo login (sin credenciales)
router.post('/demo-login', asyncHandler(AuthController.demoLogin));

// Registro de usuario
router.post('/register', registerValidation, asyncHandler(AuthController.register));

// Admin login (credenciales especiales)
router.post('/admin-login', adminLoginValidation, asyncHandler(AuthController.adminLogin));

// ========================================================================
// RECUPERACIÓN DE CONTRASEÑA
// ========================================================================

// Solicitar recuperación de contraseña
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(AuthController.forgotPassword));

// Verificar token de recuperación (GET - para links en email)
router.get('/verify-reset-token/:token', asyncHandler(AuthController.verifyResetToken));

// Verificar token de recuperación (POST - para apps)
router.post('/verify-reset-token', verifyTokenValidation, asyncHandler(AuthController.verifyResetToken));

// Restablecer contraseña
router.post('/reset-password', resetPasswordValidation, asyncHandler(AuthController.resetPassword));

// ========================================================================
// GESTIÓN DE TOKENS
// ========================================================================

// Renovar token de acceso
router.post('/refresh', refreshTokenValidation, asyncHandler(AuthController.refreshToken));

// Alias para compatibilidad
router.post('/refresh-token', refreshTokenValidation, asyncHandler(AuthController.refreshToken));

// ========================================================================
// UTILIDADES PÚBLICAS
// ========================================================================

// Validar formato de email
router.post('/validate-email', validateEmailValidation, asyncHandler(AuthController.validateEmail));

// Verificar disponibilidad de email
router.post('/check-availability', validateEmailValidation, asyncHandler(AuthController.checkAvailability));

// ========================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ========================================================================

// Cerrar sesión
router.post('/logout', verifyToken, asyncHandler(AuthController.logout));

// Validar sesión actual
router.get('/validate-session', verifyToken, asyncHandler(AuthController.validateSession));

// Cambiar contraseña (usuario autenticado)
router.put('/change-password', verifyToken, changePasswordValidation, asyncHandler(AuthController.changePassword));

// ========================================================================
// MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO PARA AUTH
// ========================================================================
router.use((error, req, res, next) => {
  console.error('❌ Auth Route Error:', error);
  
  // Errores de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Datos de entrada inválidos',
        details: error.details || error.message,
        field: error.field || null
      }
    });
  }
  
  // Errores de autenticación
  if (error.name === 'UnauthorizedError' || error.status === 401) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Credenciales inválidas',
        code: 'UNAUTHORIZED'
      }
    });
  }
  
  // Errores de permisos
  if (error.status === 403) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'No tienes permisos para esta acción',
        code: 'FORBIDDEN'
      }
    });
  }
  
  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    error: {
      message: error.message || 'Error interno del servidor',
      code: error.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
});

module.exports = router;