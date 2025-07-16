// ============================================================================
// src/middleware/auth.middleware.js - AUTENTICACIÓN ADMIN CORREGIDA ✅
// ============================================================================
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================================
// AUTHENTICATE TOKEN GENERAL ✅
// ============================================================================
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de acceso requerido' }
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    console.log('🔍 Token decoded:', { userId: decoded.userId, role: decoded.role });
    
    // Buscar usuario completo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isAdmin: true,
        vipStatus: true,
        clinicId: true,
        beautyPoints: true,
        totalInvestment: true,
        sessionsCompleted: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }

    req.user = user;
    req.userId = user.id;

    console.log(`✅ Auth: ${user.firstName} ${user.lastName} (Role: ${user.role})`);
    next();

  } catch (error) {
    console.error('❌ Auth error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token inválido' }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expirado' }
      });
    }

    return res.status(500).json({
      success: false,
      error: { message: 'Error de autenticación' }
    });
  }
};

// ============================================================================
// AUTHENTICATE ADMIN - ESPECÍFICO PARA RUTAS ADMIN ✅
// ============================================================================
const authenticateAdmin = async (req, res, next) => {
  try {
    // Primero autenticar token normal
    await new Promise((resolve, reject) => {
      authenticateToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Verificar que es admin
    const isAdmin = req.user.role === 'admin' || 
                   req.user.role === 'ADMIN' ||
                   req.user.isAdmin === true;

    if (!isAdmin) {
      console.log(`❌ Admin access denied: ${req.user.email} (role: ${req.user.role})`);
      return res.status(403).json({
        success: false,
        error: { message: 'Acceso denegado. Se requieren permisos de administrador.' }
      });
    }

    // Buscar o crear clínica del admin
    let clinic = null;
    
    if (req.user.clinicId) {
      // Admin tiene clínica asignada
      clinic = await prisma.clinic.findUnique({
        where: { id: req.user.clinicId },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true,
          isActive: true
        }
      });
    } else {
      // Buscar clínica por email del admin
      clinic = await prisma.clinic.findFirst({
        where: { 
          OR: [
            { email: req.user.email },
            { adminEmails: { has: req.user.email } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true,
          isActive: true
        }
      });

      // Si no existe, crear clínica por defecto
      if (!clinic) {
        console.log('🏥 Creating default clinic for admin:', req.user.email);
        clinic = await prisma.clinic.create({
          data: {
            name: `Clínica de ${req.user.firstName} ${req.user.lastName}`,
            email: req.user.email,
            subscriptionPlan: 'PREMIUM',
            isActive: true,
            adminEmails: [req.user.email]
          },
          select: {
            id: true,
            name: true,
            email: true,
            subscriptionPlan: true,
            subscriptionExpiresAt: true,
            isActive: true
          }
        });

        // Actualizar usuario con clinicId
        await prisma.user.update({
          where: { id: req.user.id },
          data: { clinicId: clinic.id }
        });
      }
    }

    if (!clinic || !clinic.isActive) {
      return res.status(403).json({
        success: false,
        error: { message: 'Clínica no encontrada o inactiva' }
      });
    }

    req.clinic = clinic;
    req.adminId = req.user.id;

    console.log(`✅ Admin access: ${req.user.email} → ${clinic.name}`);
    next();

  } catch (error) {
    console.error('❌ Admin auth error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Error en autenticación de administrador' }
    });
  }
};

// ============================================================================
// CHECK SUBSCRIPTION PLAN ✅
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
      
      const userPlan = req.clinic?.subscriptionPlan || 'FREE';
      const userLevel = planHierarchy[userPlan] || 0;
      const requiredLevel = planHierarchy[requiredPlan] || 0;

      console.log(`🔍 Plan check: ${userPlan} (${userLevel}) vs ${requiredPlan} (${requiredLevel})`);

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: { 
            message: `Plan ${requiredPlan} requerido para esta funcionalidad`,
            currentPlan: userPlan,
            requiredPlan,
            upgradeUrl: '/upgrade'
          }
        });
      }

      next();
    } catch (error) {
      console.error('❌ Subscription check error:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Error verificando suscripción' }
      });
    }
  };
};

// ============================================================================
// REQUIRE ADMIN ROLE (ALTERNATIVA MÁS SIMPLE) ✅
// ============================================================================
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Usuario no autenticado' }
    });
  }

  const isAdmin = req.user.role === 'admin' || 
                 req.user.role === 'ADMIN' ||
                 req.user.isAdmin === true;

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: { message: 'Acceso denegado. Se requieren permisos de administrador.' }
    });
  }

  next();
};

// ============================================================================
// RATE LIMITING POR USUARIO ✅
// ============================================================================
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: { message: 'Demasiadas solicitudes. Intenta más tarde.' }
      });
    }

    validRequests.push(now);
    userRequests.set(userId, validRequests);
    
    next();
  };
};

// ============================================================================
// LOGGING DE ACCIONES ADMIN ✅
// ============================================================================
const logAdminAction = (action) => {
  return (req, res, next) => {
    const logData = {
      action,
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      clinicId: req.clinic?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    console.log(`🔥 ADMIN ACTION:`, logData);
    
    // En producción, guardar en base de datos
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implementar logging en BD
      // await prisma.adminLog.create({ data: logData });
    }
    
    next();
  };
};

// ============================================================================
// EXPORTACIONES ✅
// ============================================================================
module.exports = {
  authenticateToken,
  authenticateAdmin,
  requireAdmin,
  checkSubscription,
  userRateLimit,
  logAdminAction
};