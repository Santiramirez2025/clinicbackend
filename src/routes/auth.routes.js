// ============================================================================
// auth.routes.js - CORREGIDO SIN VALIDACIONES PROBLEMÁTICAS ✅
// ============================================================================
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

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
// RUTAS DE AUTENTICACIÓN - SIN VALIDACIONES MIDDLEWARE ✅
// ========================================================================

// Demo login
router.post('/demo-login', AuthController.demoLogin);

// ✅ CORREGIDO: Sin middleware de validación
router.post('/patient/login', AuthController.patientLogin);
router.post('/professional/login', AuthController.professionalLogin);
router.post('/admin/login', AuthController.adminLogin);

// Registro
router.post('/register', AuthController.register);

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