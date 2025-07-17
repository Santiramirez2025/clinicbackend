// ============================================================================
// src/middleware/auth.middleware.js - MIDDLEWARE UNIFICADO FINAL ✅
// ============================================================================
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

// ============================================================================
// 🔍 FUNCIÓN HELPER PARA IDENTIFICAR TIPO DE TOKEN
// ============================================================================
const identifyTokenType = (decoded) => {
  // 1. Token de Admin/Clínica
  if (decoded.role === 'admin' || decoded.clinicId) {
    return 'admin';
  }
  
  // 2. Token de Usuario Demo
  if (decoded.userId === 'demo-user-123' || decoded.isDemo) {
    return 'demo';
  }
  
  // 3. Token de Usuario Normal
  if (decoded.userId) {
    return 'user';
  }
  
  return 'unknown';
};

// ============================================================================
// 🔐 VERIFICAR TOKEN GENERAL (PARA USUARIOS NORMALES)
// ============================================================================
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de acceso requerido', 401);
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AppError('Token de acceso requerido', 401);
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const tokenType = identifyTokenType(decoded);
    
    console.log(`🔍 Token type: ${tokenType}`, { userId: decoded.userId, role: decoded.role });

    // MANEJAR SEGÚN TIPO DE TOKEN
    switch (tokenType) {
      case 'admin':
        // Token de administrador - procesarlo como admin
        const clinic = await prisma.clinic.findUnique({
          where: { id: decoded.clinicId },
          select: {
            id: true,
            name: true,
            email: true,
            subscriptionPlan: true
          }
        });

        if (!clinic) {
          throw new AppError('Clínica no encontrada', 401);
        }

        req.user = {
          id: clinic.id,
          userId: clinic.id,
          email: clinic.email,
          firstName: 'Admin',
          lastName: clinic.name,
          vipStatus: true,
          role: 'admin',
          clinic: clinic
        };
        req.clinic = clinic;
        break;

      case 'demo':
        // Token demo
        req.user = {
          id: 'demo-user-123',
          userId: 'demo-user-123',
          email: 'demo@bellezaestetica.com',
          firstName: 'María',
          lastName: 'Demo',
          vipStatus: true,
          role: 'demo'
        };
        break;

      case 'user':
        // Token de usuario normal
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            vipStatus: true,
            role: true,
            beautyPoints: true,
            sessionsCompleted: true
          }
        });

        if (!user) {
          throw new AppError('Usuario no encontrado', 401);
        }

        req.user = {
          ...user,
          userId: user.id,
          role: user.role || 'patient'
        };
        break;

      default:
        throw new AppError('Tipo de token no reconocido', 401);
    }

    console.log(`✅ Auth success: ${req.user.firstName} ${req.user.lastName} (${req.user.role})`);
    next();

  } catch (error) {
    console.error('❌ Error en verifyToken:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expirado', 401));
    }
    next(error);
  }
};

// ============================================================================
// 👑 AUTENTICAR ADMIN (ESPECÍFICO PARA RUTAS ADMIN)
// ============================================================================
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de administrador requerido' }
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de administrador requerido' }
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    console.log('👑 Admin token decoded:', { 
      role: decoded.role, 
      clinicId: decoded.clinicId, 
      email: decoded.email 
    });
    
    // ✅ VALIDAR QUE ES TOKEN DE ADMIN
    const isValidAdmin = decoded.role === 'admin' || decoded.clinicId;
    
    if (!isValidAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Token de administrador inválido' }
      });
    }
    
    // ✅ BUSCAR O CREAR CLÍNICA AUTOMÁTICAMENTE
    let clinic = null;
    
    // 1. Buscar clínica existente
    if (decoded.clinicId) {
      clinic = await prisma.clinic.findUnique({
        where: { id: decoded.clinicId },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true
        }
      });
    }
    
    // 2. Si no existe, buscar por email del token
    if (!clinic && decoded.email) {
      clinic = await prisma.clinic.findUnique({
        where: { email: decoded.email },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true
        }
      });
    }
    
    // 3. Si aún no existe, crear clínica por defecto para admin
    if (!clinic) {
      console.log('🏥 Creando clínica por defecto para admin...');
      
      const adminEmail = decoded.email || 'admin@bellezaestetica.com';
      
      try {
        clinic = await prisma.clinic.create({
          data: {
            name: 'Belleza Estética Premium',
            email: adminEmail,
            subscriptionPlan: 'PREMIUM',
            subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            settings: JSON.stringify({
              timezone: 'Europe/Madrid',
              currency: 'EUR',
              language: 'es'
            })
          },
          select: {
            id: true,
            name: true,
            email: true,
            subscriptionPlan: true,
            subscriptionExpiresAt: true
          }
        });
        
        console.log('✅ Clínica creada exitosamente:', clinic.name);
      } catch (createError) {
        console.error('❌ Error creando clínica:', createError);
        return res.status(500).json({
          success: false,
          error: { message: 'Error configurando clínica de administrador' }
        });
      }
    }

    if (!clinic) {
      return res.status(500).json({
        success: false,
        error: { message: 'No se pudo configurar la clínica' }
      });
    }

    // ✅ CONFIGURAR REQ OBJECTS
    req.clinic = clinic;
    req.user = {
      id: clinic.id,
      userId: clinic.id,
      email: clinic.email,
      firstName: 'Admin',
      lastName: clinic.name,
      vipStatus: true,
      role: 'admin',
      clinic: clinic
    };
    
    console.log(`✅ Admin autenticado: ${clinic.name} (ID: ${clinic.id})`);
    next();

  } catch (error) {
    console.error('❌ Error en authenticateAdmin:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de administrador inválido' }
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de administrador expirado' }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: { message: 'Error de autenticación de administrador' }
    });
  }
};

