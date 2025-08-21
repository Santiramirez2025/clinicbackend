// ============================================================================
// 🔐 AUTH MIDDLEWARE OPTIMIZADO PARA RAILWAY PRODUCTION ✅
// src/middleware/auth.middleware.js - OPTIMIZED VERSION
// ============================================================================

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// ✅ OPTIMIZADO: Singleton de Prisma para Railway
let prisma;
try {
  if (global.prisma) {
    prisma = global.prisma;
  } else {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    // Cache en Railway
    global.prisma = prisma;
  }
} catch (error) {
  console.error('❌ Error initializing Prisma in auth middleware:', error.message);
}

// ✅ CACHE DE USUARIOS PARA PERFORMANCE EN RAILWAY
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const getCachedUser = (userId, userType) => {
  const key = `${userType}:${userId}`;
  const cached = userCache.get(key);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`🚀 Cache hit for ${key}`);
    return cached.data;
  }
  
  return null;
};

const setCachedUser = (userId, userType, userData) => {
  const key = `${userType}:${userId}`;
  userCache.set(key, {
    data: userData,
    timestamp: Date.now()
  });
  
  // Limpiar cache viejo para evitar memory leaks
  if (userCache.size > 100) {
    const oldestKey = userCache.keys().next().value;
    userCache.delete(oldestKey);
  }
};

