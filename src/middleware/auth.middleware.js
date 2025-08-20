// ============================================================================
// 🔐 AUTH MIDDLEWARE CORREGIDO PARA SCHEMA PRISMA
// src/middleware/auth.middleware.js - FIXED VERSION
// ============================================================================

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// ✅ FIXED: Reutilizar instancia de Prisma del app.js si está disponible
let prisma;
try {
  // Intentar obtener la instancia global de Prisma
  prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn']
  });
  
  if (!global.prisma) {
    global.prisma = prisma;
  }
} catch (error) {
  console.error('❌ Error initializing Prisma in auth middleware:', error.message);
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE VERIFICACIÓN DE TOKEN
// ============================================================================
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de acceso requerido', code: 'NO_TOKEN' }
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de acceso requerido', code: 'NO_TOKEN' }
      });
    }

    // ✅ FIXED: Verificar que JWT_SECRET existe
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: { message: 'Error de configuración del servidor', code: 'SERVER_CONFIG_ERROR' }
      });
    }

    // Verificar y decodificar token
    const decoded = jwt.verify(token, jwtSecret);
    
    console.log('🔍 Token decoded:', { 
      userId: decoded.userId, 
      professionalId: decoded.professionalId,
      clinicId: decoded.clinicId,
      role: decoded.role,
      userType: decoded.userType 
    });

    // ✅ FIXED: Verificar que Prisma está disponible
    if (!prisma) {
      console.error('❌ Database not available in auth middleware');
      return res.status(503).json({
        success: false,
        error: { message: 'Servicio de base de datos no disponible', code: 'DATABASE_UNAVAILABLE' }
      });
    }

    // MANEJAR SEGÚN TIPO DE USUARIO EN EL TOKEN
    let userData = null;

    if (decoded.userId) {
      // TOKEN DE PACIENTE/USUARIO
      if (decoded.userId === 'demo-user-123') {
        // Usuario demo
        userData = {
          id: 'demo-user-123',
          userId: 'demo-user-123',
          email: 'demo@bellezaestetica.com',
          firstName: 'Demo',
          lastName: 'User',
          name: 'Demo User',
          role: 'patient',
          userType: 'patient',
          beautyPoints: 1250,
          vipStatus: true,
          loyaltyTier: 'GOLD',
          clinicId: 'madrid-centro',
          isDemo: true
        };
      } else {
        // Usuario real - buscar en BD con schema correcto
        try {
          const user = await Promise.race([
            prisma.user.findUnique({
              where: { id: decoded.userId },
              include: {
                primaryClinic: { // ✅ CORREGIDO: usar primaryClinic según schema
                  select: { id: true, name: true, slug: true, city: true }
                }
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), 5000)
            )
          ]);

          if (!user) {
            return res.status(401).json({
              success: false,
              error: { message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }
            });
          }

          if (!user.isActive) {
            return res.status(401).json({
              success: false,
              error: { message: 'Usuario inactivo', code: 'USER_INACTIVE' }
            });
          }

          userData = {
            id: user.id,
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
            role: 'patient',
            userType: 'patient',
            avatarUrl: user.avatarUrl,
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            totalInvestment: user.totalInvestment,
            sessionsCompleted: user.sessionsCompleted,
            clinic: user.primaryClinic,
            clinicId: user.primaryClinicId
          };
        } catch (dbError) {
          console.error('❌ Error fetching user:', dbError);
          return res.status(500).json({
            success: false,
            error: { message: 'Error interno del servidor', code: 'DATABASE_ERROR' }
          });
        }
      }
    } 
    else if (decoded.professionalId) {
      // TOKEN DE PROFESIONAL
      try {
        const professional = await Promise.race([
          prisma.professional.findUnique({
            where: { id: decoded.professionalId },
            include: {
              clinic: {
                select: { id: true, name: true, slug: true, city: true }
              }
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), 5000)
          )
        ]);

        if (!professional || !professional.isActive) {
          return res.status(401).json({
            success: false,
            error: { message: 'Profesional no encontrado o inactivo', code: 'PROFESSIONAL_NOT_FOUND' }
          });
        }

        userData = {
          id: professional.id,
          professionalId: professional.id,
          email: professional.email,
          firstName: professional.firstName,
          lastName: professional.lastName,
          name: `${professional.firstName} ${professional.lastName}`,
          phone: professional.phone,
          role: professional.role || 'PROFESSIONAL',
          userType: 'professional',
          licenseNumber: professional.licenseNumber,
          specialties: professional.specialties ? 
            (typeof professional.specialties === 'string' ? 
              JSON.parse(professional.specialties) : professional.specialties) : [],
          experience: professional.experience,
          rating: professional.rating,
          avatarUrl: professional.avatarUrl,
          clinic: professional.clinic,
          clinicId: professional.clinicId
        };
      } catch (dbError) {
        console.error('❌ Error fetching professional:', dbError);
        return res.status(500).json({
          success: false,
          error: { message: 'Error interno del servidor', code: 'DATABASE_ERROR' }
        });
      }
    }
    else if (decoded.clinicId && decoded.userType === 'admin') {
      // TOKEN DE ADMINISTRADOR (CLÍNICA)
      try {
        const clinic = await Promise.race([
          prisma.clinic.findUnique({
            where: { id: decoded.clinicId }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), 5000)
          )
        ]);

        if (!clinic || !clinic.isActive) {
          return res.status(401).json({
            success: false,
            error: { message: 'Clínica no encontrada o inactiva', code: 'CLINIC_NOT_FOUND' }
          });
        }

        userData = {
          id: clinic.id,
          clinicId: clinic.id,
          email: clinic.email,
          name: clinic.name,
          phone: clinic.phone,
          role: 'admin',
          userType: 'admin',
          subscriptionPlan: clinic.subscriptionPlan,
          maxProfessionals: clinic.maxProfessionals,
          maxPatients: clinic.maxPatients,
          clinic: {
            id: clinic.id,
            name: clinic.name,
            slug: clinic.slug,
            city: clinic.city
          }
        };
      } catch (dbError) {
        console.error('❌ Error fetching clinic:', dbError);
        return res.status(500).json({
          success: false,
          error: { message: 'Error interno del servidor', code: 'DATABASE_ERROR' }
        });
      }
    }
    else {
      return res.status(401).json({
        success: false,
        error: { message: 'Tipo de token no válido', code: 'INVALID_TOKEN_TYPE' }
      });
    }

    if (!userData) {
      return res.status(401).json({
        success: false,
        error: { message: 'No se pudo verificar el usuario', code: 'USER_VERIFICATION_FAILED' }
      });
    }

    // Adjuntar datos del usuario al request
    req.user = userData;
    
    console.log(`✅ Auth success: ${userData.name} (${userData.userType})`);
    next();

  } catch (error) {
    console.error('❌ Error en verifyToken:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token inválido', code: 'INVALID_TOKEN' }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expirado', code: 'TOKEN_EXPIRED' }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
};

