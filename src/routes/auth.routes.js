// ============================================================================
// auth.routes.js - OPTIMIZADO PARA PRODUCCIÓN ✅
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

// Health Check mejorado
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      public: [
        'GET /api/auth/health',
        'GET /api/auth/clinics/active',
        'POST /api/auth/register',
        'POST /api/auth/patient/login',
        'POST /api/auth/professional/login',
        'POST /api/auth/refresh'
      ],
      protected: [
        'POST /api/auth/logout',
        'GET /api/auth/validate-session',
        'GET /api/auth/me'
      ]
    }
  });
});

// ✅ Obtener clínicas activas - OPTIMIZADO
router.get('/clinics/active', async (req, res) => {
  try {
    console.log('📞 GET /auth/clinics/active - Fetching verified clinics');
    
    const clinics = await prisma.clinic.findMany({
      where: { 
        isActive: true,
        isVerified: true
      },
      select: {
        id: true, 
        name: true, 
        slug: true, 
        city: true, 
        postalCode: true,
        logoUrl: true, 
        address: true, 
        phone: true,
        websiteUrl: true,
        subscriptionPlan: true,
        isVerified: true,
        enableOnlineBooking: true,
        enableVipProgram: true,
        enablePayments: true,
        businessHours: true,
        timezone: true,
        _count: {
          select: {
            professionals: { where: { isActive: true } },
            treatments: { where: { isActive: true } },
            users: { where: { isActive: true } }
          }
        }
      },
      orderBy: [
        { subscriptionPlan: 'desc' }, // Premium primero
        { isVerified: 'desc' }, // Verificadas primero
        { name: 'asc' }
      ],
      take: 50 // Límite para performance
    });

    // Transformar datos para respuesta
    const transformedClinics = clinics.map(clinic => ({
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      city: clinic.city,
      postalCode: clinic.postalCode,
      address: clinic.address,
      phone: clinic.phone,
      logoUrl: clinic.logoUrl,
      websiteUrl: clinic.websiteUrl,
      subscriptionPlan: clinic.subscriptionPlan,
      isVerified: clinic.isVerified,
      features: {
        onlineBooking: clinic.enableOnlineBooking,
        vipProgram: clinic.enableVipProgram,
        payments: clinic.enablePayments
      },
      businessHours: clinic.businessHours ? 
        (typeof clinic.businessHours === 'string' ? 
          JSON.parse(clinic.businessHours) : 
          clinic.businessHours) : null,
      timezone: clinic.timezone,
      stats: {
        professionals: clinic._count.professionals,
        treatments: clinic._count.treatments,
        patients: clinic._count.users
      }
    }));

    console.log(`✅ Retrieved ${transformedClinics.length} verified clinics`);

    res.status(200).json({
      success: true,
      data: transformedClinics,
      total: transformedClinics.length,
      message: `${transformedClinics.length} clínicas activas encontradas`
    });
    
  } catch (error) {
    console.error('❌ Error fetching clinics:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error obteniendo clínicas', 
        code: 'CLINIC_FETCH_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { details: error.message })
      }
    });
  }
});

// ✅ Obtener información de clínica específica por slug
router.get('/clinics/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    console.log(`📞 GET /auth/clinics/${slug} - Fetching clinic details`);
    
    const clinic = await prisma.clinic.findFirst({
      where: { 
        slug,
        isActive: true,
        isVerified: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        postalCode: true,
        address: true,
        phone: true,
        logoUrl: true,
        websiteUrl: true,
        subscriptionPlan: true,
        businessHours: true,
        timezone: true,
        enableOnlineBooking: true,
        enableVipProgram: true,
        enablePayments: true,
        _count: {
          select: {
            professionals: { where: { isActive: true } },
            treatments: { where: { isActive: true } }
          }
        }
      }
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: { 
          message: 'Clínica no encontrada', 
          code: 'CLINIC_NOT_FOUND' 
        }
      });
    }

    const transformedClinic = {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      city: clinic.city,
      postalCode: clinic.postalCode,
      address: clinic.address,
      phone: clinic.phone,
      logoUrl: clinic.logoUrl,
      websiteUrl: clinic.websiteUrl,
      subscriptionPlan: clinic.subscriptionPlan,
      features: {
        onlineBooking: clinic.enableOnlineBooking,
        vipProgram: clinic.enableVipProgram,
        payments: clinic.enablePayments
      },
      businessHours: clinic.businessHours ? 
        (typeof clinic.businessHours === 'string' ? 
          JSON.parse(clinic.businessHours) : 
          clinic.businessHours) : null,
      timezone: clinic.timezone,
      stats: {
        professionals: clinic._count.professionals,
        treatments: clinic._count.treatments
      }
    };

    res.status(200).json({
      success: true,
      data: transformedClinic,
      message: 'Clínica encontrada'
    });
    
  } catch (error) {
    console.error('❌ Error fetching clinic:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error obteniendo información de la clínica', 
        code: 'CLINIC_FETCH_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { details: error.message })
      }
    });
  }
});

