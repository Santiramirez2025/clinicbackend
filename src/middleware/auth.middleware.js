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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('🔍 Token decoded:', { 
      userId: decoded.userId, 
      professionalId: decoded.professionalId,
      adminId: decoded.adminId,
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
          isDemo: true
        };
      } else {
        // Usuario real - buscar en BD
        try {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
              clinic: {
                select: { id: true, name: true, slug: true, city: true }
              },
              userProfile: {
                select: { beautyPoints: true, isVip: true, totalSessions: true }
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
            role: user.role || 'patient',
            userType: 'patient',
            profilePicture: user.profilePicture,
            beautyPoints: user.userProfile?.beautyPoints || 0,
            vipStatus: user.userProfile?.isVip || false,
            totalSessions: user.userProfile?.totalSessions || 0,
            clinic: user.clinic,
            clinicId: user.clinicId
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
            },
            specialties: {
              select: { id: true, name: true, category: true }
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
          role: 'professional',
          userType: 'professional',
          license: professional.license,
          specialization: professional.specialization,
          clinic: professional.clinic,
          specialties: professional.specialties,
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
    else if (decoded.adminId) {
      // TOKEN DE ADMINISTRADOR
      try {
        const admin = await prisma.admin.findUnique({
          where: { id: decoded.adminId },
          include: {
            clinic: {
              select: { id: true, name: true, slug: true, city: true }
            }
          }
        });

        if (!admin || !admin.isActive) {
          return res.status(401).json({
            success: false,
            error: { message: 'Administrador no encontrado o inactivo', code: 'ADMIN_NOT_FOUND' }
          });
        }

        userData = {
          id: admin.id,
          adminId: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          name: admin.name || `${admin.firstName} ${admin.lastName}`,
          phone: admin.phone,
          role: 'admin',
          userType: 'admin',
          permissions: admin.permissions,
          clinic: admin.clinic,
          clinicId: admin.clinicId
        };
      } catch (dbError) {
        console.error('❌ Error fetching admin:', dbError);
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

    // Usar la función principal pero sin fallar si hay error
    await verifyToken(req, res, (error) => {
      if (error) {
        // Si hay error, continuar sin usuario en lugar de fallar
        req.user = null;
      }
      next();
    });

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

    if (!allowedRolesList.includes(userRole)) {
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
    if (['admin', 'professional'].includes(req.user.role)) {
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
        await prisma.userProfile.update({
          where: { userId: req.user.id },
          data: { isVip: true }
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
// ALIASES PARA COMPATIBILIDAD
// ============================================================================
const authenticateToken = verifyToken;
const authenticateAdmin = (req, res, next) => {
  verifyToken(req, res, (error) => {
    if (error) return next(error);
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Acceso de administrador requerido', code: 'ADMIN_REQUIRED' }
      });
    }
    
    next();
  });
};

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
  requireClinic
};