// ============================================================================
// AUTENTICACIÓN OPCIONAL (para endpoints públicos/semi-públicos)
// ============================================================================
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Si no hay token, continuar sin usuario
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    // ✅ FIXED: Verificar JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      req.user = null;
      return next();
    }

    // Intentar verificar token pero no fallar si hay error
    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      // ✅ FIXED: Crear un request simulado para reutilizar verifyToken
      const mockReq = { ...req, headers: { authorization: authHeader } };
      const mockRes = {
        status: () => mockRes,
        json: () => mockRes
      };
      
      await verifyToken(mockReq, mockRes, (error) => {
        if (!error && mockReq.user) {
          req.user = mockReq.user;
        } else {
          req.user = null;
        }
        next();
      });
    } catch (tokenError) {
      req.user = null;
      next();
    }

  } catch (error) {
    // En caso de error, continuar sin usuario
    req.user = null;
    next();
  }
};

// ============================================================================
// VERIFICAR ROLES ESPECÍFICOS - ✅ IMPROVED
// ============================================================================
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Autenticación requerida', code: 'AUTH_REQUIRED' }
      });
    }

    const userRole = req.user.role;
    const allowedRolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // ✅ IMPROVED: Normalizar roles y manejar variaciones
    const normalizedUserRole = userRole.toLowerCase();
    const normalizedAllowedRoles = allowedRolesList.map(role => role.toLowerCase());

    // ✅ ADDED: Manejar role mappings comunes
    const roleMappings = {
      'professional': ['professional', 'doctor', 'medico'],
      'admin': ['admin', 'administrator', 'administrador'],
      'patient': ['patient', 'user', 'cliente']
    };

    let hasPermission = false;

    // Verificar roles directos
    if (normalizedAllowedRoles.includes(normalizedUserRole)) {
      hasPermission = true;
    } else {
      // Verificar mappings de roles
      for (const [baseRole, variants] of Object.entries(roleMappings)) {
        if (normalizedAllowedRoles.includes(baseRole) && variants.includes(normalizedUserRole)) {
          hasPermission = true;
          break;
        }
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: { 
          message: 'Permisos insuficientes', 
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRolesList,
          current: userRole
        }
      });
    }

    next();
  };
};