// ========================================================================
// RUTAS DE AUTENTICACIÓN
// ========================================================================

// ✅ Registro de usuarios
router.post('/register', AuthController.register);

// ✅ Login de pacientes
router.post('/patient/login', AuthController.patientLogin);

// ✅ Login de profesionales
router.post('/professional/login', AuthController.professionalLogin);

// ✅ Login de administradores
router.post('/admin/login', AuthController.adminLogin);

// ✅ Demo login (para testing)
router.post('/demo-login', AuthController.demoLogin);

// ✅ Refresh token
router.post('/refresh', AuthController.refreshToken);

// ========================================================================
// RUTAS PROTEGIDAS
// ========================================================================

// ✅ Logout
router.post('/logout', verifyToken, AuthController.logout);

// ✅ Validar sesión actual
router.get('/validate-session', verifyToken, AuthController.validateSession);

// ✅ Información del usuario actual
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { userId, professionalId, clinicId, userType } = req.user;
    
    let userData = null;
    
    if (userType === 'patient' && userId) {
      userData = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          beautyPoints: true,
          loyaltyTier: true,
          vipStatus: true,
          hasAllergies: true,
          hasMedicalConditions: true,
          isActive: true,
          primaryClinic: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true
            }
          }
        }
      });
    } else if (userType === 'professional' && professionalId) {
      userData = await prisma.professional.findUnique({
        where: { id: professionalId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          specialties: true,
          isActive: true,
          clinic: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true
            }
          }
        }
      });
    }
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: userData,
        userType
      },
      message: 'Información del usuario obtenida'
    });
    
  } catch (error) {
    console.error('❌ Error getting user info:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo información del usuario', code: 'USER_INFO_ERROR' }
    });
  }
});

// ========================================================================
// ENDPOINTS DE DESARROLLO (SOLO EN NO-PRODUCCIÓN)
// ========================================================================

if (process.env.NODE_ENV !== 'production') {
  // Test endpoint para debugging
  router.post('/test-register', async (req, res) => {
    try {
      console.log('🧪 TEST REGISTER ENDPOINT');
      console.log('📥 Body:', JSON.stringify(req.body, null, 2));
      
      // Test básicos
      const bcrypt = require('bcrypt');
      const jwt = require('jsonwebtoken');
      
      // Test Prisma
      await prisma.$connect();
      const clinicCount = await prisma.clinic.count();
      
      // Test bcrypt
      const testHash = await bcrypt.hash('test123', 12);
      
      // Test JWT
      const testToken = jwt.sign({ test: true }, process.env.JWT_SECRET || 'test-secret');
      
      res.status(200).json({
        success: true,
        message: 'All tests passed',
        data: {
          environment: process.env.NODE_ENV,
          importsOK: true,
          prismaOK: true,
          bcryptOK: true,
          jwtOK: true,
          clinicCount,
          testHashLength: testHash.length,
          testTokenLength: testToken.length,
          body: req.body
        }
      });
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Test failed',
          details: error.message
        }
      });
    }
  });
}

// ========================================================================
// MANEJO DE ERRORES GLOBAL
// ========================================================================
router.use((error, req, res, next) => {
  console.error('❌ Auth Route Error:', {
    url: req.url,
    method: req.method,
    error: error.message,
    code: error.code
  });
  
  // Error de duplicado de Prisma
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { 
        message: 'Ya existe un registro con estos datos', 
        code: 'DUPLICATE_ENTRY',
        field: error.meta?.target?.[0] || 'unknown'
      }
    });
  }
  
  // Error de registro no encontrado
  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { 
        message: 'Registro no encontrado', 
        code: 'NOT_FOUND' 
      }
    });
  }
  
  // Error de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Datos inválidos', 
        code: 'VALIDATION_ERROR',
        details: error.message
      }
    });
  }

  // Error de conexión de base de datos
  if (error.code === 'P1001' || error.code === 'P1002') {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Error de conexión a la base de datos',
        code: 'DATABASE_CONNECTION_ERROR'
      }
    });
  }

  // Error de token JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      }
    });
  }

  // Error de token expirado
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      }
    });
  }
  
  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    error: {
      message: error.message || 'Error interno del servidor',
      code: error.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { 
        stack: error.stack 
      })
    }
  });
});

module.exports = router;