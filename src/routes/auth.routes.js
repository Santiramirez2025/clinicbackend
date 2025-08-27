// ============================================================================
// 🔐 SINGLE CLINIC AUTH ROUTES - PRODUCTION READY v4.0 ✅
// src/routes/auth.routes.js - OPTIMIZED FOR SINGLE CLINIC
// ============================================================================

const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// ============================================================================
// CONFIGURACIÓN DE LA CLÍNICA ÚNICA
// ============================================================================
const CLINIC_CONFIG = {
  id: 'clinic-1',
  name: process.env.CLINIC_NAME || 'Belleza Estética',
  slug: 'belleza-estetica',
  city: process.env.CLINIC_CITY || 'Madrid',
  address: process.env.CLINIC_ADDRESS || 'Calle Principal 123',
  phone: process.env.CLINIC_PHONE || '+34 900 123 456',
  email: process.env.CLINIC_EMAIL || 'info@bellezaestetica.com',
  timezone: process.env.CLINIC_TIMEZONE || 'Europe/Madrid',
  logoUrl: process.env.CLINIC_LOGO_URL || null,
  websiteUrl: process.env.CLINIC_WEBSITE || null,
  features: {
    onlineBooking: true,
    vipProgram: true,
    payments: true,
    beautyPoints: true,
    notifications: true,
    reviews: true
  },
  businessHours: {
    monday: { open: '09:00', close: '20:00', enabled: true },
    tuesday: { open: '09:00', close: '20:00', enabled: true },
    wednesday: { open: '09:00', close: '20:00', enabled: true },
    thursday: { open: '09:00', close: '20:00', enabled: true },
    friday: { open: '09:00', close: '20:00', enabled: true },
    saturday: { open: '10:00', close: '18:00', enabled: true },
    sunday: { closed: true }
  },
  socialMedia: {
    instagram: process.env.CLINIC_INSTAGRAM || null,
    facebook: process.env.CLINIC_FACEBOOK || null,
    tiktok: process.env.CLINIC_TIKTOK || null
  }
};

// ============================================================================
// HEALTH CHECK MEJORADO
// ============================================================================
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '4.0.0-SINGLE-CLINIC',
    environment: process.env.NODE_ENV || 'development',
    clinic: {
      name: CLINIC_CONFIG.name,
      city: CLINIC_CONFIG.city,
      timezone: CLINIC_CONFIG.timezone
    },
    endpoints: {
      public: [
        'GET /api/auth/health',
        'GET /api/auth/clinic/info',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/professional/login',
        'POST /api/auth/admin/login',
        'POST /api/auth/refresh-token',
        ...(process.env.NODE_ENV !== 'production' ? ['POST /api/auth/demo-login'] : [])
      ],
      protected: [
        'POST /api/auth/logout',
        'GET /api/auth/validate-session',
        'GET /api/auth/me'
      ]
    }
  });
});

// ============================================================================
// INFORMACIÓN DE CLÍNICA - SINGLE CLINIC ✅
// ============================================================================
router.get('/clinic/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: CLINIC_CONFIG,
    message: 'Clinic information retrieved'
  });
});

// ============================================================================
// RUTAS DE AUTENTICACIÓN PÚBLICAS
// ============================================================================

// Registro de usuarios (clientes)
router.post('/register', AuthController.register);

// Login principal para pacientes (alias de patientLogin para compatibilidad)
router.post('/login', AuthController.patientLogin);

// Login específico para pacientes
router.post('/patient/login', AuthController.patientLogin);

// Login para profesionales
router.post('/professional/login', AuthController.professionalLogin);

// Login para administradores
router.post('/admin/login', AuthController.adminLogin);

// Refresh token
router.post('/refresh-token', AuthController.refreshToken);

// Demo login (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  router.post('/demo-login', AuthController.demoLogin);
}

// ============================================================================
// RUTAS PROTEGIDAS
// ============================================================================

// Logout
router.post('/logout', verifyToken, AuthController.logout);

// Validar sesión actual
router.get('/validate-session', verifyToken, AuthController.validateSession);

// Información del usuario actual
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          phone: user.phone,
          role: user.role,
          userType: user.userType,
          ...(user.userType === 'patient' && {
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            hasAllergies: user.hasAllergies,
            hasMedicalConditions: user.hasMedicalConditions
          }),
          ...(user.userType === 'professional' && {
            specialties: user.specialties,
            experience: user.experience,
            rating: user.rating,
            licenseNumber: user.licenseNumber
          })
        },
        clinic: CLINIC_CONFIG,
        userType: user.userType
      },
      message: 'User information retrieved'
    });
    
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error retrieving user information', 
        code: 'USER_INFO_ERROR' 
      }
    });
  }
});

// ============================================================================
// RUTAS DE UTILIDAD
// ============================================================================

// Verificar disponibilidad de email
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email is required', code: 'MISSING_EMAIL' }
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      select: { id: true }
    });

    res.status(200).json({
      success: true,
      data: {
        available: !existingUser,
        email: email.toLowerCase().trim()
      },
      message: existingUser ? 'Email is already registered' : 'Email is available'
    });

  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error checking email availability', 
        code: 'EMAIL_CHECK_ERROR' 
      }
    });
  }
});