// ============================================================================
// VERIFICAR ACCESO VIP - ✅ FIXED
// ============================================================================
const requireVIP = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Autenticación requerida', code: 'AUTH_REQUIRED' }
      });
    }
    
    // Los admins y profesionales siempre tienen acceso VIP
    const privilegedRoles = ['admin', 'professional', 'doctor', 'medico', 'administrator'];
    if (privilegedRoles.includes(req.user.role.toLowerCase())) {
      return next();
    }
    
    // Para usuarios demo, permitir acceso VIP
    if (req.user.isDemo) {
      return next();
    }
    
    // Verificar estado VIP del usuario
    if (!req.user.vipStatus) {
      // ✅ FIXED: Solo verificar suscripción si Prisma está disponible
      if (!prisma) {
        return res.status(403).json({
          success: false,
          error: { 
            message: 'Acceso VIP requerido (base de datos no disponible)', 
            code: 'VIP_REQUIRED_DB_UNAVAILABLE'
          }
        });
      }

      try {
        // ✅ FIXED: Verificar si existe la tabla vipSubscription
        const activeSubscription = await Promise.race([
          prisma.vipSubscription.findFirst({
            where: {
              userId: req.user.id,
              status: 'ACTIVE',
              currentPeriodEnd: { gte: new Date() }
            }
          }).catch(() => null), // ✅ ADDED: Catch si la tabla no existe
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), 3000)
          )
        ]);

        if (!activeSubscription) {
          return res.status(403).json({
            success: false,
            error: { 
              message: 'Acceso VIP requerido', 
              code: 'VIP_REQUIRED',
              upgradeUrl: '/vip/upgrade'
            }
          });
        }

        // Actualizar estado VIP si se encontró suscripción activa
        try {
          await prisma.user.update({
            where: { id: req.user.id },
            data: { vipStatus: true }
          });
          req.user.vipStatus = true;
        } catch (updateError) {
          console.warn('⚠️ Could not update VIP status:', updateError.message);
          // Continuar con la verificación exitosa aunque no se pueda actualizar
        }

      } catch (dbError) {
        console.error('❌ Error checking VIP status:', dbError);
        return res.status(403).json({
          success: false,
          error: { 
            message: 'Acceso VIP requerido (error de verificación)', 
            code: 'VIP_REQUIRED'
          }
        });
      }
    }

    next();
  } catch (error) {
    console.error('❌ Error in requireVIP:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
};

// ============================================================================
// VERIFICAR PERTENENCIA A CLÍNICA - ✅ IMPROVED
// ============================================================================
const requireClinic = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Autenticación requerida', code: 'AUTH_REQUIRED' }
    });
  }

  // ✅ IMPROVED: Verificar múltiples formas de asociación a clínica
  const hasClinicAssociation = req.user.clinicId || 
                              req.user.primaryClinicId || 
                              req.user.isDemo ||
                              req.user.role === 'admin';

  if (!hasClinicAssociation) {
    return res.status(403).json({
      success: false,
      error: { 
        message: 'Usuario debe estar asociado a una clínica', 
        code: 'NO_CLINIC_ASSOCIATION' 
      }
    });
  }

  next();
};

