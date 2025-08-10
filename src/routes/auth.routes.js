// ============================================================================
// src/routes/auth.routes.js - RUTAS COMPLETAS CON MULTI-CLÍNICA Y TODOS LOS TIPOS DE LOGIN ✅
// ============================================================================
const express = require('express');
const { body } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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
    .withMessage('Contraseña requerida'),
  body('clinicSlug')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Slug de clínica inválido')
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
  
  body('clinicSlug')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Slug de clínica requerido'),
  
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
    .withMessage('Contraseña de administrador requerida'),
  body('clinicSlug')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Slug de clínica inválido')
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
        'POST /api/auth/patient/login',
        'POST /api/auth/professional/login', 
        'POST /api/auth/admin/login',
        'POST /api/auth/demo-login', 
        'POST /api/auth/register',
        'POST /api/auth/google-login',
        'POST /api/auth/forgot-password',
        'POST /api/auth/verify-reset-token',
        'GET /api/auth/verify-reset-token/:token',
        'POST /api/auth/reset-password',
        'POST /api/auth/refresh',
        'POST /api/auth/validate-email',
        'POST /api/auth/check-availability',
        'GET /api/auth/clinics/active'
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
// ENDPOINT PARA OBTENER CLÍNICAS ACTIVAS
// ========================================================================
router.get('/clinics/active', async (req, res) => {
  try {
    const clinics = await prisma.clinic.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        logoUrl: true,
        address: true,
        phone: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`✅ Found ${clinics.length} active clinics`);

    res.status(200).json({
      success: true,
      data: clinics,
      message: `${clinics.length} clínicas activas encontradas`
    });

  } catch (error) {
    console.error('❌ Error fetching active clinics:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error obteniendo clínicas',
        code: 'CLINIC_FETCH_ERROR'
      }
    });
  }
});

// ========================================================================
// AUTENTICACIÓN PRINCIPAL
// ========================================================================

// Login general (mantener para compatibilidad)
router.post('/login', loginValidation, asyncHandler(AuthController.login));

// Demo login (sin credenciales)
router.post('/demo-login', asyncHandler(AuthController.demoLogin));

// Registro de usuario
router.post('/register', registerValidation, asyncHandler(AuthController.register));

// ========================================================================
// AUTENTICACIÓN POR TIPO DE USUARIO Y CLÍNICA
// ========================================================================

