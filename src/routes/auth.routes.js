// ============================================================================
// src/routes/auth.routes.js - RUTAS COMPLETAS CON ADMIN LOGIN Y GOOGLE LOGIN ✅
// ============================================================================
const express = require('express');
const { body } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const AuthController = require('../controllers/auth.controller');
const { asyncHandler } = require('../utils/asyncHandler');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// Configurar cliente OAuth de Google
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

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

const googleLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('googleId')
    .notEmpty()
    .withMessage('Google ID requerido'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El nombre debe tener entre 1 y 50 caracteres'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El apellido debe tener entre 1 y 50 caracteres'),
  body().custom((value) => {
    if (!value.googleAccessToken && !value.googleIdToken) {
      throw new Error('Se requiere googleAccessToken o googleIdToken');
    }
    return true;
  })
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
        'POST /api/auth/google-login',
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

// ============================================================================
// GOOGLE LOGIN - NUEVA FUNCIONALIDAD
// ============================================================================
router.post('/google-login', googleLoginValidation, async (req, res) => {
  try {
    const {
      googleId,
      email,
      firstName,
      lastName,
      name,
      picture,
      verified_email,
      googleAccessToken,
      googleIdToken,
      authProvider,
      platform
    } = req.body;

    console.log('🔐 Google login attempt for:', email);

    // ✅ 1. VALIDAR TOKEN DE GOOGLE
    let googleUserInfo;
    try {
      // Verificar el ID token con Google
      if (googleIdToken) {
        const ticket = await googleClient.verifyIdToken({
          idToken: googleIdToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        googleUserInfo = ticket.getPayload();
      } else {
        // Verificar access token
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${googleAccessToken}`);
        if (!response.ok) {
          throw new Error('Token de Google inválido');
        }
        googleUserInfo = await response.json();
      }

      // Verificar que el email coincida
      if (googleUserInfo.email !== email) {
        throw new Error('Email no coincide con token de Google');
      }

    } catch (error) {
      console.error('❌ Error validando token de Google:', error);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token de Google inválido',
          code: 'INVALID_GOOGLE_TOKEN'
        }
      });
    }

    // ✅ 2. BUSCAR O CREAR USUARIO
    let user;
    
    try {
      // 2a. Buscar usuario existente por email
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          clinic: true,
        }
      });

      if (user) {
        // Usuario existente - actualizar información de Google
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleId,
            profilePicture: picture,
            authProvider: 'google',
            lastLogin: new Date(),
            isEmailVerified: verified_email || true,
            // Actualizar nombre si no tenía
            firstName: user.firstName || firstName,
            lastName: user.lastName || lastName,
          },
          include: {
            clinic: true,
          }
        });

        console.log('✅ Usuario existente actualizado:', user.email);

      } else {
        // 2b. Crear nuevo usuario
        user = await prisma.user.create({
          data: {
            googleId: googleId,
            email: email.toLowerCase(),
            firstName: firstName || name?.split(' ')[0] || 'Usuario',
            lastName: lastName || name?.split(' ').slice(1).join(' ') || 'Google',
            profilePicture: picture,
            authProvider: 'google',
            isEmailVerified: verified_email || true,
            registrationDate: new Date(),
            lastLogin: new Date(),
            // Campos requeridos
            phone: null, // Se puede actualizar después
            skinType: null,
            role: 'user',
            isActive: true,
          },
          include: {
            clinic: true,
          }
        });

        console.log('✅ Nuevo usuario creado:', user.email);

        // Opcional: Crear perfil inicial
        await prisma.userProfile.create({
          data: {
            userId: user.id,
            beautyPoints: 0,
            totalSessions: 0,
            isVip: false,
            preferences: {
              notifications: true,
              promotions: true,
              reminders: true,
            }
          }
        });
      }

    } catch (dbError) {
      console.error('❌ Error en base de datos:', dbError);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Error interno del servidor',
          code: 'DATABASE_ERROR'
        }
      });
    }

    // ✅ 3. GENERAR TOKENS JWT
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      authProvider: 'google',
      isEmailVerified: user.isEmailVerified,
    };

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'clinica-estetica',
        audience: 'mobile-app'
      }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { 
        expiresIn: '30d',
        issuer: 'clinica-estetica'
      }
    );

    // ✅ 4. PREPARAR RESPUESTA
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        profilePicture: user.profilePicture,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        authProvider: user.authProvider,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin,
        clinic: user.clinic ? {
          id: user.clinic.id,
          name: user.clinic.name,
        } : null,
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: '24h',
      },
      authProvider: 'google',
    };

    // ✅ 5. LOG DE ÉXITO Y RESPUESTA
    console.log(`✅ Google login successful for user: ${user.email} (ID: ${user.id})`);

    res.status(200).json({
      success: true,
      data: responseData,
      message: 'Autenticación con Google exitosa'
    });

  } catch (error) {
    console.error('❌ Error general en Google login:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

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