// ============================================================================
// MIDDLEWARE DE VALIDACIÓN DE PARÁMETROS - ✅ NEW
// ============================================================================
const validateClinicId = (req, res, next) => {
  const { clinicId } = req.params;
  
  if (!clinicId || typeof clinicId !== 'string' || clinicId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'ID de clínica inválido', code: 'INVALID_CLINIC_ID' }
    });
  }

  // Verificar formato básico (UUID o slug)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId);
  const isSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clinicId);
  
  if (!isUUID && !isSlug) {
    return res.status(400).json({
      success: false,
      error: { message: 'Formato de ID de clínica inválido', code: 'INVALID_CLINIC_ID_FORMAT' }
    });
  }

  next();
};

// ============================================================================
// MIDDLEWARE COMBINADOS PARA FACILIDAD DE USO
// ============================================================================
const requirePatient = [verifyToken, requireRole(['patient'])];
const requireProfessional = [verifyToken, requireRole(['professional', 'PROFESSIONAL', 'doctor'])];
const requireAdmin = [verifyToken, requireRole(['admin', 'administrator'])];
const requireClinicAccess = [verifyToken, requireClinic];
const requireVIPAccess = [verifyToken, requireVIP];

// ✅ NEW: Middleware específicos para recursos
const requireClinicAdmin = [verifyToken, requireRole(['admin']), requireClinic];
const requireProfessionalOrAdmin = [verifyToken, requireRole(['professional', 'admin', 'doctor'])];

// ============================================================================
// ALIASES PARA COMPATIBILIDAD
// ============================================================================
const authenticateToken = verifyToken;
const authenticateAdmin = [verifyToken, requireRole(['admin'])];

// ============================================================================
// UTILITY FUNCTIONS - ✅ NEW
// ============================================================================
const getUserClinicId = (user) => {
  return user.clinicId || user.primaryClinicId || (user.clinic ? user.clinic.id : null);
};

const hasClinicAccess = (user, targetClinicId) => {
  if (!user || !targetClinicId) return false;
  
  // Admin global tiene acceso a todas las clínicas
  if (user.role === 'admin' && !user.clinicId) return true;
  
  // Usuario debe pertenecer a la clínica específica
  const userClinicId = getUserClinicId(user);
  return userClinicId === targetClinicId;
};

// ============================================================================
// MIDDLEWARE DE ACCESO A CLÍNICA ESPECÍFICA - ✅ NEW
// ============================================================================
const requireSpecificClinicAccess = (req, res, next) => {
  const targetClinicId = req.params.clinicId || req.body.clinicId || req.query.clinicId;
  
  if (!targetClinicId) {
    return res.status(400).json({
      success: false,
      error: { message: 'ID de clínica requerido', code: 'CLINIC_ID_REQUIRED' }
    });
  }

  if (!hasClinicAccess(req.user, targetClinicId)) {
    return res.status(403).json({
      success: false,
      error: { 
        message: 'Sin acceso a esta clínica', 
        code: 'CLINIC_ACCESS_DENIED',
        clinicId: targetClinicId
      }
    });
  }

  next();
};

// ============================================================================
// EXPORTACIONES - ✅ UPDATED
// ============================================================================
module.exports = {
  // Core auth functions
  verifyToken,
  optionalAuth,
  
  // Role-based middleware
  requireRole,
  requireVIP,
  requireClinic,
  
  // Combined middleware
  requirePatient,
  requireProfessional,
  requireAdmin,
  requireClinicAccess,
  requireVIPAccess,
  requireClinicAdmin,
  requireProfessionalOrAdmin,
  
  // Validation middleware
  validateClinicId,
  requireSpecificClinicAccess,
  
  // Utility functions
  getUserClinicId,
  hasClinicAccess,
  
  // Legacy aliases
  authenticateToken,
  authenticateAdmin
};