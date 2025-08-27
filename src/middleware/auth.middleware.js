// ============================================================================
// 🔐 SINGLE CLINIC AUTH MIDDLEWARE - PRODUCTION READY v4.0 ✅
// src/middleware/auth.middleware.js - OPTIMIZED FOR SINGLE CLINIC
// ============================================================================

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// ============================================================================
// CONFIGURACIÓN OPTIMIZADA PARA SINGLE CLINIC
// ============================================================================

// Singleton de Prisma optimizado
let prisma;
try {
  if (global.prisma) {
    prisma = global.prisma;
  } else {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
      datasources: {
        db: { url: process.env.DATABASE_URL }
      },
      errorFormat: 'pretty'
    });
    global.prisma = prisma;
  }
} catch (error) {
  console.error('❌ Error initializing Prisma in auth middleware:', error.message);
}

// Cache optimizado para producción
const userCache = new Map();
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10min prod, 5min dev
const MAX_CACHE_SIZE = 200;

const getCachedUser = (userId, userType) => {
  const key = `${userType}:${userId}`;
  const cached = userCache.get(key);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
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
  
  // Limpieza de cache para evitar memory leaks
  if (userCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(userCache.keys()).slice(0, 50);
    keysToDelete.forEach(k => userCache.delete(k));
  }
};

// ============================================================================
// VERIFICACIÓN DE TOKEN PRINCIPAL - OPTIMIZADA PARA SINGLE CLINIC
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

    // JWT Secret con fallback seguro
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured!');
      return res.status(500).json({
        success: false,
        error: { message: 'Configuración de autenticación incorrecta', code: 'CONFIG_ERROR' }
      });
    }
    
    // Verificar y decodificar token
    const decoded = jwt.verify(token, jwtSecret);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Token decoded:', { 
        userId: decoded.userId, 
        professionalId: decoded.professionalId,
        role: decoded.role,
        userType: decoded.userType 
      });
    }

    let userData = null;

    // MANEJAR USUARIOS DEMO PARA DESARROLLO
    if (decoded.userId === 'demo-user-123') {
      userData = {
        id: 'demo-user-123',
        userId: 'demo-user-123',
        email: 'demo@bellezaestetica.com',
        firstName: 'Ana',
        lastName: 'García',
        name: 'Ana García',
        role: 'CLIENT',
        userType: 'patient',
        beautyPoints: 1250,
        vipStatus: true,
        loyaltyTier: 'GOLD',
        totalInvestment: 850.00,
        sessionsCompleted: 12,
        isDemo: true,
        isActive: true
      };
    }
    // USUARIOS REALES (CLIENTES)
    else if (decoded.userId) {
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
                hasAllergies: true,
                hasMedicalConditions: true,
                avatarUrl: true,
                skinType: true,
                birthDate: true,
                role: true
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
            role: user.role || 'CLIENT',
            userType: 'patient',
            avatarUrl: user.avatarUrl,
            beautyPoints: user.beautyPoints || 0,
            vipStatus: user.vipStatus || false,
            loyaltyTier: user.loyaltyTier || 'BRONZE',
            totalInvestment: user.totalInvestment || 0,
            sessionsCompleted: user.sessionsCompleted || 0,
            hasAllergies: user.hasAllergies || false,
            hasMedicalConditions: user.hasMedicalConditions || false,
            skinType: user.skinType,
            birthDate: user.birthDate,
            isActive: true
          };

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
    // PROFESIONALES
    else if (decoded.professionalId) {
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
                schedule: true,
                bio: true
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
            schedule: professional.schedule,
            bio: professional.bio,
            isActive: true
          };

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
    // ADMINISTRADORES (para single clinic, solo hay un admin general)
    else if (decoded.userType === 'admin' || decoded.role === 'ADMIN') {
      userData = {
        id: decoded.userId || 'admin-1',
        email: decoded.email || process.env.ADMIN_EMAIL || 'admin@bellezaestetica.com',
        name: decoded.name || 'Administrador',
        firstName: 'Admin',
        lastName: 'Sistema',
        role: 'ADMIN',
        userType: 'admin',
        isActive: true,
        permissions: ['ALL'] // Admin tiene todos los permisos
      };
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
// AUTENTICACIÓN OPCIONAL
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

    // Intentar autenticar, pero continuar si falla
    const mockRes = {
      status: () => ({ json: () => {} }),
      json: () => {}
    };

    await verifyToken(req, mockRes, (error) => {
      if (error) {
        req.user = null;
      }
      next();
    });

  } catch (error) {
    req.user = null;
    next();
  }
};

