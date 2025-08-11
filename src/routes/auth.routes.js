const express = require('express');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// ========================================================================
// VALIDACIONES
// ========================================================================
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 1 }).withMessage('Contraseña requerida'),
  body('clinicSlug').optional().isLength({ min: 1 }).withMessage('Slug de clínica inválido')
];

const registerValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('Nombre entre 2 y 50 caracteres'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Apellido entre 2 y 50 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6, max: 100 }).withMessage('Contraseña entre 6 y 100 caracteres'),
  body('clinicSlug').optional().isLength({ min: 1 }).withMessage('Slug de clínica requerido')
];

// ========================================================================
// RUTAS PÚBLICAS
// ========================================================================

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes working correctly',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/demo-login',
      'POST /api/auth/patient/login',
      'POST /api/auth/professional/login', 
      'POST /api/auth/admin/login',
      'POST /api/auth/register',
      'POST /api/auth/refresh'
    ]
  });
});

// Obtener clínicas activas
router.get('/clinics/active', async (req, res) => {
  try {
    const clinics = await prisma.clinic.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, slug: true, city: true, 
        logoUrl: true, address: true, phone: true, description: true
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: clinics,
      message: `${clinics.length} clínicas activas encontradas`
    });
  } catch (error) {
    console.error('❌ Error fetching clinics:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo clínicas', code: 'CLINIC_FETCH_ERROR' }
    });
  }
});

// ========================================================================
// RUTAS DE AUTENTICACIÓN - USANDO CONTROLADOR
// ========================================================================

// Demo login
router.post('/demo-login', AuthController.demoLogin);

// Login por tipo de usuario
router.post('/patient/login', loginValidation, AuthController.patientLogin);
router.post('/professional/login', loginValidation, AuthController.professionalLogin);
router.post('/admin/login', loginValidation, AuthController.adminLogin);

// Registro
router.post('/register', registerValidation, AuthController.register);

// Refresh token
router.post('/refresh', AuthController.refreshToken);

// ========================================================================
// RUTAS PROTEGIDAS
// ========================================================================

// Logout
router.post('/logout', verifyToken, AuthController.logout);

// Validar sesión
router.get('/validate-session', verifyToken, AuthController.validateSession);

// Información del usuario actual
router.get('/me', verifyToken, AuthController.validateSession);

// ========================================================================
// MANEJO DE ERRORES
// ========================================================================
router.use((error, req, res, next) => {
  console.error('❌ Auth Route Error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { message: 'Datos inválidos', code: 'VALIDATION_ERROR' }
    });
  }
  
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { message: 'Ya existe un registro con estos datos', code: 'DUPLICATE_ENTRY' }
    });
  }
  
  res.status(error.status || 500).json({
    success: false,
    error: {
      message: error.message || 'Error interno del servidor',
      code: error.code || 'INTERNAL_ERROR'
    }
  });
});

module.exports = router;