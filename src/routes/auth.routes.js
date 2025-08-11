const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../utils/asyncHandler');
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
// UTILITIES
// ========================================================================
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '24h',
    issuer: 'clinica-estetica',
    audience: 'mobile-app'
  });
  
  const refreshToken = jwt.sign(
    { userId: payload.userId || payload.professionalId || payload.adminId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d', issuer: 'clinica-estetica' }
  );
  
  return { accessToken, refreshToken };
};

// ========================================================================
// RUTAS PÚBLICAS
// ========================================================================

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes working correctly',
    timestamp: new Date().toISOString()
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
// LOGIN DE PACIENTES - CORREGIDO
// ========================================================================
router.post('/patient/login', loginValidation, async (req, res) => {
  try {
    const { email, password, clinicSlug } = req.body;
    
    console.log(`🏃‍♀️ Patient login attempt: ${email} at clinic: ${clinicSlug || 'any'}`);
    
    // BÚSQUEDA CORREGIDA - sin filtro de role restrictivo
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
        // Filtrar por clínica si se proporciona
        ...(clinicSlug && {
          clinic: { slug: clinicSlug }
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
          message: clinicSlug ? 'Usuario no encontrado en esta clínica' : 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Verificar si es paciente (no profesional ni admin)
    if (user.role && ['admin', 'professional'].includes(user.role)) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Acceso denegado. Use el login correspondiente a su rol.',
          code: 'WRONG_USER_TYPE'
        }
      });
    }

    // Verificar contraseña
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: { message: 'Usuario debe completar registro', code: 'INCOMPLETE_REGISTRATION' }
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
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
      role: user.role || 'patient',
      clinicId: user.clinicId,
      userType: 'patient'
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    console.log(`✅ Patient login successful: ${user.email}`);

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
          role: user.role || 'patient',
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
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

// ========================================================================
// LOGIN DE PROFESIONALES
// ========================================================================
router.post('/professional/login', loginValidation, async (req, res) => {
  try {
    const { email, password, clinicSlug } = req.body;
    
    console.log(`👨‍⚕️ Professional login attempt: ${email} at clinic: ${clinicSlug || 'any'}`);
    
    const professional = await prisma.professional.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
        ...(clinicSlug && { clinic: { slug: clinicSlug } })
      },
      include: { clinic: true, specialties: true }
    });

    if (!professional) {
      return res.status(401).json({
        success: false,
        error: {
          message: clinicSlug ? 'Profesional no encontrado en esta clínica' : 'Profesional no encontrado',
          code: 'PROFESSIONAL_NOT_FOUND'
        }
      });
    }

    if (!professional.password || !await bcrypt.compare(password, professional.password)) {
      return res.status(401).json({
        success: false,
        error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
      });
    }

    await prisma.professional.update({
      where: { id: professional.id },
      data: { lastLogin: new Date() }
    });

    const tokenPayload = {
      professionalId: professional.id,
      email: professional.email,
      role: 'professional',
      clinicId: professional.clinicId,
      userType: 'professional'
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

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
          clinic: professional.clinic,
          specialties: professional.specialties
        },
        tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
        userType: 'professional'
      },
      message: 'Login de profesional exitoso'
    });

  } catch (error) {
    console.error('❌ Professional login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

// ========================================================================
// LOGIN DE ADMINISTRADORES
// ========================================================================
router.post('/admin/login', loginValidation, async (req, res) => {
  try {
    const { email, password, clinicSlug } = req.body;
    
    console.log(`👑 Admin login attempt: ${email} at clinic: ${clinicSlug || 'any'}`);
    
    const admin = await prisma.admin.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
        ...(clinicSlug && { clinic: { slug: clinicSlug } })
      },
      include: { clinic: true }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          message: clinicSlug ? 'Administrador no encontrado en esta clínica' : 'Administrador no encontrado',
          code: 'ADMIN_NOT_FOUND'
        }
      });
    }

    if (!admin.password || !await bcrypt.compare(password, admin.password)) {
      return res.status(401).json({
        success: false,
        error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
      });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    const tokenPayload = {
      adminId: admin.id,
      email: admin.email,
      role: 'admin',
      clinicId: admin.clinicId,
      userType: 'admin'
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

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
          clinic: admin.clinic
        },
        tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
        userType: 'admin'
      },
      message: 'Login de administrador exitoso'
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

// ========================================================================
// REGISTRO DE USUARIOS
// ========================================================================
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, clinicSlug } = req.body;
    
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email ya registrado', code: 'EMAIL_EXISTS' }
      });
    }

    // Buscar clínica si se proporciona slug
    let clinicId = null;
    if (clinicSlug) {
      const clinic = await prisma.clinic.findUnique({ where: { slug: clinicSlug } });
      if (!clinic) {
        return res.status(404).json({
          success: false,
          error: { message: 'Clínica no encontrada', code: 'CLINIC_NOT_FOUND' }
        });
      }
      clinicId = clinic.id;
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        clinicId,
        role: 'patient',
        isActive: true,
        registrationDate: new Date(),
        authProvider: 'local'
      },
      include: { clinic: true }
    });

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

    // Generar tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: 'patient',
      clinicId: user.clinicId,
      userType: 'patient'
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          role: 'patient',
          clinic: user.clinic
        },
        tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
        userType: 'patient'
      },
      message: 'Usuario registrado exitosamente'
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

// ========================================================================
// REFRESH TOKEN
// ========================================================================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token requerido', code: 'REFRESH_TOKEN_REQUIRED' }
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Buscar usuario según el tipo
    let userData = null;
    let tokenPayload = {};

    if (decoded.userId) {
      userData = await prisma.user.findUnique({ where: { id: decoded.userId } });
      tokenPayload = {
        userId: userData.id,
        email: userData.email,
        role: userData.role || 'patient',
        clinicId: userData.clinicId,
        userType: 'patient'
      };
    }

    if (!userData || !userData.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'Usuario no válido', code: 'INVALID_USER' }
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

    res.status(200).json({
      success: true,
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: '24h'
        }
      },
      message: 'Token renovado exitosamente'
    });

  } catch (error) {
    console.error('❌ Refresh token error:', error);
    res.status(401).json({
      success: false,
      error: { message: 'Refresh token inválido', code: 'INVALID_REFRESH_TOKEN' }
    });
  }
});

// ========================================================================
// RUTAS PROTEGIDAS
// ========================================================================

// Logout
router.post('/logout', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

// Validar sesión
router.get('/validate-session', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user, authenticated: true },
    message: 'Sesión válida'
  });
});

// Información del usuario actual
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { userId, professionalId, adminId } = req.user;
    
    let userData = null;
    let userType = 'unknown';

    if (userId) {
      userData = await prisma.user.findUnique({
        where: { id: userId },
        include: { clinic: true, userProfile: true }
      });
      userType = 'patient';
    } else if (professionalId) {
      userData = await prisma.professional.findUnique({
        where: { id: professionalId },
        include: { clinic: true, specialties: true }
      });
      userType = 'professional';
    } else if (adminId) {
      userData = await prisma.admin.findUnique({
        where: { id: adminId },
        include: { clinic: true }
      });
      userType = 'admin';
    }

    if (!userData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }
      });
    }

    res.status(200).json({
      success: true,
      data: { user: userData, userType, authenticated: true },
      message: 'Información de usuario obtenida exitosamente'
    });

  } catch (error) {
    console.error('❌ Error getting user info:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

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