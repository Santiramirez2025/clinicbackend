// ============================================================================
// src/routes/profile.routes.js - ARCHIVO FINAL COMPLETO ✅ PRODUCTION READY
// ============================================================================
const express = require('express');
const { body, validationResult } = require('express-validator');
const ProfileController = require('../controllers/profile.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

console.log('🛣️ Loading profile routes...');

// Helper AsyncHandler (incluido aquí para evitar dependencias)
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ✅ VALIDADOR PERSONALIZADO PARA TELÉFONOS
const validatePhone = (value) => {
  if (!value || value.trim() === '') return true; // ✅ PERMITIR VACÍO
  
  // ✅ LIMPIAR ESPACIOS Y CARACTERES ESPECIALES
  const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
  
  // ✅ CASOS ESPECÍFICOS PARA ESPAÑA
  if (cleanPhone.startsWith('+34') || cleanPhone.startsWith('34')) {
    const spanishNumber = cleanPhone.replace(/^(\+?34)/, '');
    return /^[6789]\d{8}$/.test(spanishNumber);
  }
  
  // ✅ CASOS ESPECÍFICOS PARA ARGENTINA
  if (cleanPhone.startsWith('+54') || cleanPhone.startsWith('54')) {
    const argentineNumber = cleanPhone.replace(/^(\+?54)/, '');
    return /^9?[1-9]\d{9,10}$/.test(argentineNumber);
  }
  
  // ✅ NÚMEROS LOCALES ESPAÑA
  if (/^[6789]\d{8}$/.test(cleanPhone)) return true;
  
  // ✅ NÚMEROS INTERNACIONALES GENÉRICOS
  if (/^\+\d{10,15}$/.test(cleanPhone)) return true;
  
  return false;
};

// ✅ MIDDLEWARE PARA MANEJAR ERRORES DE VALIDACIÓN
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      error: {
        message: 'Datos de entrada inválidos',
        details: errors.array()
      }
    });
  }
  next();
};

// ⚠️ CRÍTICO: Aplicar auth a todas las rutas
router.use(verifyToken);

// ============================================================================
// VALIDACIONES ✅ PRODUCTION READY
// ============================================================================
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras'),
    
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El apellido solo puede contener letras'),
    
  body('phone')
    .optional()
    .custom((value) => {
      if (!validatePhone(value)) {
        throw new Error('Formato de teléfono inválido');
      }
      return true;
    }),
    
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const now = new Date();
        const age = now.getFullYear() - date.getFullYear();
        if (age < 16 || age > 120) {
          throw new Error('La edad debe estar entre 16 y 120 años');
        }
      }
      return true;
    }),
    
  body('skinType')
    .optional()
    .isIn(['OILY', 'DRY', 'MIXED', 'SENSITIVE', 'NORMAL'])
    .withMessage('Tipo de piel inválido'),
    
  body('treatmentPreferences')
    .optional()
    .isArray()
    .withMessage('Las preferencias de tratamiento deben ser un array'),
    
  body('preferredSchedule')
    .optional()
    .isArray()
    .withMessage('El horario preferido debe ser un array'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres'),
    
  handleValidationErrors
];

const updateNotificationsValidation = [
  body('appointments')
    .optional()
    .isBoolean()
    .withMessage('El valor de notificaciones de citas debe ser booleano'),
    
  body('promotions')
    .optional()
    .isBoolean()
    .withMessage('El valor de notificaciones de promociones debe ser booleano'),
    
  body('wellness')
    .optional()
    .isBoolean()
    .withMessage('El valor de notificaciones de bienestar debe ser booleano'),
    
  body('offers')
    .optional()
    .isBoolean()
    .withMessage('El valor de notificaciones de ofertas debe ser booleano'),
    
  handleValidationErrors
];

const inviteFriendValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
    
  body('personalMessage')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El mensaje personal no puede exceder 200 caracteres'),
    
  handleValidationErrors
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
    
  body('newPassword')
    .isLength({ min: 6, max: 100 })
    .withMessage('La nueva contraseña debe tener entre 6 y 100 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
    
  handleValidationErrors
];

// ============================================================================
// RUTAS - ORDEN CRÍTICO: ESPECÍFICAS PRIMERO ✅
// ============================================================================

// GET /api/profile/stats - DEBE IR PRIMERO
router.get('/stats', asyncHandler(ProfileController.getStats));

// GET /api/profile/history
router.get('/history', asyncHandler(ProfileController.getHistory));

// PUT /api/profile/notifications - ✅ CON VALIDACIÓN MEJORADA
router.put('/notifications', updateNotificationsValidation, asyncHandler(ProfileController.updateNotificationPreferences));

// POST /api/profile/invite
router.post('/invite', inviteFriendValidation, asyncHandler(ProfileController.inviteFriend));

// PUT /api/profile/change-password
router.put('/change-password', changePasswordValidation, asyncHandler(ProfileController.changePassword));

// GET /api/profile - GENERAL AL FINAL
router.get('/', asyncHandler(ProfileController.getProfile));

// PUT /api/profile - ACTUALIZAR PERFIL ✅ CON VALIDACIÓN MEJORADA
router.put('/', updateProfileValidation, asyncHandler(ProfileController.updateProfile));

// ============================================================================
// ✅ RUTA DE TESTING PARA VALIDAR TELÉFONOS (SOLO DESARROLLO)
// ============================================================================
if (process.env.NODE_ENV === 'development') {
  router.post('/test-phone', [
    body('phone').custom((value) => {
      console.log('🧪 Testing phone:', value);
      const result = validatePhone(value);
      console.log('🧪 Validation result:', result);
      if (!result) {
        throw new Error('Formato de teléfono inválido');
      }
      return true;
    }),
    handleValidationErrors
  ], (req, res) => {
    res.json({
      success: true,
      message: 'Teléfono válido',
      phone: req.body.phone
    });
  });
}

console.log('✅ Profile routes loaded successfully');

module.exports = router;