// ============================================================================
// VERIFICACIÓN DE ROLES
// ============================================================================
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Autenticación requerida', code: 'AUTH_REQUIRED' }
      });
    }

    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    const allowedRolesList = Array.isArray(allowedRoles) ? 
      allowedRoles.map(r => r.toUpperCase()) : 
      [allowedRoles.toUpperCase()];

    // ADMIN siempre tiene acceso
    if (userRole === 'ADMIN') {
      return next();
    }

    // Role mappings para flexibilidad
    const roleMappings = {
      'CLIENT': ['CLIENT', 'PATIENT', 'USER', 'VIP_CLIENT'],
      'VIP_CLIENT': ['VIP_CLIENT', 'CLIENT', 'PATIENT', 'USER'],
      'PROFESSIONAL': ['PROFESSIONAL', 'DOCTOR', 'SPECIALIST'],
      'MANAGER': ['MANAGER', 'SUPERVISOR'],
      'ADMIN': ['ADMIN', 'ADMINISTRATOR']
    };

    let hasPermission = false;

    // Verificar rol directo
    if (allowedRolesList.includes(userRole)) {
      hasPermission = true;
    } else {
      // Verificar mappings
      for (const allowedRole of allowedRolesList) {
        if (roleMappings[allowedRole] && roleMappings[allowedRole].includes(userRole)) {
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
// VERIFICACIÓN VIP - OPTIMIZADA PARA SINGLE CLINIC
// ============================================================================
const requireVIP = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Autenticación requerida', code: 'AUTH_REQUIRED' }
      });
    }
    
    // Roles privilegiados siempre tienen acceso VIP
    const privilegedRoles = ['ADMIN', 'PROFESSIONAL', 'MANAGER'];
    if (privilegedRoles.includes(req.user.role)) {
      return next();
    }
    
    // Usuarios demo tienen acceso VIP
    if (req.user.isDemo) {
      return next();
    }
    
    // Verificar estado VIP directo
    if (req.user.vipStatus === true) {
      return next();
    }

    // Verificar suscripción VIP activa (si hay BD disponible)
    if (prisma) {
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
            setTimeout(() => reject(new Error('Timeout')), 2000)
          )
        ]);

        if (activeSubscription) {
          // Actualizar cache
          req.user.vipStatus = true;
          setCachedUser(req.user.id, req.user.userType, req.user);
          return next();
        }
      } catch (dbError) {
        console.warn('⚠️ Error checking VIP status:', dbError.message);
      }
    }

    // Verificar por loyalty tier como backup
    const vipTiers = ['GOLD', 'PLATINUM', 'DIAMOND'];
    if (req.user.loyaltyTier && vipTiers.includes(req.user.loyaltyTier.toUpperCase())) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { 
        message: 'Acceso VIP requerido', 
        code: 'VIP_REQUIRED',
        upgradeUrl: '/vip/upgrade',
        currentTier: req.user.loyaltyTier || 'BRONZE'
      }
    });

  } catch (error) {
    console.error('❌ Error in requireVIP:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
    });
  }
};

// ============================================================================
// VERIFICACIÓN DE USUARIO ACTIVO
// ============================================================================
const requireActive = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Autenticación requerida', code: 'AUTH_REQUIRED' }
    });
  }

  if (!req.user.isActive && !req.user.isDemo) {
    return res.status(403).json({
      success: false,
      error: { 
        message: 'Cuenta inactiva', 
        code: 'ACCOUNT_INACTIVE',
        contactSupport: true
      }
    });
  }

  next();
};

// ============================================================================
// UTILITY FUNCTIONS PARA SINGLE CLINIC
// ============================================================================
const isAdmin = (user) => {
  return user && user.role === 'ADMIN';
};

const isProfessional = (user) => {
  return user && user.role === 'PROFESSIONAL';
};

const isVIP = (user) => {
  if (!user) return false;
  
  // Roles privilegiados
  if (['ADMIN', 'PROFESSIONAL', 'MANAGER'].includes(user.role)) return true;
  
  // Estado VIP directo
  if (user.vipStatus === true) return true;
  
  // Demo users
  if (user.isDemo) return true;
  
  // Loyalty tiers VIP
  const vipTiers = ['GOLD', 'PLATINUM', 'DIAMOND'];
  return user.loyaltyTier && vipTiers.includes(user.loyaltyTier.toUpperCase());
};

const canManageAppointments = (user) => {
  return user && ['ADMIN', 'PROFESSIONAL', 'MANAGER'].includes(user.role);
};

const canViewAnalytics = (user) => {
  return user && ['ADMIN', 'MANAGER'].includes(user.role);
};

const canManageUsers = (user) => {
  return user && user.role === 'ADMIN';
};

// ============================================================================
// MIDDLEWARE COMBINADOS PARA SINGLE CLINIC
// ============================================================================
const requirePatient = [verifyToken, requireActive, requireRole(['CLIENT', 'VIP_CLIENT'])];
const requireProfessional = [verifyToken, requireActive, requireRole(['PROFESSIONAL'])];
const requireAdmin = [verifyToken, requireRole(['ADMIN'])];
const requireVIPAccess = [verifyToken, requireActive, requireVIP];
const requireManager = [verifyToken, requireActive, requireRole(['ADMIN', 'MANAGER'])];

// ============================================================================
// MIDDLEWARE DE LOGGING PARA DESARROLLO
// ============================================================================
const logAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.user) {
    console.log(`🔍 Auth: ${req.user.name} (${req.user.role}) -> ${req.method} ${req.path}`);
  }
  next();
};

// ============================================================================
// EXPORTACIONES
// ============================================================================
module.exports = {
  // Core authentication
  verifyToken,
  optionalAuth,
  
  // Role-based middleware
  requireRole,
  requireVIP,
  requireActive,
  
  // Combined middleware
  requirePatient,
  requireProfessional,
  requireAdmin,
  requireVIPAccess,
  requireManager,
  
  // Utility functions
  isAdmin,
  isProfessional,
  isVIP,
  canManageAppointments,
  canViewAnalytics,
  canManageUsers,
  
  // Development helpers
  logAuth,
  
  // Legacy compatibility
  authenticateToken: verifyToken,
  authenticateAdmin: requireAdmin,
  
  // Cache management
  clearUserCache: (userId, userType) => {
    const key = `${userType}:${userId}`;
    userCache.delete(key);
  },
  
  getCacheStats: () => ({
    size: userCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL
  })
};