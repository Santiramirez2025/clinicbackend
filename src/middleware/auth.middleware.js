// ============================================================================
// 🔐 AUTH MIDDLEWARE CORREGIDO PARA SCHEMA PRISMA
// src/middleware/auth.middleware.js
// ============================================================================

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    console.log('🔍 Token decoded:', { 
      userId: decoded.userId, 
      professionalId: decoded.professionalId,
      clinicId: decoded.clinicId,
      role: decoded.role,
      userType: decoded.userType 
    });

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
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
              primaryClinic: { // ✅ CORREGIDO: usar primaryClinic
                select: { id: true, name: true, slug: true, city: true }
              }
            }
          });

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
            avatarUrl: user.avatarUrl, // ✅ CORREGIDO: campo correcto
            beautyPoints: user.beautyPoints, // ✅ CORREGIDO: directamente del user
            vipStatus: user.vipStatus, // ✅ CORREGIDO: directamente del user
            loyaltyTier: user.loyaltyTier, // ✅ CORREGIDO: directamente del user
            totalInvestment: user.totalInvestment,
            sessionsCompleted: user.sessionsCompleted,
            clinic: user.primaryClinic, // ✅ CORREGIDO: usar primaryClinic
            clinicId: user.primaryClinicId // ✅ CORREGIDO: usar primaryClinicId
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
        const professional = await prisma.professional.findUnique({
          where: { id: decoded.professionalId },
          include: {
            clinic: {
              select: { id: true, name: true, slug: true, city: true }
            }
          }
        });

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
          role: professional.role || 'PROFESSIONAL', // ✅ CORREGIDO: usar role del schema
          userType: 'professional',
          licenseNumber: professional.licenseNumber, // ✅ CORREGIDO: campo correcto
          specialties: professional.specialties ? JSON.parse(professional.specialties) : [], // ✅ Parse JSON
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
        const clinic = await prisma.clinic.findUnique({
          where: { id: decoded.clinicId }
        });

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

    // Intentar verificar token pero no fallar si hay error
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      req.tokenDecoded = decoded;
      
      // Procesar según tipo de usuario pero continuar si falla
      await verifyToken(req, res, (error) => {
        if (error) {
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
// VERIFICAR ROLES ESPECÍFICOS
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

    // Normalizar roles para comparación
    const normalizedUserRole = userRole.toLowerCase();
    const normalizedAllowedRoles = allowedRolesList.map(role => role.toLowerCase());

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
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
// VERIFICAR ACCESO VIP
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
    if (['admin', 'professional'].includes(req.user.role.toLowerCase())) {
      return next();
    }
    
    // Para usuarios demo, permitir acceso VIP
    if (req.user.isDemo) {
      return next();
    }
    
    // Verificar estado VIP del usuario
    if (!req.user.vipStatus) {
      // Verificar suscripción activa en BD
      try {
        const activeSubscription = await prisma.vipSubscription.findFirst({
          where: {
            userId: req.user.id,
            status: 'ACTIVE',
            currentPeriodEnd: { gte: new Date() }
          }
        });

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
        await prisma.user.update({
          where: { id: req.user.id },
          data: { vipStatus: true } // ✅ CORREGIDO: actualizar directamente en user
        });

        req.user.vipStatus = true;
      } catch (dbError) {
        console.error('❌ Error checking VIP status:', dbError);
        return res.status(500).json({
          success: false,
          error: { message: 'Error verificando estado VIP', code: 'VIP_CHECK_ERROR' }
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
// VERIFICAR PERTENENCIA A CLÍNICA
// ============================================================================
const requireClinic = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Autenticación requerida', code: 'AUTH_REQUIRED' }
    });
  }

  if (!req.user.clinicId && !req.user.isDemo) {
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
// MIDDLEWARE COMBINADOS PARA FACILIDAD DE USO
// ============================================================================
const requirePatient = [verifyToken, requireRole(['patient'])];
const requireProfessional = [verifyToken, requireRole(['professional', 'PROFESSIONAL'])];
const requireAdmin = [verifyToken, requireRole(['admin'])];
const requireClinicAccess = [verifyToken, requireClinic];
const requireVIPAccess = [verifyToken, requireVIP];

// ============================================================================
// ALIASES PARA COMPATIBILIDAD
// ============================================================================
const authenticateToken = verifyToken;
const authenticateAdmin = [verifyToken, requireRole(['admin'])];

// ============================================================================
// EXPORTACIONES
// ============================================================================
module.exports = {
  verifyToken,
  authenticateToken,
  authenticateAdmin,
  optionalAuth,
  requireRole,
  requireVIP,
  requireClinic,
  requirePatient,
  requireProfessional,
  requireAdmin,
  requireClinicAccess,
  requireVIPAccess
};