// ============================================================================
// FUNCIÓN PRINCIPAL DE VERIFICACIÓN DE TOKEN - OPTIMIZADA
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

    // ✅ OPTIMIZADO: JWT_SECRET validation
    const jwtSecret = process.env.JWT_SECRET || 'belleza-secret-2024';
    
    // Verificar y decodificar token
    const decoded = jwt.verify(token, jwtSecret);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Token decoded:', { 
        userId: decoded.userId, 
        professionalId: decoded.professionalId,
        clinicId: decoded.clinicId,
        role: decoded.role,
        userType: decoded.userType 
      });
    }

    // ✅ OPTIMIZADO: Verificar conexión de BD solo cuando es necesario
    let userData = null;

    // MANEJAR USUARIOS DEMO SIN CONSULTA A BD
    if (decoded.userId === 'demo-user-123') {
      userData = {
        id: 'demo-user-123',
        userId: 'demo-user-123',
        email: 'demo@bellezaestetica.com',
        firstName: 'Demo',
        lastName: 'User',
        name: 'Demo User',
        role: 'CLIENT',
        userType: 'patient',
        beautyPoints: 1250,
        vipStatus: true,
        loyaltyTier: 'GOLD',
        clinicId: 'demo-clinic-1',
        isDemo: true
      };
    }
    // MANEJAR USUARIOS REALES
    else if (decoded.userId) {
      // ✅ OPTIMIZADO: Verificar cache primero
      userData = getCachedUser(decoded.userId, 'patient');
      
      if (!userData) {
        if (!prisma) {
          return res.status(503).json({
            success: false,
            error: { message: 'Servicio de base de datos no disponible', code: 'DATABASE_UNAVAILABLE' }
          });
        }

        try {
          const user = await Promise.race([
            prisma.user.findUnique({
              where: { id: decoded.userId },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                beautyPoints: true,
                vipStatus: true,
                loyaltyTier: true,
                totalInvestment: true,
                sessionsCompleted: true,
                isActive: true,
                primaryClinicId: true,
                hasAllergies: true,
                hasMedicalConditions: true,
                avatarUrl: true,
                primaryClinic: {
                  select: { 
                    id: true, 
                    name: true, 
                    slug: true, 
                    city: true 
                  }
                }
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), 3000)
            )
          ]);

          if (!user || !user.isActive) {
            return res.status(401).json({
              success: false,
              error: { message: 'Usuario no encontrado o inactivo', code: 'USER_NOT_FOUND' }
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
            role: 'CLIENT',
            userType: 'patient',
            avatarUrl: user.avatarUrl,
            beautyPoints: user.beautyPoints || 0,
            vipStatus: user.vipStatus || false,
            loyaltyTier: user.loyaltyTier || 'BRONZE',
            totalInvestment: user.totalInvestment || 0,
            sessionsCompleted: user.sessionsCompleted || 0,
            hasAllergies: user.hasAllergies || false,
            hasMedicalConditions: user.hasMedicalConditions || false,
            clinic: user.primaryClinic,
            clinicId: user.primaryClinicId,
            primaryClinicId: user.primaryClinicId
          };

          // ✅ OPTIMIZADO: Guardar en cache
          setCachedUser(decoded.userId, 'patient', userData);
          
        } catch (dbError) {
          console.error('❌ Error fetching user:', dbError);
          return res.status(500).json({
            success: false,
            error: { message: 'Error interno del servidor', code: 'DATABASE_ERROR' }
          });
        }
      }
    } 
    // MANEJAR PROFESIONALES
    else if (decoded.professionalId) {
      // ✅ OPTIMIZADO: Verificar cache primero
      userData = getCachedUser(decoded.professionalId, 'professional');
      
      if (!userData) {
        if (!prisma) {
          return res.status(503).json({
            success: false,
            error: { message: 'Servicio de base de datos no disponible', code: 'DATABASE_UNAVAILABLE' }
          });
        }

        try {
          const professional = await Promise.race([
            prisma.professional.findUnique({
              where: { id: decoded.professionalId },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                licenseNumber: true,
                specialties: true,
                experience: true,
                rating: true,
                avatarUrl: true,
                isActive: true,
                clinicId: true,
                clinic: {
                  select: { 
                    id: true, 
                    name: true, 
                    slug: true, 
                    city: true 
                  }
                }
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), 3000)
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

          // ✅ OPTIMIZADO: Guardar en cache
          setCachedUser(decoded.professionalId, 'professional', userData);
          
        } catch (dbError) {
          console.error('❌ Error fetching professional:', dbError);
          return res.status(500).json({
            success: false,
            error: { message: 'Error interno del servidor', code: 'DATABASE_ERROR' }
          });
        }
      }
    }
    // MANEJAR ADMINISTRADORES DE CLÍNICA
    else if (decoded.clinicId && decoded.userType === 'admin') {
      // ✅ OPTIMIZADO: Verificar cache primero
      userData = getCachedUser(decoded.clinicId, 'admin');
      
      if (!userData) {
        if (!prisma) {
          return res.status(503).json({
            success: false,
            error: { message: 'Servicio de base de datos no disponible', code: 'DATABASE_UNAVAILABLE' }
          });
        }

        try {
          const clinic = await Promise.race([
            prisma.clinic.findUnique({
              where: { id: decoded.clinicId },
              select: {
                id: true,
                name: true,
                slug: true,
                email: true,
                phone: true,
                city: true,
                subscriptionPlan: true,
                maxProfessionals: true,
                maxPatients: true,
                isActive: true
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), 3000)
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
            role: 'ADMIN',
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

          // ✅ OPTIMIZADO: Guardar en cache
          setCachedUser(decoded.clinicId, 'admin', userData);
          
        } catch (dbError) {
          console.error('❌ Error fetching clinic:', dbError);
          return res.status(500).json({
            success: false,
            error: { message: 'Error interno del servidor', code: 'DATABASE_ERROR' }
          });
        }
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
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Auth success: ${userData.name} (${userData.userType})`);
    }
    
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
// AUTENTICACIÓN OPCIONAL - OPTIMIZADA
// ============================================================================
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET || 'belleza-secret-2024';

    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      // ✅ OPTIMIZADO: Crear un mini-request para reutilizar verifyToken
      const mockReq = { 
        headers: { authorization: authHeader },
        body: {},
        params: {},
        query: {}
      };
      
      await verifyToken(mockReq, { 
        status: () => ({ json: () => {} }), 
        json: () => {} 
      }, (error) => {
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
    req.user = null;
    next();
  }
};

// ============================================================================
// VERIFICAR ROLES ESPECÍFICOS - MEJORADO
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

    // ✅ MEJORADO: Role mappings más completos
    const roleMappings = {
      'CLIENT': ['CLIENT', 'client', 'patient', 'user', 'usuario'],
      'PROFESSIONAL': ['PROFESSIONAL', 'professional', 'doctor', 'medico', 'profesional'],
      'MANAGER': ['MANAGER', 'manager', 'supervisor'],
      'ADMIN': ['ADMIN', 'admin', 'administrator', 'administrador']
    };

    let hasPermission = false;

    // Verificar roles directos
    if (allowedRolesList.includes(userRole)) {
      hasPermission = true;
    } else {
      // Verificar mappings de roles
      for (const allowedRole of allowedRolesList) {
        const normalizedAllowed = allowedRole.toUpperCase();
        if (roleMappings[normalizedAllowed] && 
            roleMappings[normalizedAllowed].includes(userRole)) {
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
// VERIFICAR ACCESO VIP - OPTIMIZADO
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
    const privilegedRoles = ['ADMIN', 'PROFESSIONAL', 'MANAGER'];
    if (privilegedRoles.includes(req.user.role.toUpperCase())) {
      return next();
    }
    
    // Para usuarios demo, permitir acceso VIP
    if (req.user.isDemo) {
      return next();
    }
    
    // Verificar estado VIP del usuario
    if (req.user.vipStatus) {
      return next();
    }

    // ✅ OPTIMIZADO: Solo verificar suscripción si es necesario
    if (!prisma) {
      return res.status(403).json({
        success: false,
        error: { 
          message: 'Acceso VIP requerido', 
          code: 'VIP_REQUIRED',
          upgradeUrl: '/vip/upgrade'
        }
      });
    }

    try {
      const activeSubscription = await Promise.race([
        prisma.vipSubscription.findFirst({
          where: {
            userId: req.user.id,
            status: 'ACTIVE',
            currentPeriodEnd: { gte: new Date() }
          }
        }).catch(() => null),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 2000)
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

      // Actualizar cache con estado VIP
      req.user.vipStatus = true;
      setCachedUser(req.user.id, 'patient', req.user);

      next();

    } catch (dbError) {
      console.warn('⚠️ Error checking VIP status:', dbError.message);
      return res.status(403).json({
        success: false,
        error: { 
          message: 'Acceso VIP requerido', 
          code: 'VIP_REQUIRED',
          upgradeUrl: '/vip/upgrade'
        }
      });
    }

  } catch (error) {
    console.error('❌ Error in requireVIP:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
};

// ============================================================================
// VERIFICAR PERTENENCIA A CLÍNICA
// ============================================================================
const requireClinic = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Autenticación requerida', code: 'AUTH_REQUIRED' }
    });
  }

  const hasClinicAssociation = req.user.clinicId || 
                              req.user.primaryClinicId || 
                              req.user.isDemo ||
                              req.user.role === 'ADMIN';

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
// UTILITY FUNCTIONS
// ============================================================================
const getUserClinicId = (user) => {
  return user.clinicId || user.primaryClinicId || (user.clinic ? user.clinic.id : null);
};

const hasClinicAccess = (user, targetClinicId) => {
  if (!user || !targetClinicId) return false;
  
  // Admin global tiene acceso a todas las clínicas
  if (user.role === 'ADMIN' && !user.clinicId) return true;
  
  // Usuario demo tiene acceso
  if (user.isDemo) return true;
  
  // Usuario debe pertenecer a la clínica específica
  const userClinicId = getUserClinicId(user);
  return userClinicId === targetClinicId;
};

// ============================================================================
// MIDDLEWARE COMBINADOS
// ============================================================================
const requirePatient = [verifyToken, requireRole(['CLIENT', 'patient'])];
const requireProfessional = [verifyToken, requireRole(['PROFESSIONAL', 'professional'])];
const requireAdmin = [verifyToken, requireRole(['ADMIN', 'admin'])];
const requireClinicAccess = [verifyToken, requireClinic];
const requireVIPAccess = [verifyToken, requireVIP];

// ============================================================================
// EXPORTACIONES
// ============================================================================
module.exports = {
  // Core functions
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
  
  // Utility functions
  getUserClinicId,
  hasClinicAccess,
  
  // Legacy aliases
  authenticateToken: verifyToken,
  authenticateAdmin: [verifyToken, requireRole(['ADMIN'])]
};