// Endpoint para obtener configuración pública
router.get('/config', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      clinic: {
        name: CLINIC_CONFIG.name,
        city: CLINIC_CONFIG.city,
        phone: CLINIC_CONFIG.phone,
        email: CLINIC_CONFIG.email,
        address: CLINIC_CONFIG.address,
        logoUrl: CLINIC_CONFIG.logoUrl,
        websiteUrl: CLINIC_CONFIG.websiteUrl,
        businessHours: CLINIC_CONFIG.businessHours,
        features: CLINIC_CONFIG.features,
        socialMedia: CLINIC_CONFIG.socialMedia
      },
      features: {
        registration: true,
        professionalLogin: true,
        adminLogin: true,
        vipProgram: CLINIC_CONFIG.features.vipProgram,
        beautyPoints: CLINIC_CONFIG.features.beautyPoints,
        onlineBooking: CLINIC_CONFIG.features.onlineBooking
      },
      version: '4.0.0-SINGLE-CLINIC',
      environment: process.env.NODE_ENV || 'development'
    },
    message: 'Public configuration retrieved'
  });
});

// ============================================================================
// ENDPOINTS DE DESARROLLO (SOLO EN NO-PRODUCCIÓN)
// ============================================================================

if (process.env.NODE_ENV !== 'production') {
  
  // Test endpoint para debugging
  router.post('/test-auth', async (req, res) => {
    try {
      console.log('Test auth endpoint called');
      console.log('Body:', JSON.stringify(req.body, null, 2));
      
      const bcrypt = require('bcrypt');
      const jwt = require('jsonwebtoken');
      const { PrismaClient } = require('@prisma/client');
      
      // Test básicos
      const testResults = {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        body: req.body,
        tests: {}
      };

      // Test Prisma connection
      try {
        const prisma = new PrismaClient();
        await prisma.$connect();
        const userCount = await prisma.user.count();
        testResults.tests.prisma = { status: 'OK', userCount };
        await prisma.$disconnect();
      } catch (error) {
        testResults.tests.prisma = { status: 'ERROR', error: error.message };
      }

      // Test bcrypt
      try {
        const testHash = await bcrypt.hash('test123', 10);
        const testVerify = await bcrypt.compare('test123', testHash);
        testResults.tests.bcrypt = { 
          status: 'OK', 
          hashLength: testHash.length, 
          verifyResult: testVerify 
        };
      } catch (error) {
        testResults.tests.bcrypt = { status: 'ERROR', error: error.message };
      }

      // Test JWT
      try {
        const testSecret = process.env.JWT_SECRET || 'test-secret';
        const testToken = jwt.sign({ test: true }, testSecret, { expiresIn: '1h' });
        const decoded = jwt.verify(testToken, testSecret);
        testResults.tests.jwt = { 
          status: 'OK', 
          tokenLength: testToken.length,
          decoded: !!decoded
        };
      } catch (error) {
        testResults.tests.jwt = { status: 'ERROR', error: error.message };
      }

      res.status(200).json({
        success: true,
        message: 'Auth test completed',
        data: testResults
      });
      
    } catch (error) {
      console.error('Test failed:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Test failed',
          details: error.message
        }
      });
    }
  });

  // Endpoint para generar usuario de prueba
  router.post('/create-test-user', async (req, res) => {
    try {
      const { PrismaClient } = require('@prisma/client');
      const bcrypt = require('bcrypt');
      const prisma = new PrismaClient();

      const testEmail = `test-${Date.now()}@test.com`;
      const testPassword = 'Test123456';
      const passwordHash = await bcrypt.hash(testPassword, 10);

      const testUser = await prisma.user.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: testEmail,
          passwordHash,
          beautyPoints: 100,
          loyaltyTier: 'BRONZE',
          vipStatus: false,
          role: 'CLIENT',
          isActive: true,
          privacyAccepted: true,
          termsAccepted: true,
          dataProcessingConsent: true,
          gdprAcceptedAt: new Date()
        }
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: testUser.id,
            email: testUser.email,
            password: testPassword // Only in test mode!
          }
        },
        message: 'Test user created'
      });

    } catch (error) {
      console.error('Error creating test user:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create test user' }
      });
    }
  });
}

// ============================================================================
// MANEJO DE ERRORES GLOBAL
// ============================================================================
router.use((error, req, res, next) => {
  console.error('Auth Route Error:', {
    url: req.url,
    method: req.method,
    error: error.message,
    code: error.code,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  });
  
  // Errores específicos de Prisma
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { 
        message: 'Duplicate entry', 
        code: 'DUPLICATE_ENTRY',
        field: error.meta?.target?.[0] || 'unknown'
      }
    });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { 
        message: 'Record not found', 
        code: 'NOT_FOUND' 
      }
    });
  }
  
  // Errores de conexión a BD
  if (error.code === 'P1001' || error.code === 'P1002') {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database connection error',
        code: 'DATABASE_CONNECTION_ERROR'
      }
    });
  }

  // Errores JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      }
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      }
    });
  }

  // Errores de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: error.message
      }
    });
  }

  // Rate limiting
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: error.retryAfter
      }
    });
  }
  
  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV !== 'production' && { 
        stack: error.stack 
      })
    }
  });
});

module.exports = router;