// Patient login con soporte para multi-clínica
router.post('/patient/login', loginValidation, async (req, res) => {
  try {
    const { email, password, clinicSlug } = req.body;
    
    console.log(`🏃‍♀️ Patient login attempt for: ${email} at clinic: ${clinicSlug || 'any'}`);
    
    // Buscar usuario paciente
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        role: 'user', // Los pacientes tienen role 'user'
        isActive: true,
        // Si se proporciona clinicSlug, filtrar por clínica
        ...(clinicSlug && {
          clinic: {
            slug: clinicSlug
          }
        })
      },
      include: {
        clinic: true,
        userProfile: true,
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: clinicSlug ? 
            'Usuario no encontrado en esta clínica' : 
            'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Verificar contraseña
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Usuario debe completar registro',
          code: 'INCOMPLETE_REGISTRATION'
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generar tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      userType: 'patient'
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

    console.log(`✅ Patient login successful for: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          registrationDate: user.registrationDate,
          lastLogin: user.lastLogin,
          clinic: user.clinic,
          profile: user.userProfile
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '24h'
        },
        userType: 'patient'
      },
      message: 'Login de paciente exitoso'
    });

  } catch (error) {
    console.error('❌ Patient login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// Professional login con soporte para multi-clínica
router.post('/professional/login', loginValidation, async (req, res) => {
  try {
    const { email, password, clinicSlug } = req.body;
    
    console.log(`👨‍⚕️ Professional login attempt for: ${email} at clinic: ${clinicSlug || 'any'}`);
    
    // Buscar profesional
    const professional = await prisma.professional.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
        // Si se proporciona clinicSlug, filtrar por clínica
        ...(clinicSlug && {
          clinic: {
            slug: clinicSlug
          }
        })
      },
      include: {
        clinic: true,
        specialties: true,
        schedule: true
      }
    });

    if (!professional) {
      return res.status(401).json({
        success: false,
        error: {
          message: clinicSlug ? 
            'Profesional no encontrado en esta clínica' : 
            'Profesional no encontrado',
          code: 'PROFESSIONAL_NOT_FOUND'
        }
      });
    }

    // Verificar contraseña
    if (!professional.password) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Profesional debe completar registro',
          code: 'INCOMPLETE_REGISTRATION'
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, professional.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Actualizar último login
    await prisma.professional.update({
      where: { id: professional.id },
      data: { lastLogin: new Date() }
    });

    // Generar tokens
    const tokenPayload = {
      professionalId: professional.id,
      email: professional.email,
      role: 'professional',
      clinicId: professional.clinicId,
      userType: 'professional'
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
      { professionalId: professional.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { 
        expiresIn: '30d',
        issuer: 'clinica-estetica'
      }
    );

    console.log(`✅ Professional login successful for: ${professional.email}`);

    res.status(200).json({
      success: true,
      data: {
        professional: {
          id: professional.id,
          email: professional.email,
          firstName: professional.firstName,
          lastName: professional.lastName,
          name: `${professional.firstName} ${professional.lastName}`,
          phone: professional.phone,
          role: 'professional',
          profilePicture: professional.profilePicture,
          license: professional.license,
          specialization: professional.specialization,
          registrationDate: professional.registrationDate,
          lastLogin: professional.lastLogin,
          clinic: professional.clinic,
          specialties: professional.specialties,
          schedule: professional.schedule
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '24h'
        },
        userType: 'professional'
      },
      message: 'Login de profesional exitoso'
    });

  } catch (error) {
    console.error('❌ Professional login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// Admin login actualizado con soporte para multi-clínica
router.post('/admin/login', adminLoginValidation, async (req, res) => {
  try {
    const { email, password, clinicSlug } = req.body;
    
    console.log(`👑 Admin login attempt for: ${email} at clinic: ${clinicSlug || 'any'}`);
    
    // Buscar administrador
    const admin = await prisma.admin.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
        // Si se proporciona clinicSlug, filtrar por clínica
        ...(clinicSlug && {
          clinic: {
            slug: clinicSlug
          }
        })
      },
      include: {
        clinic: true,
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          message: clinicSlug ? 
            'Administrador no encontrado en esta clínica' : 
            'Administrador no encontrado',
          code: 'ADMIN_NOT_FOUND'
        }
      });
    }

    // Verificar contraseña
    if (!admin.password) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Administrador debe completar registro',
          code: 'INCOMPLETE_REGISTRATION'
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Actualizar último login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    // Generar tokens
    const tokenPayload = {
      adminId: admin.id,
      email: admin.email,
      role: 'admin',
      clinicId: admin.clinicId,
      userType: 'admin'
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
      { adminId: admin.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { 
        expiresIn: '30d',
        issuer: 'clinica-estetica'
      }
    );

    console.log(`✅ Admin login successful for: ${admin.email}`);

    res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          name: admin.name || `${admin.firstName} ${admin.lastName}`,
          phone: admin.phone,
          role: 'admin',
          profilePicture: admin.profilePicture,
          permissions: admin.permissions,
          registrationDate: admin.registrationDate,
          lastLogin: admin.lastLogin,
          clinic: admin.clinic
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '24h'
        },
        userType: 'admin'
      },
      message: 'Login de administrador exitoso'
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// Mantener admin-login para compatibilidad
router.post('/admin-login', adminLoginValidation, async (req, res) => {
  // Redirigir a /admin/login
  req.url = '/admin/login';
  return router.handle(req, res);
});

// ============================================================================
// GOOGLE LOGIN - FUNCIONALIDAD COMPLETA
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
      platform,
      clinicSlug
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
    let clinic = null;
    
    // Si se especifica clinicSlug, buscar la clínica
    if (clinicSlug) {
      clinic = await prisma.clinic.findUnique({
        where: { slug: clinicSlug }
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
    }
    
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
            // Asociar a clínica si se especificó
            ...(clinic && !user.clinicId && { clinicId: clinic.id })
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
            // Asociar a clínica si se especificó
            clinicId: clinic?.id || null,
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

        // Crear perfil inicial
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
      clinicId: user.clinicId,
      authProvider: 'google',
      isEmailVerified: user.isEmailVerified,
      userType: 'patient'
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
          slug: user.clinic.slug,
          city: user.clinic.city
        } : null,
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: '24h',
      },
      authProvider: 'google',
      userType: 'patient'
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
// ENDPOINTS ADICIONALES PARA COMPATIBILIDAD Y DESARROLLO
// ========================================================================

// Obtener información del usuario actual
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { userId, professionalId, adminId } = req.user;
    
    let userData = null;
    let userType = 'unknown';

    if (userId) {
      // Es un paciente/usuario
      userData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          clinic: true,
          userProfile: true
        }
      });
      userType = 'patient';
    } else if (professionalId) {
      // Es un profesional
      userData = await prisma.professional.findUnique({
        where: { id: professionalId },
        include: {
          clinic: true,
          specialties: true
        }
      });
      userType = 'professional';
    } else if (adminId) {
      // Es un administrador
      userData = await prisma.admin.findUnique({
        where: { id: adminId },
        include: {
          clinic: true
        }
      });
      userType = 'admin';
    }

    if (!userData) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: userData,
        userType,
        authenticated: true
      },
      message: 'Información de usuario obtenida exitosamente'
    });

  } catch (error) {
    console.error('❌ Error getting user info:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// Estadísticas de autenticación (para desarrollo/debug)
router.get('/stats', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Endpoint solo disponible en desarrollo',
          code: 'FORBIDDEN'
        }
      });
    }

    const stats = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.professional.count({ where: { isActive: true } }),
      prisma.admin.count({ where: { isActive: true } }),
      prisma.clinic.count({ where: { isActive: true } }),
      prisma.user.count({ where: { authProvider: 'google' } }),
      prisma.user.count({ where: { isEmailVerified: true } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        patients: stats[0],
        professionals: stats[1],
        admins: stats[2],
        clinics: stats[3],
        googleUsers: stats[4],
        verifiedEmails: stats[5],
        totalUsers: stats[0] + stats[1] + stats[2]
      },
      message: 'Estadísticas de autenticación'
    });

  } catch (error) {
    console.error('❌ Error getting auth stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error obteniendo estadísticas',
        code: 'STATS_ERROR'
      }
    });
  }
});

// Endpoint para obtener clínicas por ciudad
router.get('/clinics/by-city/:city', async (req, res) => {
  try {
    const { city } = req.params;
    
    const clinics = await prisma.clinic.findMany({
      where: {
        city: {
          contains: city,
          mode: 'insensitive'
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        logoUrl: true,
        address: true,
        phone: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: clinics,
      message: `${clinics.length} clínicas encontradas en ${city}`
    });

  } catch (error) {
    console.error('❌ Error fetching clinics by city:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error obteniendo clínicas por ciudad',
        code: 'CLINIC_CITY_ERROR'
      }
    });
  }
});

// Endpoint para validar slug de clínica
router.get('/clinics/validate-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const clinic = await prisma.clinic.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        isActive: true
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

    if (!clinic.isActive) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Clínica no activa',
          code: 'CLINIC_INACTIVE'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: clinic,
      message: 'Slug de clínica válido'
    });

  } catch (error) {
    console.error('❌ Error validating clinic slug:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error validando slug de clínica',
        code: 'SLUG_VALIDATION_ERROR'
      }
    });
  }
});

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
        field: error.field || null,
        code: 'VALIDATION_ERROR'
      }
    });
  }
  
  // Errores de express-validator
  if (error.array && typeof error.array === 'function') {
    const validationErrors = error.array();
    return res.status(400).json({
      success: false,
      error: {
        message: 'Errores de validación',
        details: validationErrors,
        code: 'VALIDATION_ERROR'
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

  // Errores de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      }
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      }
    });
  }

  // Errores de Prisma
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        message: 'Ya existe un registro con estos datos',
        code: 'DUPLICATE_ENTRY'
      }
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Registro no encontrado',
        code: 'RECORD_NOT_FOUND'
      }
    });
  }

  // Errores de conexión a base de datos
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Error de conexión a la base de datos',
        code: 'DATABASE_CONNECTION_ERROR'
      }
    });
  }
  
  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    error: {
      message: error.message || 'Error interno del servidor',
      code: error.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error
      })
    }
  });
});

// ========================================================================
// MANEJADOR DE RUTAS NO ENCONTRADAS
// ========================================================================
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Ruta de autenticación no encontrada: ${req.method} ${req.originalUrl}`,
      code: 'ROUTE_NOT_FOUND',
      availableRoutes: [
        'POST /api/auth/login',
        'POST /api/auth/patient/login',
        'POST /api/auth/professional/login',
        'POST /api/auth/admin/login',
        'POST /api/auth/register',
        'POST /api/auth/google-login',
        'POST /api/auth/forgot-password',
        'POST /api/auth/reset-password',
        'POST /api/auth/refresh',
        'GET /api/auth/clinics/active',
        'GET /api/auth/health'
      ]
    }
  });
});

module.exports = router;