// ============================================================================
// 🔓 AUTENTICACIÓN OPCIONAL (PARA ENDPOINTS PÚBLICOS)
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

    // Verificar token si existe
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const tokenType = identifyTokenType(decoded);
    
    switch (tokenType) {
      case 'admin':
        const clinic = await prisma.clinic.findUnique({
          where: { id: decoded.clinicId }
        });
        req.user = clinic ? {
          id: clinic.id,
          email: clinic.email,
          firstName: 'Admin',
          lastName: clinic.name,
          role: 'admin'
        } : null;
        break;

      case 'demo':
        req.user = {
          id: 'demo-user-123',
          email: 'demo@bellezaestetica.com',
          firstName: 'María',
          lastName: 'Demo',
          role: 'demo'
        };
        break;

      case 'user':
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
        req.user = user ? {
          ...user,
          userId: user.id,
          role: 'patient'
        } : null;
        break;

      default:
        req.user = null;
    }

    next();

  } catch (error) {
    // Si hay error con el token, continuar sin usuario
    console.log('⚠️ Optional auth error (continuing):', error.message);
    req.user = null;
    next();
  }
};

// ============================================================================
// 💎 REQUERIR VIP
// ============================================================================
const requireVIP = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Autenticación requerida', 401);
    }
    
    // Los admins siempre tienen acceso VIP
    if (req.user.role === 'admin') {
      return next();
    }
    
    if (!req.user.vipStatus) {
      // Verificar suscripción activa en BD
      const activeSubscription = await prisma.vipSubscription.findFirst({
        where: {
          userId: req.user.id,
          status: 'ACTIVE',
          currentPeriodEnd: { gte: new Date() }
        }
      });

      if (!activeSubscription) {
        throw new AppError('Acceso VIP requerido', 403);
      }

      // Actualizar estado VIP
      await prisma.user.update({
        where: { id: req.user.id },
        data: { vipStatus: true }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 📊 VERIFICAR PLAN DE SUSCRIPCIÓN
// ============================================================================
const checkSubscription = (requiredPlan = 'FREE') => {
  return (req, res, next) => {
    try {
      const planHierarchy = { 
        'FREE': 0, 
        'BASIC': 1, 
        'PREMIUM': 2, 
        'ENTERPRISE': 3 
      };
      
      const currentPlan = req.clinic?.subscriptionPlan || 'FREE';
      const currentLevel = planHierarchy[currentPlan] || 0;
      const requiredLevel = planHierarchy[requiredPlan] || 0;

      if (currentLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: { 
            message: `Plan ${requiredPlan} requerido`,
            currentPlan,
            requiredPlan
          }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ============================================================================
// 🎯 ALIAS PARA COMPATIBILIDAD
// ============================================================================
const authenticateToken = verifyToken;
const verifyClinicToken = authenticateAdmin;

// ============================================================================
// 📤 EXPORTACIONES
// ============================================================================
module.exports = {
  verifyToken,
  authenticateToken,
  authenticateAdmin,
  verifyClinicToken,
  optionalAuth,
  requireVIP,
  checkSubscription
};